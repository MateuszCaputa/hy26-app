// Proces główny: okna, zasobnik, protokół app://, baza, powiadomienia, klawiatura/mysz.
import {
  app, BrowserWindow, ipcMain, Menu, nativeImage, Notification, powerMonitor, protocol, screen, session,
  shell, systemPreferences, Tray,
} from 'electron';
import { existsSync, watch } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AppEvent, Calibration, LiveStatus, MinuteSample, Nudge, NudgeAction, Settings } from '../shared/types';
import type { InitData } from '../shared/api';
import { Store } from './db';
import { ActivityCounter } from './activity';
import { ensureModels, findModel, modelsReady } from './models';
import { buildStats, localDate } from '../core/insights';
import { ERGONOMIC_TIP, ISSUE_LABEL, ISSUE_TIP } from '../core/coach';

const argv = process.argv.slice(1);
const flag = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const DEBUG_SHOT = flag('screenshot'); // zrzut okna i zamknięcie (testy)
const DEBUG_VIEW = flag('view');
// Osobny katalog danych (np. demo): --data=katalog albo zmienna POSTURA_DATA.
const DATA_DIR = flag('data') ?? process.env.POSTURA_DATA;
if (DATA_DIR) app.setPath('userData', path.resolve(DATA_DIR));

// MediaPipe potrzebuje WebGL także w trybie CPU (wgrywanie klatek). Gdy sterownik GPU jest
// na czarnej liście Chromium, pozwalamy na programowy WebGL (SwiftShader) – wolniej, ale działa.
// Okno ładuje wyłącznie lokalne pliki aplikacji, więc to ustawienie jest bezpieczne.
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
// Interfejs jest po polsku: formaty dat i godzin (24 h) też.
app.commandLine.appendSwitch('lang', 'pl-PL');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

if (!DEBUG_SHOT && !app.requestSingleInstanceLock()) app.quit();

const RENDERER_DIR = path.join(__dirname, '..', 'renderer');
const ASSETS_DIR = app.isPackaged ? path.join(process.resourcesPath, 'assets') : path.join(app.getAppPath(), 'assets');
const MODELS_DIR = path.join(app.getPath('userData'), 'models');
// Modele dołączone do aplikacji (offline) mają pierwszeństwo przed pobranymi.
const MODEL_DIRS = [path.join(ASSETS_DIR, 'models'), MODELS_DIR];

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.task': 'application/octet-stream',
  '.map': 'application/json',
};

let store: Store;
let settings: Settings;
let mainWin: BrowserWindow | null = null;
let widgetWin: BrowserWindow | null = null;
let nudgeWin: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
let paused = false;
let lastStatus: LiveStatus | null = null;
let trayBadge: Electron.NativeImage | null = null; // Windows: ikona z wynikiem (rysowana w rendererze)
let lastNotifyAt = 0;
const activity = new ActivityCounter();

function resolveAppUrl(url: string): string | null {
  const u = new URL(url);
  const p = decodeURIComponent(u.pathname);
  if (p.startsWith('/models/')) return findModel(p, MODEL_DIRS);
  const file = path.normalize(path.join(RENDERER_DIR, p === '/' ? 'index.html' : p));
  if (!file.startsWith(RENDERER_DIR)) return null; // ochrona przed ../
  return existsSync(file) ? file : null;
}

