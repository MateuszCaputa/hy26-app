// Mini-widget: wynik postawy i zmęczenie zawsze na wierzchu.
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

window.postura.onStatus((s: LiveStatus) => {
  el('widget').dataset.state = s.state;
  el('w-score').textContent = s.score === null ? '–' : String(s.score);
  el('w-state').textContent = WORD[s.state] ?? '';
  el('w-sub').textContent = s.fatigue ? `zmęczenie ${s.fatigue.percent}%` : '';
});
