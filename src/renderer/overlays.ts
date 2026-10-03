// Nakładki: ekran przerwy z ćwiczeniem, kalibracja, pobieranie modeli.
import type { AppCtx } from './app';
import type { BreakSuggestion, Calibration } from '../shared/types';
import { BREAK_REASON, BREAK_TITLE, exerciseById, pickExercise } from '../core/coach';
import { $, clear, h, svg } from './dom';
import { FIGURES } from './figures';

function overlay(label: string, ...children: HTMLElement[]): { el: HTMLElement; close: () => void } {
  const root = $('#overlay-root');
  clear(root);
  const prevFocus = document.activeElement as HTMLElement | null;
  const el = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': label }, h('div', { class: 'sheet' }, ...children));
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  const close = () => {
    document.removeEventListener('keydown', onKey);
    el.remove();
    prevFocus?.focus?.();
  };
  document.addEventListener('keydown', onKey);
  root.append(el);
  queueMicrotask(() => el.querySelector<HTMLElement>('button.primary, button')?.focus());
  return { el, close };
}

/** Pierścień odliczania (SVG). */
function ring(): { el: HTMLElement; set: (fraction: number, text: string) => void } {
  const r = 52;
  const c = 2 * Math.PI * r;
  const el = svg(
    `<svg viewBox="0 0 120 120" class="ring-svg" aria-hidden="true">
      <circle cx="60" cy="60" r="${r}" class="ring-track"/>
      <circle cx="60" cy="60" r="${r}" class="ring-fill" stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90 60 60)"/>
    </svg><span class="ring-text"></span>`,
    'ring',
  );
  const fill = el.querySelector('.ring-fill') as SVGCircleElement;
  const text = el.querySelector('.ring-text') as HTMLElement;
  return {
    el,
    set: (f, t) => {
      fill.setAttribute('stroke-dashoffset', String(c * (1 - Math.min(1, Math.max(0, f)))));
      text.textContent = t;
    },
  };
}

