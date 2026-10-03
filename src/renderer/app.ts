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
      if (document.hasFocus()) ctx.toast(`${ISSUE_LABEL[issue]}. ${ISSUE_TIP[issue]}`);
    },
    onBreak: (s) => {
      ctx.pendingBreak = s;
      api?.logEvent({ type: 'break-suggested', detail: `${s.kind}:${s.reason}` });
      const title = BREAK_TITLE[s.kind];
      const nudge =
        s.kind === 'eye'
          ? { kind: 'eye' as const, title: 'Spójrz w dal', body: 'Przez 20 s patrz na coś odległego (ok. 6 m).', seconds: 20 }
          : { kind: 'break' as const, title, body: exerciseById(s.exerciseId).name };
      api?.notify({ title, body: s.kind === 'eye' ? 'Spójrz na 20 s w dal.' : 'Kliknij, aby zobaczyć ćwiczenie.', kind: 'break', openBreak: true, nudge });
      ctx.toast(`${title}: czas na chwilę odpoczynku.`, { label: 'Zacznij przerwę', run: () => ctx.startBreak(s) });
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
  api?.onNudgeAction((a) => {
    const s = ctx.pendingBreak;
    if (a === 'start') ctx.startBreak(s ?? undefined);
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
  { id: 'live', label: 'Na żywo', icon: '<circle cx="12" cy="6" r="3"/><path d="M12 9v8M7 13h10"/>' },
  { id: 'stats', label: 'Statystyki', icon: '<path d="M4 19V11M10 19V5M16 19v-6M22 19H2"/>' },
  { id: 'exercises', label: 'Ćwiczenia', icon: '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v6l-4 6M12 14l4 6M6 10l6-2 6 2"/>' },
  { id: 'settings', label: 'Ustawienia', icon: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>' },
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
