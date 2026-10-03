// Podpowiedź w rogu ekranu: krótka, spokojna, sama znika. Nie kradnie fokusu (okno focusable: false).
// - oczy (20-20-20): odliczanie 20 s, na koniec „Dzięki” i zaliczona przerwa dla oczu,
// - przerwa: [Start] / [Za 5 min], bez reakcji znika po 30 s,
// - postawa: znika, gdy postawa wróci do normy, albo po 15 s.
// Zawsze jest małe „×” (Pomiń) dla kogoś, kto jest skupiony.
import '../shared/api';
import type { LiveStatus, Nudge, NudgeAction } from '../shared/types';

const el = (id: string) => document.getElementById(id)!;
const box = el('nudge');
const RING = 2 * Math.PI * 17;
const AUTO_HIDE_S: Record<Nudge['kind'], number> = { eye: 0, break: 30, posture: 15 };

let current: Nudge | null = null;
let timer = 0;
let raf = 0;

function close(action: NudgeAction): void {
  if (!current) return;
  current = null;
  clearTimeout(timer);
  cancelAnimationFrame(raf);
  box.classList.remove('show');
  // Najpierw łagodne zniknięcie, potem informacja dla głównego procesu (schowa okno).
  timer = window.setTimeout(() => window.postura.nudgeAction(action), 350);
}

function button(label: string, action: NudgeAction, primary = false): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = primary ? 'n-btn primary' : 'n-btn';
  b.textContent = label;
  b.addEventListener('click', () => close(action));
  return b;
}

/** Cienki pasek u dołu: ile zostało do zniknięcia (zamiast mrugania). */
function runTimeline(seconds: number, onEnd: () => void): void {
  const line = el('n-timeline');
  const t0 = performance.now();
  const step = (now: number) => {
    const f = Math.min(1, (now - t0) / (seconds * 1000));
    line.style.transform = `scaleX(${1 - f})`;
    if (f < 1) raf = requestAnimationFrame(step);
    else onEnd();
  };
  raf = requestAnimationFrame(step);
}

function runCountdown(seconds: number): void {
  const fill = el('n-fill') as unknown as SVGCircleElement;
  const sec = el('n-sec');
  fill.style.strokeDasharray = String(RING);
  const t0 = performance.now();
  const step = (now: number) => {
    const elapsed = (now - t0) / 1000;
    const left = Math.max(0, seconds - elapsed);
    fill.style.strokeDashoffset = String(RING * (elapsed / seconds));
    sec.textContent = String(Math.ceil(left));
    if (left > 0) raf = requestAnimationFrame(step);
    else {
      el('n-title').textContent = 'Dzięki, oczy odpoczęły';
      el('n-body').textContent = 'Wracam do obserwacji.';
      sec.textContent = '✓';
      timer = window.setTimeout(() => close('eye-done'), 1800);
    }
  };
  raf = requestAnimationFrame(step);
}

window.postura.onNudge((n: Nudge) => {
  clearTimeout(timer);
  cancelAnimationFrame(raf);
  current = n;
  box.dataset.kind = n.kind;
  box.dataset.from = n.from ?? 'below';
  el('n-title').textContent = n.title;
  el('n-body').textContent = n.body;
  const actions = el('n-actions');
  actions.replaceChildren();
  if (n.kind === 'break') actions.append(button('Start', 'start', true), button('Za 5 min', 'snooze'));

  const ring = el('n-ring');
  ring.hidden = !n.seconds;
  el('n-timeline').style.transform = 'scaleX(1)';
  if (n.seconds) runCountdown(n.seconds);
  else runTimeline(AUTO_HIDE_S[n.kind] || 20, () => close('dismiss'));
  requestAnimationFrame(() => box.classList.add('show'));
});

// Podpowiedź o postawie znika sama, gdy się poprawisz.
window.postura.onStatus((s: LiveStatus) => {
  if (current?.kind === 'posture' && s.state === 'good') close('dismiss');
});

el('n-close').addEventListener('click', () => close('dismiss'));
