// Mini-widget: mała „pigułka” z wynikiem postawy, zawsze na wierzchu. Kolor = stan postawy;
// przy dobrej postawie przygasa, żeby nie rozpraszać. Najechanie pokazuje Baterię, kliknięcie otwiera okno.
import '../shared/api';
import type { LiveStatus } from '../shared/types';

const WORD: Record<string, string> = {
  good: 'Prosto',
  warn: 'Popraw się',
  bad: 'Zła postawa',
  absent: 'Nie widzę Cię',
  paused: 'Pauza',
};

const el = (id: string) => document.getElementById(id)!;

el('w-open').addEventListener('click', () => window.postura.openMain('live'));

window.postura.onStatus((s: LiveStatus) => {
  const w = el('widget');
  w.dataset.state = s.state;
  el('w-score').textContent = s.score === null || s.state === 'absent' || s.state === 'paused' ? '–' : String(s.score);
  el('w-more').textContent = s.energy ? `${s.energy.percent}%` : s.fatigue ? `zm. ${s.fatigue.percent}%` : '';
  const parts = [`Postawa: ${WORD[s.state] ?? ''}`];
  if (s.energy) parts.push(`Bateria ${s.energy.percent}%`);
  if (s.fatigue) parts.push(`zmęczenie ${s.fatigue.percent}%`);
  w.title = `${parts.join(' · ')}\nKliknij liczbę, by otworzyć Posturę. Przeciągnij, by przesunąć.`;
});
