// Mini-widget, zawsze na wierzchu, w dwóch wersjach (Ustawienia lub menu w zasobniku):
// „karta” – wynik, stan i zmęczenie; „pigułka” – sama liczba z kropką w kolorze stanu.
// Kliknięcie otwiera główne okno; przeciągnięcie przesuwa widget (pozycja zapamiętana).
import '../shared/api';
import type { LiveStatus } from '../shared/types';
import { tr } from '../shared/i18n';

const WORD: Record<string, string> = {
  good: tr('Prosto'),
  warn: tr('Popraw się'),
  bad: tr('Zła postawa'),
  absent: tr('Nie widzę Cię'),
  paused: tr('Pauza'),
};

const el = (id: string) => document.getElementById(id)!;
const pill = new URLSearchParams(location.search).get('style') === 'pill';
document.body.classList.toggle('pill', pill);
const box = el('widget');

// Przeciąganie w kodzie (region „drag” zjadałby kliknięcia): ruch > 3 px = przesuwanie, inaczej kliknięcie.
let drag: { sx: number; sy: number; wx: number; wy: number; moved: boolean } | null = null;
box.addEventListener('pointerdown', (e) => {
  box.setPointerCapture(e.pointerId);
  drag = { sx: e.screenX, sy: e.screenY, wx: window.screenX, wy: window.screenY, moved: false };
});
box.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.screenX - drag.sx;
  const dy = e.screenY - drag.sy;
  if (!drag.moved && Math.hypot(dx, dy) < 3) return;
  drag.moved = true;
  box.classList.add('dragging');
  window.postura.moveWidget(drag.wx + dx, drag.wy + dy, false);
});
box.addEventListener('pointerup', (e) => {
  if (!drag) return;
  if (drag.moved) window.postura.moveWidget(drag.wx + e.screenX - drag.sx, drag.wy + e.screenY - drag.sy, true);
  else window.postura.openMain('live');
  box.classList.remove('dragging');
  drag = null;
});

window.postura.onStatus((s: LiveStatus) => {
  box.dataset.state = s.state;
  const away = s.score === null || s.state === 'absent' || s.state === 'paused';
  el('w-score').textContent = away ? '–' : String(s.score);
  el('w-state').textContent = WORD[s.state] ?? '';
  el('w-sub').textContent = s.fatigue ? tr('zmęczenie {f}%', { f: s.fatigue.percent }) : '';
  box.title = `${tr('Postawa')} ${away ? '–' : `${s.score}/100`} · ${WORD[s.state] ?? ''}\n${tr('Kliknij: otwórz Upright · przeciągnij: przesuń')}`;
});
