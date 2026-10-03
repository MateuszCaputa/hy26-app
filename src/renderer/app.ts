// Interfejs główny: nawigacja, połączenie analizatora z widokami i procesem głównym.
import '../shared/api';
import type { InitData } from '../shared/api';
import type { BreakSuggestion, Calibration, IssueId, LiveStatus, Settings } from '../shared/types';
import { Analyzer, type Frame } from './analyzer';
import { BREAK_TITLE, ISSUE_LABEL, ISSUE_TIP, exerciseById } from '../core/coach';
import { $, clear, h } from './dom';
import { LiveView } from './views/live';
import { renderStats } from './views/stats';
import { renderExercises } from './views/exercises';
import { renderSettings } from './views/settings';
import { openBreakOverlay, openCalibration, showModelsScreen } from './overlays';
import { updateTrayBadge } from './trayBadge';

export type ViewId = 'live' | 'stats' | 'exercises' | 'settings';

export interface AppCtx {
  init: InitData;
  settings: Settings;
  calibration: Calibration | null;
  analyzer: Analyzer;
  paused: boolean;
  status: LiveStatus | null;
  pendingBreak: BreakSuggestion | null;
  navigate(v: ViewId): void;
  toast(text: string, action?: { label: string; run: () => void }): void;
  saveSettings(s: Settings): Promise<void>;
  setPaused(p: boolean): void;
  startCalibration(): void;
  startBreak(s?: BreakSuggestion, exerciseId?: string): void;
}

const api = window.postura;
const params = new URLSearchParams(location.search);
const DEMO = params.has('demo') || !api;

let live: LiveView | null = null;
const frameTally: Record<string, number> = {};
let lastPoseLogged = false;
let current: ViewId = 'live';