export function openBreakOverlay(ctx: AppCtx, sug?: BreakSuggestion, exerciseId?: string): void {
  const kind = sug?.kind ?? (exerciseId ? exerciseById(exerciseId).kinds[0] : 'micro');
  const ex = exerciseById(exerciseId ?? sug?.exerciseId ?? pickExercise(kind, ctx.status?.topIssue ?? null, Date.now() / 6e4));
  const rg = ring();
  const fmt = (sec: number) => {
    const s = Math.ceil(sec);
    return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s} s`;
  };
  rg.set(0, fmt(ex.seconds));
  let started = 0;
  let raf = 0;
  const startBtn = h('button', { class: 'btn primary' }, 'Start');
  const doneBtn = h('button', { class: 'btn' }, 'Zrobione');
  const snoozeBtn = h('button', { class: 'btn ghost' }, 'Odłóż o 5 min');

  const tick = () => {
    const el = (performance.now() - started) / 1000;
    const left = Math.max(0, ex.seconds - el);
    rg.set(el / ex.seconds, left > 0 ? fmt(left) : 'Gotowe');
    if (left > 0) raf = requestAnimationFrame(tick);
    else {
      doneBtn.classList.add('primary');
      doneBtn.focus();
    }
  };
  startBtn.addEventListener('click', () => {
    started = performance.now();
    startBtn.hidden = true;
    sheet.classList.add('running');
    tick();
  });

  const { el: wrap, close } = overlay(
    BREAK_TITLE[kind],
    h('div', { class: 'break' },
      h('div', { class: 'break-fig' }, svg(FIGURES[ex.figure], 'fig-lg')),
      h('div', { class: 'break-body' },
        h('h1', null, BREAK_TITLE[kind]),
        sug ? h('p', { class: 'fine' }, BREAK_REASON[sug.reason]) : null,
        h('h2', null, ex.name),
        h('ol', { class: 'steps' }, ex.steps.map((s) => h('li', null, s))),
        h('div', { class: 'break-timer' }, rg.el),
        h('div', { class: 'row' }, startBtn, doneBtn, snoozeBtn),
      ),
    ),
  );
  const sheet = wrap.querySelector('.sheet') as HTMLElement;
  sheet.classList.add('sheet-wide');
  const finish = (done: boolean) => {
    cancelAnimationFrame(raf);
    if (done) {
      ctx.analyzer.breakDone(kind);
      window.postura?.logEvent({ type: 'break-done', detail: `${kind}:${ex.id}` });
      ctx.toast('Przerwa zaliczona. Wracam do obserwacji postawy.');
    } else {
      ctx.analyzer.breakSnoozed();
      window.postura?.logEvent({ type: 'break-snoozed', detail: kind });
    }
    ctx.pendingBreak = null;
    close();
  };
  doneBtn.addEventListener('click', () => finish(true));
  snoozeBtn.addEventListener('click', () => finish(false));
}

export function openCalibration(ctx: AppCtx, onDone: (c: Calibration) => void): void {
  const status = h('p', { class: 'cal-status', 'aria-live': 'assertive' });
  const rg = ring();
  rg.set(0, '5 s');
  const go = h('button', { class: 'btn primary' }, 'Rozpocznij (5 s)');
  const cancel = h('button', { class: 'btn ghost' }, 'Później');
  const { close } = overlay(
    'Kalibracja postawy',
    h('div', { class: 'cal' },
      h('h1', null, 'Pokaż mi swoją prostą postawę'),
      h('p', { class: 'fine' }, 'Przez 5 sekund zapamiętam, jak wyglądasz, siedząc prosto. Wszystkie oceny będą liczone względem tej pozycji.'),
      h('ol', { class: 'steps' },
        h('li', null, 'Stopy płasko na podłodze, plecy oparte o krzesło.'),
        h('li', null, 'Barki rozluźnione, broda lekko cofnięta, wzrok na ekran.'),
        h('li', null, 'Głowa i barki muszą być widoczne w kadrze.'),
      ),
      h('div', { class: 'cal-run' }, rg.el, status),
      h('div', { class: 'row' }, go, cancel),
    ),
  );
  cancel.addEventListener('click', close);
  go.addEventListener('click', async () => {
    go.disabled = true;
    cancel.disabled = true;
    status.textContent = 'Siedź prosto i patrz na ekran…';
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const el = (performance.now() - t0) / 1000;
      rg.set(el / 5, `${Math.max(0, Math.ceil(5 - el))} s`);
      if (el < 5) raf = requestAnimationFrame(tick);
    };
    tick();
    const cal = await ctx.analyzer.calibrate(5);
    cancelAnimationFrame(raf);
    go.disabled = false;
    cancel.disabled = false;
    if (!cal) {
      rg.set(0, '!');
      status.textContent = 'Nie widziałem wyraźnie głowy i barków. Usiądź tak, by były w kadrze, i spróbuj ponownie.';
      go.textContent = 'Spróbuj ponownie';
      return;
    }
    rg.set(1, 'OK');
    onDone(cal);
    close();
  });
}

/** Pierwsze uruchomienie: pobranie modeli MediaPipe (ok. 13 MB, jednorazowo). */
export function showModelsScreen(): Promise<void> {
  return new Promise((resolve) => {
    const api = window.postura;
    const bar = h('span', { class: 'meter-fill', style: 'width:0%' });
    const text = h('p', { class: 'fine', 'aria-live': 'polite' }, 'Łączę się…');
    const retry = h('button', { class: 'btn primary', hidden: true }, 'Spróbuj ponownie');
    const { close } = overlay(
      'Przygotowanie',
      h('div', { class: 'cal' },
        h('h1', null, 'Przygotowuję analizę'),
        h('p', { class: 'fine' }, 'Pobieram modele rozpoznawania sylwetki i twarzy (ok. 13 MB). To jednorazowe – później Postura działa bez internetu, a obraz z kamery nigdy nie opuszcza komputera.'),
        h('span', { class: 'meter big' }, bar),
        text,
        retry,
      ),
    );
    api.onModelsProgress((p) => {
      bar.style.width = `${Math.round(p * 100)}%`;
      text.textContent = `Pobrano ${Math.round(p * 100)}%`;
    });
    const run = async () => {
      retry.hidden = true;
      text.textContent = 'Pobieram…';
      const r = await api.ensureModels();
      if (r.ok) {
        close();
        resolve();
      } else {
        text.textContent = `Nie udało się pobrać modeli: ${r.error}. Sprawdź połączenie z internetem.`;
        retry.hidden = false;
      }
    };
    retry.addEventListener('click', () => void run());
    void run();
  });
}