function registerProtocol(): void {
  protocol.handle('app', async (req) => {
    const file = resolveAppUrl(req.url);
    if (!file) return new Response('Not found', { status: 404 });
    const data = await readFile(file);
    return new Response(data, {
      headers: { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' },
    });
  });
}

function trayIcon(state: string): Electron.NativeImage {
  const name = state === 'good' ? 'good' : state === 'warn' ? 'warn' : state === 'bad' ? 'bad' : 'idle';
  const img = nativeImage.createFromPath(path.join(ASSETS_DIR, `tray-${name}.png`));
  return img.isEmpty() ? nativeImage.createEmpty() : img;
}

function showMain(view?: string): void {
  if (!mainWin) return;
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show();
  mainWin.focus();
  if (view) mainWin.webContents.send('navigate', view);
}

let resumeTimer: NodeJS.Timeout | null = null;
let pausedUntil = 0;

/** Pauza; `minutes` > 0 wznawia analizę automatycznie (szybka akcja z menu w zasobniku). */
function setPaused(p: boolean, minutes = 0): void {
  paused = p;
  if (resumeTimer) clearTimeout(resumeTimer);
  resumeTimer = null;
  pausedUntil = 0;
  if (p && minutes > 0) {
    pausedUntil = Date.now() + minutes * 60_000;
    resumeTimer = setTimeout(() => setPaused(false), minutes * 60_000);
  }
  mainWin?.webContents.send('paused', p);
  updateTray();
}

const STATE_WORD: Record<string, string> = { good: 'prosto', warn: 'popraw się', bad: 'zła postawa' };
let trayMenuKey = '';

function updateTray(): void {
  if (!tray) return;
  const s = lastStatus;
  const state = paused ? 'paused' : s?.state ?? 'absent';
  const present = !paused && !!s && s.state !== 'absent' && s.state !== 'paused';
  tray.setImage(process.platform === 'win32' && present && trayBadge ? trayBadge : trayIcon(state));
  // macOS: wynik postawy w pasku menu obok kolorowej ikony (Windows nie pokazuje tekstu w zasobniku).
  if (process.platform === 'darwin') tray.setTitle(present && s.score !== null ? ` ${s.score}` : '', { fontType: 'monospacedDigit' });

  const resumeAt = pausedUntil ? new Date(pausedUntil).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '';
  const label =
    paused ? (resumeAt ? `Postura – pauza do ${resumeAt}` : 'Postura – pauza')
    : !present ? 'Postura – brak osoby w kadrze'
    : `Postura – postawa ${s.score ?? '–'}/100${s.fatigue ? `, zmęczenie ${s.fatigue.percent}%` : ''}`;
  tray.setToolTip(label);

  // Szybki podgląd bez otwierania okna: liczby + najczęstsze akcje.
  const info: string[] = [];
  if (present) {
    // Bez liczby: macOS zamraża treść otwartego menu, a liczba obok ikony odświeża się na żywo.
    info.push(`Postawa: ${STATE_WORD[s.state] ?? ''}`);
    if (s.energy) {
      const low = s.energy.minutesToLow !== null ? ` · spadek <30% za ~${s.energy.minutesToLow} min` : '';
      info.push(`Energia do pracy: ${s.energy.percent}%${low}`);
    }
    if (s.fatigue) info.push(`Zmęczenie: ${s.fatigue.percent}%`);
    info.push(`Od przerwy: ${Math.round(s.minutesSinceBreak)} min`);
  } else info.push(label.replace('Postura – ', ''));

  // Menu przebudowujemy tylko, gdy zmienia się jego treść (status przychodzi kilka razy na sekundę).
  const key = [...info, paused, settings.miniWidget, settings.widgetStyle].join('|');
  if (key === trayMenuKey) return;
  trayMenuKey = key;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      ...info.map((l) => ({ label: l, enabled: false })),
      { type: 'separator' },
      {
        label: 'Zrób przerwę teraz',
        enabled: !paused,
        click: () => {
          showMain('live');
          mainWin?.webContents.send('show-break');
        },
      },
      paused
        ? { label: 'Wznów analizę', click: () => setPaused(false) }
        : { label: 'Wstrzymaj na 30 min', click: () => setPaused(true, 30) },
      ...(paused ? [] : [{ label: 'Wstrzymaj do odwołania', click: () => setPaused(true) }]),
      { type: 'separator' },
      { label: 'Pokaż okno', click: () => showMain('live') },
      { label: 'Statystyki', click: () => showMain('stats') },
      { label: 'Kalibracja', click: () => showMain('calibrate') },
      // Tylko dewelopersko / w trybie demo: pokaż przypomnienie na żądanie (test i scena).
      ...(!app.isPackaged || argv.includes('--demo')
        ? [{
            label: 'Pokaż przypomnienie (test)',
            submenu: [
              { label: 'Oczy 20-20-20', click: () => showNudge({ kind: 'eye', title: 'Spójrz w dal', body: 'Przez 20 s patrz na coś odległego (ok. 6 m).', seconds: 20 }) },
              { label: 'Mikroprzerwa', click: () => showNudge({ kind: 'break', title: 'Mikroprzerwa', body: 'Krążenia barków' }) },
              {
                label: 'Postawa (Twój obecny największy problem)',
                click: () => {
                  const issue = lastStatus?.topIssue ?? 'headForward';
                  showNudge({ kind: 'posture', title: ISSUE_LABEL[issue], body: ISSUE_TIP[issue] });
                },
              },
            ],
          }]
        : []),
      {
        label: 'Mini-widget',
        submenu: [
          { label: 'Wyłączony', type: 'radio', checked: !settings.miniWidget, click: () => applySettings({ ...settings, miniWidget: false }) },
          { label: 'Karta (wynik, stan, zmęczenie)', type: 'radio', checked: settings.miniWidget && settings.widgetStyle === 'card', click: () => applySettings({ ...settings, miniWidget: true, widgetStyle: 'card' }) },
          { label: 'Pigułka (sama liczba)', type: 'radio', checked: settings.miniWidget && settings.widgetStyle === 'pill', click: () => applySettings({ ...settings, miniWidget: true, widgetStyle: 'pill' }) },
        ],
      },
      { type: 'separator' },
      { label: 'Zakończ', click: () => { quitting = true; app.quit(); } },
    ]),
  );
}