async function main(): Promise<void> {
  const init: InitData = api
    ? await api.init()
    : { settings: (await import('../shared/types')).DEFAULT_SETTINGS, calibration: null, modelsReady: true, paused: false, platform: 'web' };

  const ctx = {} as AppCtx;
  Object.assign(ctx, {
    init,
    settings: init.settings,
    calibration: init.calibration,
    paused: init.paused,
    status: null,
    pendingBreak: null,
  });

  const analyzer = new Analyzer(init.settings, init.calibration, {
    onFrame: (f: Frame) => {
      live?.frame(f);
      if (params.has('autocal')) {
        const k = f.metrics ? 'ok' : f.reason ?? '?';
        frameTally[k] = (frameTally[k] ?? 0) + 1;
        if (f.pose && !lastPoseLogged) {
          lastPoseLogged = true;
          console.info('pose', JSON.stringify([0, 2, 5, 7, 8, 11, 12].map((i) => f.pose![i])));
        }
      }
    },
    onStatus: (s) => {
      ctx.status = s;
      live?.status(s);
      updateRail(ctx);
      api?.sendStatus(s);
      if (api && init.platform === 'win32') updateTrayBadge(s, (png) => api.setTrayBadge(png));
    },
    onAlert: (issue: IssueId) => {
      api?.logEvent({ type: 'alert', detail: issue });
      api?.notify({ title: ISSUE_LABEL[issue], body: ISSUE_TIP[issue], kind: 'posture', nudge: { kind: 'posture', title: ISSUE_LABEL[issue], body: ISSUE_TIP[issue] } });
      // Z mini-widgetem przypomnienie jest tylko w okienku pod nim – bez dubla w aplikacji.
      if (document.hasFocus() && !ctx.settings.miniWidget) ctx.toast(`${ISSUE_LABEL[issue]}. ${ISSUE_TIP[issue]}`);
    },
    onBreak: (s) => {
      ctx.pendingBreak = s;
      api?.logEvent({ type: 'break-suggested', detail: `${s.kind}:${s.reason}` });
      const title = BREAK_TITLE[s.kind];
      const nudge =
        s.kind === 'eye'
          ? { kind: 'eye' as const, title: 'Spójrz w dal', body: 'Przez 20 s patrz na coś odległego (ok. 6 m).', seconds: 20 }
          : { kind: 'break' as const, title, body: exerciseById(s.exerciseId).name, exerciseId: s.exerciseId };
      api?.notify({ title, body: s.kind === 'eye' ? 'Spójrz na 20 s w dal.' : 'Kliknij, aby zobaczyć ćwiczenie.', kind: 'break', openBreak: true, nudge });
      if (!ctx.settings.miniWidget) ctx.toast(`${title}: czas na chwilę odpoczynku.`, { label: 'Zacznij przerwę', run: () => ctx.startBreak(s) });
      live?.status(analyzer.status());
    },
    onAwayBreak: (awaySec) => {
      ctx.pendingBreak = null;
      api?.logEvent({ type: 'break-done', detail: 'move:away' });
      ctx.toast(`Witaj z powrotem. ${Math.round(awaySec / 60)} min poza biurkiem liczę jako przerwę.`);
      live?.status(analyzer.status());
    },
    onMinute: (s) => api?.sendMinute(s),
    onCameraState: (state, detail) => live?.camera(state, detail),
    onRecalibrateHint: (kind) =>
      ctx.toast(
        kind === 'straighter'
          ? 'Dziś siedzisz prościej niż przy kalibracji – nowa kalibracja da dokładniejsze wyniki.'
          : 'Kamera lub krzesło chyba się zmieniły – wyniki mogą być zawyżone.',
        { label: 'Skalibruj', run: () => ctx.startCalibration() },
      ),
  });
  analyzer.demo = DEMO;

  Object.assign(ctx, {
    analyzer,
    navigate: (v: ViewId) => navigate(ctx, v),
    toast: (text: string, action?: { label: string; run: () => void }) => toast(text, action),
    saveSettings: async (s: Settings) => {
      ctx.settings = s;
      analyzer.setSettings(s);
      live?.applySettings(s);
      await api?.saveSettings(s);
    },
    setPaused: (p: boolean) => {
      ctx.paused = p;
      if (p) analyzer.stop();
      else void analyzer.start();
      api?.setPaused(p);
      updateRail(ctx);
      live?.paused(p);
    },
    startCalibration: () => {
      navigate(ctx, 'live');
      if (!analyzer.isRunning) void analyzer.start();
      openCalibration(ctx, (cal) => {
        ctx.calibration = cal;
        void api?.saveCalibration(cal);
        api?.logEvent({ type: 'calibrated' });
        live?.status(analyzer.status());
        ctx.toast('Kalibracja zapisana. Od teraz oceniam postawę względem tej pozycji.');
      });
    },
    startBreak: (s?: BreakSuggestion, exerciseId?: string) => {
      const sug = s ?? ctx.pendingBreak ?? undefined;
      openBreakOverlay(ctx, sug, exerciseId);
    },
  });

  buildShell(ctx);

  api?.onPaused((p) => {
    if (p !== ctx.paused) {
      ctx.paused = p;
      if (p) analyzer.stop();
      else void analyzer.start();
      updateRail(ctx);
      live?.paused(p);
    }
  });
  api?.onNavigate((v) => (v === 'calibrate' ? ctx.startCalibration() : navigate(ctx, v as ViewId)));
  api?.onShowBreak(() => ctx.startBreak());
  // Akcje z podpowiedzi w rogu ekranu.
  api?.onNudgeAction((a, exerciseId) => {
    const s = ctx.pendingBreak;
    if (a === 'start') ctx.startBreak(s ?? undefined, exerciseId);
    else if (a === 'snooze') {
      analyzer.breakSnoozed();
      api.logEvent({ type: 'break-snoozed', detail: s?.kind ?? 'micro' });
      ctx.pendingBreak = null;
    } else if (a === 'eye-done') {
      analyzer.breakDone('eye');
      api.logEvent({ type: 'break-done', detail: 'eye:20-20-20' });
      ctx.pendingBreak = null;
    }
  });

  const startView = (params.get('view') as ViewId | null) ?? 'live';
  if (!init.modelsReady && !DEMO) {
    await showModelsScreen();
  }
  try {
    await analyzer.loadModels();
  } catch (e) {
    toast(`Nie udało się wczytać modeli analizy: ${(e as Error).message}`);
  }
  const special = startView as string;
  navigate(ctx, special === 'calibrate' || special === 'break' ? 'live' : startView);
  if (!ctx.paused) await analyzer.start();
  if (params.has('autocal')) {
    // Tryb testowy: kalibracja bez klikania i log stanu w konsoli.
    await new Promise((r) => setTimeout(r, 2500));
    console.info('frames before cal', JSON.stringify(frameTally));
    const cal = await analyzer.calibrate(4);
    console.info('autocal', JSON.stringify(cal));
    if (cal) {
      ctx.calibration = cal;
      live?.status(analyzer.status());
    }
    setInterval(() => console.info('status', JSON.stringify(analyzer.status()), JSON.stringify(frameTally)), 2000);
  } else if (!ctx.calibration && !DEMO) ctx.startCalibration();
  if (DEMO && !ctx.calibration) {
    // Demo: automatyczna kalibracja z syntetycznej sylwetki.
    const cal = await analyzer.calibrate(3);
    if (cal) ctx.calibration = cal;
  }
  if (special === 'break') ctx.startBreak({ kind: 'micro', reason: 'posture-trend', exerciseId: 'chin-tuck' });
  if (special === 'calibrate' && ctx.calibration) ctx.startCalibration();
}

