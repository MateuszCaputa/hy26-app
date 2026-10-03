// Mini-widget: mała „pigułka” z wynikiem postawy, zawsze na wierzchu. Kolor = stan postawy;
// przy dobrej postawie przygasa, żeby nie rozpraszać. Najechanie: opis liczb. Przeciągnij = przesuń, kliknij = otwórz okno.
import '../shared/api';
import type { LiveStatus } from '../shared/types';

const WORD: Record<string, string> = {
  good: 'prosto',
  warn: 'popraw się',
  bad: 'zła postawa',
  absent: 'nie widzę Cię',
  paused: 'pauza',
};

const el = (id: string) => document.getElementById(id)!;
const pill = el('widget');

// Przeciąganie w kodzie (region „drag” zjadałby kliknięcia): ruch > 3 px = przesuwanie, inaczej kliknięcie.
let drag: { sx: number; sy: number; wx: number; wy: number; moved: boolean } | null = null;
pill.addEventListener('pointerdown', (e) => {
  pill.setPointerCapture(e.pointerId);
  drag = { sx: e.screenX, sy: e.screenY, wx: window.screenX, wy: window.screenY, moved: false };
});
pill.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.screenX - drag.sx;
  const dy = e.screenY - drag.sy;
  if (!drag.moved && Math.hypot(dx, dy) < 3) return;
  drag.moved = true;
  pill.classList.add('dragging');
  window.postura.moveWidget(drag.wx + dx, drag.wy + dy, false);
});
pill.addEventListener('pointerup', (e) => {
  if (!drag) return;
  if (drag.moved) window.postura.moveWidget(drag.wx + e.screenX - drag.sx, drag.wy + e.screenY - drag.sy, true);
  else window.postura.openMain('live');
  pill.classList.remove('dragging');
  drag = null;
});

window.postura.onStatus((s: LiveStatus) => {
  pill.dataset.state = s.state;
  const away = s.score === null || s.state === 'absent' || s.state === 'paused';
  el('w-score').textContent = away ? '–' : String(s.score);
  el('w-more').textContent = away ? WORD[s.state] ?? '' : `postawa · ${s.energy ? `bateria ${s.energy.percent}%` : WORD[s.state] ?? ''}`;
  const parts = [`Postawa ${away ? '–' : s.score}/100 (${WORD[s.state] ?? ''})`];
  if (s.energy) parts.push(`Bateria (energia) ${s.energy.percent}%`);
  if (s.fatigue) parts.push(`Zmęczenie ${s.fatigue.percent}%`);
  pill.title = `${parts.join('\n')}\n\nKliknij: otwórz Posturę · przeciągnij: przesuń`;
});