function createMainWindow(): void {
  mainWin = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 900,
    minHeight: 640,
    show: false,
    title: 'Postura',
    backgroundColor: '#0f1115',
    icon: path.join(ASSETS_DIR, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false, // analiza musi działać, gdy okno jest schowane
    },
  });
  const qs = new URLSearchParams();
  if (DEBUG_VIEW) qs.set('view', DEBUG_VIEW);
  if (argv.includes('--demo')) qs.set('demo', '1');
  if (argv.includes('--autocal')) qs.set('autocal', '1'); // test: kalibracja bez klikania
  const q = qs.size ? `?${qs}` : '';
  void mainWin.loadURL(`app://local/index.html${q}`);
  const startHidden = app.getLoginItemSettings().wasOpenedAtLogin || argv.includes('--hidden');
  mainWin.once('ready-to-show', () => {
    if (!startHidden || DEBUG_SHOT) mainWin?.show();
  });
  mainWin.on('close', (e) => {
    if (!quitting && !DEBUG_SHOT) {
      e.preventDefault();
      mainWin?.hide();
    }
  });
  if (DEBUG_SHOT) {
    mainWin.webContents.on('console-message', (e) => console.log(`[renderer:${e.level}] ${e.message}`));
  }
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
}

const WIDGET_SIZE = { card: { width: 230, height: 74 }, pill: { width: 96, height: 44 } } as const;
let widgetStyleShown: Settings['widgetStyle'] | null = null;

/** Zapamiętana pozycja widgetu, jeśli nadal leży na którymś ekranie; inaczej prawy górny róg. */
function widgetPosition(w: number, h: number): { x: number; y: number } {
  const saved = store.getMeta<{ x: number; y: number }>('widgetPos');
  if (saved && screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return saved.x >= a.x && saved.y >= a.y && saved.x + w <= a.x + a.width && saved.y + h <= a.y + a.height;
  })) return saved;
  const a = screen.getPrimaryDisplay().workArea;
  return { x: a.x + a.width - w - 16, y: a.y + 16 };
}

/** Tylko w trybie deweloperskim: przeładuj okna, gdy `npm run dev` przebuduje interfejs (bez restartu Electrona). */
function watchRendererForReload(): void {
  if (app.isPackaged || DEBUG_SHOT) return;
  let t: NodeJS.Timeout | null = null;
  try {
    watch(RENDERER_DIR, { recursive: true }, () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        for (const w of [mainWin, widgetWin]) w?.webContents.reloadIgnoringCache();
      }, 300);
    });
  } catch (e) {
    console.warn('Auto-przeładowanie niedostępne:', (e as Error).message);
  }
}

