// Nakładki: ekran przerwy z ćwiczeniem, kalibracja, pobieranie modeli.
import type { AppCtx } from './app';
import type { BreakSuggestion, Calibration, SlouchReference } from '../shared/types';
import { BREAK_REASON, BREAK_TITLE, exerciseById, pickExercise } from '../core/coach';
import { judgeCalibration } from '../core/calibration';
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

/**
 * Kalibracja w dwóch krokach (zadanie A11):
 * 1. „Najprościej, jak umiesz” – z kontrolą na żywo; licznik idzie tylko, gdy postawa przechodzi kontrolę.
 * 2. „Tak, jak zwykle siedzisz” – osobisty zakres, z którego liczone są progi ostrzeżeń.
 * Gdy oba kroki prawie się nie różnią, prosimy o powtórkę (pierwsza pozycja nie była prosta).
 */
export function openCalibration(ctx: AppCtx, onDone: (c: Calibration) => void): void {
  const title = h('h1', null, 'Krok 1 z 2: usiądź najprościej, jak umiesz');
  const lead = h('p', { class: 'fine' }, 'Zapamiętam tę pozycję jako Twoją prostą postawę. Licznik idzie tylko wtedy, gdy postawa jest poprawna.');
  const steps = h('ol', { class: 'steps' },
    h('li', null, 'Stopy płasko na podłodze, plecy oparte o krzesło.'),
    h('li', null, 'Barki rozluźnione, broda lekko cofnięta, wzrok na środek ekranu.'),
    h('li', null, 'Głowa i barki muszą być widoczne w kadrze.'),
  );
  const status = h('p', { class: 'cal-status', 'aria-live': 'polite' });
  const checks = h('ul', { class: 'cal-checks', 'aria-live': 'polite' });
  const rg = ring();
  rg.set(0, '5 s');
  const go = h('button', { class: 'btn primary' }, 'Rozpocznij');
  const cancel = h('button', { class: 'btn ghost' }, 'Później');
  const { close } = overlay(
    'Kalibracja postawy',
    h('div', { class: 'cal' }, title, lead, steps, h('div', { class: 'cal-run' }, rg.el, h('div', null, status, checks)), h('div', { class: 'row' }, go, cancel)),
  );

  let phase: 'tall' | 'slouch' | 'verdict' = 'tall';
  let tall: Calibration | null = null;
  let slouch: SlouchReference | null = null;
  const busy = (b: boolean) => {
    go.disabled = b;
    cancel.disabled = b;
  };
  const save = (c: Calibration) => {
    ctx.analyzer.setCalibration(c);
    onDone(c);
    close();
  };

  const runTall = async () => {
    busy(true);
    status.textContent = 'Siedź prosto i patrz na ekran…';
    const cal = await ctx.analyzer.calibrate(5, (f, list) => {
      rg.set(f, `${Math.max(0, Math.ceil(5 * (1 - f)))} s`);
      checks.replaceChildren(...list.map((c) => h('li', null, c.text)));
      status.textContent = list.length ? 'Popraw, a licznik ruszy dalej:' : 'Świetnie, trzymaj tak…';
    });
    busy(false);
    checks.replaceChildren();
    if (!cal) {
      rg.set(0, '!');
      status.textContent = 'Nie udało się zapamiętać prostej postawy. Sprawdź, czy głowa i barki są w kadrze, i spróbuj ponownie.';
      go.textContent = 'Spróbuj ponownie';
      return;
    }
    tall = cal;
    phase = 'slouch';
    title.textContent = 'Krok 2 z 2: usiądź tak, jak zwykle przy pracy';
    lead.textContent = 'Nie poprawiaj się – przyjmij swoją zwykłą pozycję, nawet jeśli jest zgarbiona. Dzięki temu Postura dopasuje czułość do Ciebie.';
    steps.hidden = true;
    rg.set(0, '4 s');
    status.textContent = '';
    go.textContent = 'Rozpocznij (4 s)';
    cancel.textContent = 'Pomiń';
  };

  const runSlouch = async () => {
    busy(true);
    status.textContent = 'Siedź zwyczajnie…';
    slouch = await ctx.analyzer.captureSlouch(4, (f) => rg.set(f, `${Math.max(0, Math.ceil(4 * (1 - f)))} s`));
    busy(false);
    if (!slouch) {
      // Bez drugiego kroku też działa – progi zostają domyślne.
      save(tall!);
      return;
    }
    const verdict = judgeCalibration(tall!, slouch);
    if (verdict.ok) {
      rg.set(1, 'OK');
      save({ ...tall!, slouch });
      return;
    }
    phase = 'verdict';
    rg.set(1, '!');
    title.textContent = 'Sprawdźmy jeszcze raz';
    lead.textContent = verdict.warning ?? '';
    status.textContent = '';
    go.textContent = 'Powtórz kalibrację';
    cancel.textContent = 'Zapisz mimo to';
  };

  go.addEventListener('click', () => {
    if (phase === 'tall') void runTall();
    else if (phase === 'slouch') void runSlouch();
    else {
      phase = 'tall';
      tall = null;
      title.textContent = 'Krok 1 z 2: usiądź najprościej, jak umiesz';
      lead.textContent = 'Usiądź głęboko, unieś mostek, cofnij brodę. Licznik idzie tylko wtedy, gdy postawa jest poprawna.';
      steps.hidden = false;
      rg.set(0, '5 s');
      cancel.textContent = 'Później';
      void runTall();
    }
  });
  cancel.addEventListener('click', () => {
    if (phase === 'tall') close();
    else if (phase === 'slouch') save(tall!);
    else save({ ...tall!, slouch: slouch! });
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