const NAV: { id: ViewId; label: string; icon: string }[] = [
  // Ikona: camera (svgrepo.com).
  { id: 'live', label: 'Na żywo', icon: '<path d="M21 13V17C21 18.1046 20.1046 19 19 19H9M5 19C3.89543 19 3 18.1046 3 17V9C3 7.89543 3.89543 7 5 7H7.5C8.05228 7 8.5 6.55228 8.5 6C8.5 5.44772 8.94772 5 9.5 5H14.5C15.0523 5 15.5 5.44772 15.5 6C15.5 6.55228 15.9477 7 16.5 7H19C20.1046 7 21 7.89543 21 9M9 13C9 14.6569 10.3431 16 12 16C13.6569 16 15 14.6569 15 13C15 11.3431 13.6569 10 12 10"/>' },
  { id: 'stats', label: 'Statystyki', icon: '<path d="M4 19V11M10 19V5M16 19v-6M22 19H2"/>' },
  { id: 'exercises', label: 'Ćwiczenia', icon: '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v6l-4 6M12 14l4 6M6 10l6-2 6 2"/>' },
  // Ikona: gear (svgrepo.com).
  { id: 'settings', label: 'Ustawienia', icon: '<path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"/><path d="M12.9046 3.06005C12.6988 3 12.4659 3 12 3C11.5341 3 11.3012 3 11.0954 3.06005C10.7942 3.14794 10.5281 3.32808 10.3346 3.57511C10.2024 3.74388 10.1159 3.96016 9.94291 4.39272C9.69419 5.01452 9.00393 5.33471 8.36857 5.123L7.79779 4.93281C7.3929 4.79785 7.19045 4.73036 6.99196 4.7188C6.70039 4.70181 6.4102 4.77032 6.15701 4.9159C5.98465 5.01501 5.83376 5.16591 5.53197 5.4677C5.21122 5.78845 5.05084 5.94882 4.94896 6.13189C4.79927 6.40084 4.73595 6.70934 4.76759 7.01551C4.78912 7.2239 4.87335 7.43449 5.04182 7.85566C5.30565 8.51523 5.05184 9.26878 4.44272 9.63433L4.16521 9.80087C3.74031 10.0558 3.52786 10.1833 3.37354 10.3588C3.23698 10.5141 3.13401 10.696 3.07109 10.893C3 11.1156 3 11.3658 3 11.8663C3 12.4589 3 12.7551 3.09462 13.0088C3.17823 13.2329 3.31422 13.4337 3.49124 13.5946C3.69158 13.7766 3.96395 13.8856 4.50866 14.1035C5.06534 14.3261 5.35196 14.9441 5.16236 15.5129L4.94721 16.1584C4.79819 16.6054 4.72367 16.829 4.7169 17.0486C4.70875 17.3127 4.77049 17.5742 4.89587 17.8067C5.00015 18.0002 5.16678 18.1668 5.5 18.5C5.83323 18.8332 5.99985 18.9998 6.19325 19.1041C6.4258 19.2295 6.68733 19.2913 6.9514 19.2831C7.17102 19.2763 7.39456 19.2018 7.84164 19.0528L8.36862 18.8771C9.00393 18.6654 9.6942 18.9855 9.94291 19.6073C10.1159 20.0398 10.2024 20.2561 10.3346 20.4249C10.5281 20.6719 10.7942 20.8521 11.0954 20.94C11.3012 21 11.5341 21 12 21C12.4659 21 12.6988 21 12.9046 20.94C13.2058 20.8521 13.4719 20.6719 13.6654 20.4249C13.7976 20.2561 13.8841 20.0398 14.0571 19.6073C14.3058 18.9855 14.9961 18.6654 15.6313 18.8773L16.1579 19.0529C16.605 19.2019 16.8286 19.2764 17.0482 19.2832C17.3123 19.2913 17.5738 19.2296 17.8063 19.1042C17.9997 18.9999 18.1664 18.8333 18.4996 18.5001C18.8328 18.1669 18.9994 18.0002 19.1037 17.8068C19.2291 17.5743 19.2908 17.3127 19.2827 17.0487C19.2759 16.8291 19.2014 16.6055 19.0524 16.1584L18.8374 15.5134C18.6477 14.9444 18.9344 14.3262 19.4913 14.1035C20.036 13.8856 20.3084 13.7766 20.5088 13.5946C20.6858 13.4337 20.8218 13.2329 20.9054 13.0088C21 12.7551 21 12.4589 21 11.8663C21 11.3658 21 11.1156 20.9289 10.893C20.866 10.696 20.763 10.5141 20.6265 10.3588C20.4721 10.1833 20.2597 10.0558 19.8348 9.80087L19.5569 9.63416C18.9478 9.26867 18.6939 8.51514 18.9578 7.85558C19.1262 7.43443 19.2105 7.22383 19.232 7.01543C19.2636 6.70926 19.2003 6.40077 19.0506 6.13181C18.9487 5.94875 18.7884 5.78837 18.4676 5.46762C18.1658 5.16584 18.0149 5.01494 17.8426 4.91583C17.5894 4.77024 17.2992 4.70174 17.0076 4.71872C16.8091 4.73029 16.6067 4.79777 16.2018 4.93273L15.6314 5.12287C14.9961 5.33464 14.3058 5.0145 14.0571 4.39272C13.8841 3.96016 13.7976 3.74388 13.6654 3.57511C13.4719 3.32808 13.2058 3.14794 12.9046 3.06005Z"/>' },
];

