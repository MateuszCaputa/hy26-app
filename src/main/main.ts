// Proces główny: okna, zasobnik, protokół app://, baza, powiadomienia, klawiatura/mysz, Garmin.
import {
  app, BrowserWindow, ipcMain, Menu, nativeImage, Notification, powerMonitor, protocol, session,
  shell, systemPreferences, Tray,
} from 'electron';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AppEvent, Calibration, LiveStatus, MinuteSample, Settings } from '../shared/types';
import type { InitData } from '../shared/api';
import { Store } from './db';
import { ActivityCounter } from './activity';
import { GarminSync } from './garmin';
import { ensureModels, modelsReady } from './models';
import { buildStats, localDate } from '../core/insights';
import { ERGONOMIC_TIP, ISSUE_LABEL } from '../core/coach';

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
let tray: Tray | null = null;
let quitting = false;
let paused = false;
let lastStatus: LiveStatus | null = null;
let lastNotifyAt = 0;
const activity = new ActivityCounter();
let garmin: GarminSync;

function resolveAppUrl(url: string): string | null {
  const u = new URL(url);
  const p = decodeURIComponent(u.pathname);
  if (p.startsWith('/models/')) {
    const file = path.join(MODELS_DIR, path.basename(p));
    return existsSync(file) ? file : null;
  }
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

function setPaused(p: boolean): void {
  paused = p;
  mainWin?.webContents.send('paused', p);
  updateTray();
}

function updateTray(): void {
  if (!tray) return;
  const s = lastStatus;
  const state = paused ? 'paused' : s?.state ?? 'absent';
  tray.setImage(trayIcon(state));
  const label =
    paused ? 'Postura – pauza'
    : !s || s.state === 'absent' ? 'Postura – brak osoby w kadrze'
    : `Postura – postawa ${s.score ?? '–'}/100${s.fatigue ? `, zmęczenie ${s.fatigue.percent}%` : ''}`;
  tray.setToolTip(label);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label, enabled: false },
      { type: 'separator' },
      { label: 'Pokaż okno', click: () => showMain('live') },
      { label: 'Statystyki', click: () => showMain('stats') },
      { label: 'Kalibracja', click: () => showMain('calibrate') },
      { label: paused ? 'Wznów analizę' : 'Wstrzymaj analizę', click: () => setPaused(!paused) },
      { label: 'Mini-widget', type: 'checkbox', checked: settings.miniWidget, click: (i) => applySettings({ ...settings, miniWidget: i.checked }) },
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

function toggleWidget(on: boolean): void {
  if (on && !widgetWin) {
    widgetWin = new BrowserWindow({
      width: 230,
      height: 74,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: true,
      hasShadow: false,
      webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, sandbox: true },
    });
    widgetWin.setAlwaysOnTop(true, 'floating');
    void widgetWin.loadURL('app://local/widget.html');
    widgetWin.on('closed', () => (widgetWin = null));
    if (lastStatus) widgetWin.webContents.once('did-finish-load', () => widgetWin?.webContents.send('status', lastStatus));
  } else if (!on && widgetWin) {
    widgetWin.close();
    widgetWin = null;
  }
}

function applySettings(s: Settings): void {
  settings = s;
  store.saveSettings(s);
  if (s.activityTracking) activity.start();
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

function notify(n: { title: string; body: string; kind: string; openBreak?: boolean }): void {
  if (settings.doNotDisturb || paused) return;
  if (settings.onlyWorkHours && !withinWorkHours()) return;
  // Maksymalnie jedno powiadomienie o postawie na `alertCooldownMin`; przerwy mają osobny limit 1 min.
  const now = Date.now();
  if (n.kind === 'posture' && now - lastNotifyAt < settings.alertCooldownMin * 60e3) return;
  if (n.kind === 'posture') lastNotifyAt = now;
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
  const since = now - 28 * 864e5;
  const dayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  return buildStats({
    now,
    samples: store.minutesSince(since),
    garmin: store.garminDays(localDate(since)),
    garminConnected: garmin.connected,
    breaksToday: store.countEvents('break-done', dayStart),
    alertsToday: store.countEvents('alert', dayStart),
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

async function maybeSyncGarmin(): Promise<void> {
  if (!garmin.connected) return;
  const last = store.getMeta<number>('garminLastSync') ?? 0;
  if (Date.now() - last < 6 * 3600e3) return;
  try {
    await garmin.sync(last ? 2 : 14);
  } catch {
    /* błąd widoczny w ustawieniach */
  }
}

function registerIpc(): void {
  ipcMain.handle('init', (): InitData => ({
    settings,
    calibration: store.getCalibration(),
    modelsReady: modelsReady(MODELS_DIR),
    paused,
    platform: process.platform,
    garmin: { connected: garmin.connected, email: garmin.email },
  }));
  ipcMain.handle('save-settings', (_e, s: Settings) => applySettings(s));
  ipcMain.handle('save-calibration', (_e, c: Calibration) => {
    store.saveCalibration(c);
    store.addEvent('calibrated');
  });
  ipcMain.handle('ensure-models', async (e) => {
    try {
      await ensureModels(MODELS_DIR, (p, f) => e.sender.send('models-progress', p, f));
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
    const changed = s.state !== lastStatus?.state || s.score !== lastStatus?.score || s.fatigue?.percent !== lastStatus?.fatigue?.percent;
    lastStatus = s;
    if (changed) updateTray();
    widgetWin?.webContents.send('status', s);
  });
  ipcMain.on('notify', (_e, n) => notify(n));
  ipcMain.on('event', (_e, ev: AppEvent) => store.addEvent(ev.type, ev.detail));
  ipcMain.handle('get-stats', () => statsNow());
  ipcMain.on('set-paused', (_e, p: boolean) => setPaused(p));
  ipcMain.handle('garmin-connect', async (_e, email: string, password: string) => {
    try {
      await garmin.connect(email, password);
      await garmin.sync(14).catch(() => undefined);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
  ipcMain.handle('garmin-disconnect', () => garmin.disconnect());
  ipcMain.handle('garmin-sync', async () => {
    try {
      const d = await garmin.sync(14);
      return { ok: true, days: d.length };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
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
  garmin = new GarminSync(store);
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
  tray = new Tray(trayIcon('idle'));
  tray.on('click', () => showMain());
  applySettings(settings);

  setInterval(maybeEndOfDay, 60e3);
  setInterval(() => void maybeSyncGarmin(), 30 * 60e3);
  setTimeout(() => void maybeSyncGarmin(), 15e3);
  powerMonitor.on('lock-screen', () => mainWin?.webContents.send('paused', true));
  powerMonitor.on('unlock-screen', () => mainWin?.webContents.send('paused', paused));
  void debugScreenshot();
});

app.on('window-all-closed', () => {
  // Aplikacja żyje w zasobniku.
  if (DEBUG_SHOT) app.quit();
});
