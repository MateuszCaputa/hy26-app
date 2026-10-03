// Nakładki: ekran przerwy z ćwiczeniem, kalibracja, pobieranie modeli.
import type { AppCtx } from './app';
import type { BreakSuggestion, Calibration } from '../shared/types';
import { BREAK_REASON, BREAK_TITLE, exerciseById, pickExercise } from '../core/coach';
import { ExerciseVerifier, VERIFY_SPECS, type VerifyProgress } from '../core/exerciseVerify';
import { openCalibrator } from './calibrator';
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

/** Licznik ćwiczenia sprawdzanego kamerą (A4/C6): powtórzenia albo sekundy na stronę, ✓ po wykonaniu. */
function verifyPanel(spec: (typeof VERIFY_SPECS)[string]): { el: HTMLElement; set: (p: VerifyProgress) => void } {
  const count = h('span', { class: 'verify-count' });
  const bar = h('span', { class: 'meter-fill', style: 'width:0%' });
  const note = h('span', { class: 'verify-note', 'aria-live': 'polite' }, 'Kliknij Start – kamera policzy ruchy.');
  const el = h('div', { class: 'verify', 'data-state': 'idle' },
    h('div', { class: 'verify-head' }, h('span', { class: 'verify-label' }, 'Kamera sprawdza'), count),
    h('span', { class: 'meter' }, bar),
    note,
  );
  const unit = spec.mode === 'reps' ? `/${spec.target}` : ` s`;
  count.textContent = `0${unit}`;
  return {
    el,
    set: (p) => {
      el.dataset.state = p.phase === 'done' ? 'done' : p.inMove ? 'move' : 'active';
      bar.style.width = `${Math.round(p.fraction * 100)}%`;
      count.textContent = p.phase === 'done' ? '✓' : p.sides ? `${p.sides.left} s | ${p.sides.right} s` : `${p.count}${unit}`;
      note.textContent =
        p.phase === 'done' ? 'Wykonane!'
          : p.lost ? 'Nie widzę Cię – usiądź przed kamerą.'
            : p.phase === 'baseline' ? 'Usiądź swobodnie, mierzę pozycję wyjściową…'
              : p.sides ? `${spec.cue}: po ${spec.target} s na każdą stronę.`
                : `${spec.cue}.`;
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

  // Weryfikacja kamerą tylko dla ćwiczeń z pewnym sygnałem i przy działającej analizie (bez podglądu wideo:
  // czytamy metryki z analizatora, wspólnego <video> nie ruszamy).
  const spec = VERIFY_SPECS[ex.id];
  const panel = spec && !ctx.paused && ctx.analyzer.isRunning ? verifyPanel(spec) : null;
  let verifier: ExerciseVerifier | null = null;
  let verifyRaf = 0;
  let verified = false;
  const verifyTick = () => {
    // Okno zamknięte (np. Escape): przestajemy liczyć i niczego nie zaliczamy.
    if (!verifier || !panel || !panel.el.isConnected) return;
    const p = verifier.update(performance.now(), ctx.analyzer.currentMetrics);
    panel.set(p);
    if (p.phase === 'done') {
      verified = true;
      doneBtn.classList.add('primary');
      // Chwila na ✓, potem przerwa zalicza się sama.
      window.setTimeout(() => panel.el.isConnected && finish(true), 1400);
      return;
    }
    verifyRaf = requestAnimationFrame(verifyTick);
  };

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
    if (panel) {
      verifier = new ExerciseVerifier(spec);
      verifyTick();
    }
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
        h('div', { class: 'break-timer' }, rg.el, panel?.el ?? null),
        h('div', { class: 'row' }, startBtn, doneBtn, snoozeBtn),
      ),
    ),
  );
  const sheet = wrap.querySelector('.sheet') as HTMLElement;
  sheet.classList.add('sheet-wide');
  let finished = false;
  const finish = (done: boolean) => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(verifyRaf);
    if (done) {
      // Bateria przed i po: zaliczona przerwa zeruje czas od przerwy i trend zmęczenia, więc wynik realnie rośnie.
      const before = ctx.analyzer.status().energy?.percent ?? null;
      ctx.analyzer.breakDone(kind);
      const after = ctx.analyzer.status().energy?.percent ?? null;
      window.postura?.logEvent({ type: 'break-done', detail: `${kind}:${ex.id}${verified ? ':verified' : ''}` });
      const gain = before !== null && after !== null && after > before ? ` Bateria ${before}% → ${after}%.` : '';
      ctx.toast(`${verified ? 'Ćwiczenie wykonane – kamera to potwierdziła.' : 'Przerwa zaliczona.'}${gain}`);
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

/** Kalibracja: pełnoekranowy kalibrator z podglądem kamery (calibrator.ts). */
export function openCalibration(ctx: AppCtx, onDone: (c: Calibration) => void): void {
  openCalibrator(ctx, onDone);
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