function toggleWidget(on: boolean): void {
  // Zmiana wyglądu = nowe okno w innym rozmiarze.
  if (on && widgetWin && widgetStyleShown !== settings.widgetStyle) {
    widgetWin.close();
    widgetWin = null;
  }
  if (on && !widgetWin) {
    const size = WIDGET_SIZE[settings.widgetStyle] ?? WIDGET_SIZE.card;
    widgetStyleShown = settings.widgetStyle;
    widgetWin = new BrowserWindow({
      ...widgetPosition(size.width, size.height),
      ...size,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: true,
      hasShadow: false,
      webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, sandbox: true },
    });
    widgetWin.setAlwaysOnTop(true, 'floating');
    void widgetWin.loadURL(`app://local/widget.html?style=${settings.widgetStyle}`);
    // Przy zmianie wyglądu stare okno zamyka się asynchronicznie – nie wolno mu wyzerować referencji do nowego.
    const win = widgetWin;
    win.on('closed', () => {
      if (widgetWin === win) widgetWin = null;
    });
    if (lastStatus) widgetWin.webContents.once('did-finish-load', () => widgetWin?.webContents.send('status', lastStatus));
  } else if (!on && widgetWin) {
    widgetWin.close();
    widgetWin = null;
  }
}

function applySettings(s: Settings): void {
  const prev = settings as Settings | undefined; // przy starcie jeszcze nieustawione
  settings = s;
  store.saveSettings(s);
  // macOS: bez zgody na Dostępność nie uruchamiamy haka – każda próba wywołuje systemowe pytanie od nowa.
  // Pytamy tylko raz: gdy użytkownik sam włącza śledzenie tempa pracy.
  const justEnabled = s.activityTracking && !!prev && !prev.activityTracking;
  const accessOk = process.platform !== 'darwin' || systemPreferences.isTrustedAccessibilityClient(justEnabled);
  if (s.activityTracking && accessOk) activity.start();
  else activity.stop();
  toggleWidget(s.miniWidget);
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: s.autostart, args: ['--hidden'] });
  updateTray();
}

const hm = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

function withinWorkHours(d = new Date()): boolean {
  const now = d.getHours() * 60 + d.getMinutes();
  return now >= hm(settings.workStart) && now < hm(settings.workEnd);
}

const NUDGE_W = 340;
const NUDGE_H = 120;

/** Gdzie pokazać podpowiedź: tuż pod widgetem (albo nad nim, gdy brak miejsca), inaczej prawy górny róg. */
function nudgeBounds(): Electron.Rectangle {
  if (widgetWin?.isVisible()) {
    const wb = widgetWin.getBounds();
    const a = screen.getDisplayMatching(wb).workArea;
    const rightSide = wb.x + wb.width / 2 > a.x + a.width / 2;
    let x = rightSide ? wb.x + wb.width - NUDGE_W : wb.x;
    x = Math.min(Math.max(x, a.x), a.x + a.width - NUDGE_W);
    const below = wb.y + wb.height + NUDGE_H <= a.y + a.height;
    const y = below ? wb.y + wb.height - 4 : wb.y - NUDGE_H + 4;
    return { x, y, width: NUDGE_W, height: NUDGE_H };
  }
  const a = screen.getPrimaryDisplay().workArea;
  return { x: a.x + a.width - NUDGE_W - 12, y: a.y + 12, width: NUDGE_W, height: NUDGE_H };
}

/** Podpowiedź obok widgetu lub w rogu: nie kradnie fokusu, sama znika (logika w nudge.ts). */
function showNudge(n: Nudge): void {
  if (!nudgeWin) {
    nudgeWin = new BrowserWindow({
      ...nudgeBounds(),
      width: NUDGE_W,
      height: NUDGE_H,
      frame: false,
      resizable: false,
      movable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      transparent: true,
      hasShadow: false,
      show: false,
      webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, sandbox: true },
    });
    nudgeWin.setAlwaysOnTop(true, 'floating');
    nudgeWin.setVisibleOnAllWorkspaces(true);
    const win = nudgeWin;
    win.on('closed', () => {
      if (nudgeWin === win) nudgeWin = null;
    });
    void win.loadURL('app://local/nudge.html');
    win.webContents.once('did-finish-load', () => {
      win.showInactive();
      win.webContents.send('nudge', n);
      if (lastStatus) win.webContents.send('status', lastStatus);
    });
    return;
  }
  nudgeWin.setBounds(nudgeBounds()); // widget mógł zostać przesunięty
  nudgeWin.showInactive();
  nudgeWin.webContents.send('nudge', n);
}