function buildShell(ctx: AppCtx): void {
  const root = $('#app');
  clear(root);
  const rail = h(
    'nav',
    { class: 'rail', 'aria-label': 'Nawigacja' },
    h('div', { class: 'brand' }, h('span', { class: 'brand-mark', html: '<svg viewBox="0 0 24 24"><path d="M12 3c-2 3 2 5 0 8s2 5 0 8" /></svg>' }), 'Postura'),
    h(
      'ul',
      null,
      NAV.map((n) =>
        h('li', null,
          h('button', { class: 'nav-btn', 'data-view': n.id, onclick: () => navigate(ctx, n.id) },
            h('span', { class: 'nav-icon', html: `<svg viewBox="0 0 24 24">${n.icon}</svg>` }),
            n.label,
          ),
        ),
      ),
    ),
    h('div', { class: 'rail-foot' },
      h('div', { class: 'rail-state', id: 'rail-state' }),
      h('button', { class: 'btn ghost small', id: 'pause-btn', onclick: () => ctx.setPaused(!ctx.paused) }, 'Wstrzymaj'),
    ),
  );
  const view = h('main', { id: 'view', class: 'view', tabindex: '-1' });
  root.append(rail, view);
  live = new LiveView(ctx);
  updateRail(ctx);
}

function navigate(ctx: AppCtx, v: ViewId): void {
  current = v;
  document.querySelectorAll<HTMLButtonElement>('.nav-btn').forEach((b) => b.setAttribute('aria-current', b.dataset.view === v ? 'page' : 'false'));
  const view = $('#view');
  live?.detach();
  clear(view);
  if (v === 'live') live!.mount(view);
  else if (v === 'stats') void renderStats(view, ctx);
  else if (v === 'exercises') renderExercises(view, ctx);
  else if (v === 'settings') void renderSettings(view, ctx);
  view.focus({ preventScroll: true });
}

function updateRail(ctx: AppCtx): void {
  const el = document.getElementById('rail-state');
  const btn = document.getElementById('pause-btn');
  if (btn) btn.textContent = ctx.paused ? 'Wznów analizę' : 'Wstrzymaj';
  if (!el) return;
  const s = ctx.status;
  const state = ctx.paused ? 'paused' : s?.state ?? 'absent';
  el.dataset.state = state;
  el.textContent = ctx.paused
    ? 'Analiza wstrzymana'
    : !s || state === 'absent'
      ? 'Nie widzę Cię w kadrze'
      : s.score === null
        ? 'Czekam na kalibrację'
        : `Postawa ${s.score}/100`;
}

let toastTimer: number | null = null;
function toast(text: string, action?: { label: string; run: () => void }): void {
  const root = $('#toast-root');
  clear(root);
  const el = h('div', { class: 'toast', role: 'status' },
    h('span', null, text),
    action ? h('button', { class: 'btn small', onclick: () => { action.run(); clear(root); } }, action.label) : null,
    h('button', { class: 'toast-x', 'aria-label': 'Zamknij', onclick: () => clear(root) }, '×'),
  );
  root.append(el);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => clear(root), action ? 20000 : 7000);
}

export const currentView = () => current;

void main();