function notify(n: { title: string; body: string; kind: string; openBreak?: boolean; nudge?: Nudge }): void {
  if (settings.doNotDisturb || paused) return;
  if (settings.onlyWorkHours && !withinWorkHours()) return;
  // Maksymalnie jedno powiadomienie o postawie na `alertCooldownMin`; przerwy mają osobny limit 1 min.
  const now = Date.now();
  if (n.kind === 'posture' && now - lastNotifyAt < settings.alertCooldownMin * 60e3) return;
  if (n.kind === 'posture') lastNotifyAt = now;
  if (n.nudge && settings.nudges === 'corner') return showNudge(n.nudge);
  if (!Notification.isSupported()) return;
  const notif = new Notification({ title: n.title, body: n.body, silent: !settings.soundAlerts, icon: path.join(ASSETS_DIR, 'icon.png') });
  notif.on('click', () => {
    showMain(n.openBreak ? undefined : 'live');
    if (n.openBreak) mainWin?.webContents.send('show-break');
  });
  notif.show();
}

function statsNow() {
  const now = Date.now();
  const dayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  // Od północy 29 dni temu: pełne 30 dni kalendarzowych dla zakresu „Ostatni miesiąc” w Statystykach.
  const since = new Date(dayStart).setDate(new Date(dayStart).getDate() - 29);
  return buildStats({
    now,
    samples: store.minutesSince(since),
    breaksToday: store.countEvents('break-done', dayStart),
    alertsToday: store.countEvents('alert', dayStart),
    breakTimes: store.eventTimes('break-done', dayStart),
    alertTimes: store.eventTimes('alert', dayStart),
    breaksYesterday: store.countEvents('break-done', new Date(dayStart - 12 * 3600e3).setHours(0, 0, 0, 0), dayStart),
    breakHistory: store.eventTimes('break-done', since),
    alertHistory: store.eventTimes('alert', since),
  });
}

/** Podsumowanie dnia po godzinie końca pracy (raz dziennie). */
function maybeEndOfDay(): void {
  const today = localDate(Date.now());
  if (store.getMeta<string>('eodSent') === today) return;
  const now = new Date();
  if (now.getHours() * 60 + now.getMinutes() < hm(settings.workEnd)) return;
  const st = statsNow();
  if (st.today.presentMinutes < 60) return;
  store.setMeta('eodSent', today);
  const tip = st.today.topIssue ? `Na jutro: ${ERGONOMIC_TIP[st.today.topIssue]}` : 'Na jutro: utrzymaj rytm przerw.';
  const head = `Dobra postawa ${st.today.goodPercent ?? '–'}% czasu, przerwy: ${st.today.breaksTaken}`;
  const issue = st.today.topIssue ? `, najczęściej: ${ISSUE_LABEL[st.today.topIssue].toLowerCase()}` : '';
  notify({ title: 'Podsumowanie dnia', body: `${head}${issue}. ${tip}`, kind: 'info' });
}

function registerIpc(): void {
  ipcMain.handle('init', (): InitData => ({
    settings,
    calibration: store.getCalibration(),
    modelsReady: modelsReady(MODEL_DIRS),
    paused,
    platform: process.platform,
  }));
  ipcMain.handle('save-settings', (_e, s: Settings) => applySettings(s));
  ipcMain.handle('save-calibration', (_e, c: Calibration) => {
    store.saveCalibration(c);
    store.addEvent('calibrated');
  });
  ipcMain.handle('ensure-models', async (e) => {
    try {
      await ensureModels(MODELS_DIR, MODEL_DIRS, (p, f) => e.sender.send('models-progress', p, f));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
  ipcMain.on('minute', (_e, s: MinuteSample) => {
    if (settings.activityTracking && activity.isRunning) Object.assign(s, activity.take());
    store.saveMinute(s);
  });
  ipcMain.on('status', (_e, s: LiveStatus) => {
    lastStatus = s;
    updateTray(); // tani: menu przebudowuje się tylko przy zmianie treści
    widgetWin?.webContents.send('status', s);
    nudgeWin?.webContents.send('status', s); // podpowiedź o postawie znika, gdy się poprawisz
  });
  ipcMain.on('notify', (_e, n) => notify(n));
  ipcMain.on('event', (_e, ev: AppEvent) => store.addEvent(ev.type, ev.detail));
  ipcMain.handle('get-stats', () => statsNow());
  ipcMain.on('set-paused', (_e, p: boolean) => setPaused(p));
  ipcMain.on('open-main', (_e, view?: string) => showMain(view));
  ipcMain.on('nudge-action', (_e, a: NudgeAction) => {
    nudgeWin?.hide();
    if (a === 'start') showMain('live');
    mainWin?.webContents.send('nudge-action', a);
  });
  // Przeciąganie widgetu robi renderer (region „drag” zjadałby kliknięcia); tu tylko przesuwamy okno.
  ipcMain.on('widget-move', (_e, x: number, y: number, done: boolean) => {
    if (!widgetWin) return;
    const [w, h] = widgetWin.getSize();
    widgetWin.setBounds({ x: Math.round(x), y: Math.round(y), width: w, height: h });
    if (done) store.setMeta('widgetPos', { x: Math.round(x), y: Math.round(y) });
  });
  ipcMain.on('tray-badge', (_e, png: string | null) => {
    if (process.platform !== 'win32') return;
    trayBadge = png ? nativeImage.createFromBuffer(Buffer.from(png.split(',')[1], 'base64'), { scaleFactor: 2 }) : null;
    updateTray();
  });
  ipcMain.handle('activity-status', () => ({ running: activity.isRunning, error: activity.error }));
  ipcMain.handle('wipe-data', () => store.wipe());
  ipcMain.on('open-external', (_e, url: string) => {
    if (/^https:\/\//.test(url)) void shell.openExternal(url);
  });
}

async function debugScreenshot(): Promise<void> {
  if (!DEBUG_SHOT || !mainWin) return;
  if (process.env.POSTURA_SHOT_HEIGHT) mainWin.setSize(1180, Number(process.env.POSTURA_SHOT_HEIGHT));
  await new Promise((r) => setTimeout(r, Number(process.env.POSTURA_SHOT_DELAY ?? 2500)));
  const img = await mainWin.webContents.capturePage();
  await writeFile(DEBUG_SHOT, img.toPNG());
  quitting = true;
  app.quit();
}

app.on('second-instance', () => showMain());
app.on('before-quit', () => {
  quitting = true;
  activity.stop();
});

void app.whenReady().then(async () => {
  store = new Store(path.join(app.getPath('userData'), 'postura.db'));
  settings = store.getSettings();
  registerProtocol();

  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'media' || permission === 'notifications'));
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media' || permission === 'notifications');
  if (process.platform === 'darwin') {
    await systemPreferences.askForMediaAccess('camera').catch(() => false);
    app.dock?.hide();
  }
  if (process.platform === 'win32') app.setAppUserModelId('pl.postura.app');

  registerIpc();
  createMainWindow();
  watchRendererForReload();
  tray = new Tray(trayIcon('idle'));
  tray.on('click', () => showMain());
  applySettings(settings);

  setInterval(maybeEndOfDay, 60e3);
  powerMonitor.on('lock-screen', () => mainWin?.webContents.send('paused', true));
  powerMonitor.on('unlock-screen', () => mainWin?.webContents.send('paused', paused));
  void debugScreenshot();
});

app.on('window-all-closed', () => {
  // Aplikacja żyje w zasobniku.
  if (DEBUG_SHOT) app.quit();
});
