// „Dlaczego X%?” pod wskaźnikiem zmęczenia (A3, M3): sześć składowych z wagami, bieżącą wartością i normą,
// żeby każdy (także jury) widział, z czego bierze się wynik. Pasek = kara 0–1 danej składowej.
import type { FatigueSnapshot } from '../shared/types';
import { FATIGUE_WEIGHTS } from '../core/fatigue';
import { h } from './dom';

type Key = keyof typeof FATIGUE_WEIGHTS;

/** Kolejność = waga, od największej. Norma = zakres, w którym składowa nie podnosi zmęczenia (core/fatigue.ts). */
const ROWS: { key: Key; name: string; norm: string; value: (f: FatigueSnapshot) => string | null }[] = [
  { key: 'perclos', name: 'Przymknięte oczy', norm: 'norma < 5% czasu', value: (f) => (f.perclos === null ? null : `${Math.round(f.perclos * 100)}% czasu`) },
  { key: 'blink', name: 'Mruganie', norm: 'norma 4–28/min', value: (f) => (f.blinkRate === null ? null : `${Math.round(f.blinkRate)}/min`) },
  { key: 'long', name: 'Długie mrugnięcia', norm: 'norma 0', value: (f) => (f.longBlinksPerMin === null ? null : `${+f.longBlinksPerMin.toFixed(1)}/min`) },
  { key: 'posture', name: 'Postawa (15 min)', norm: 'norma 80+', value: (f) => (f.postureAvg15 == null ? null : `${Math.round(f.postureAvg15)}/100`) },
  { key: 'yawn', name: 'Ziewanie', norm: 'norma 0', value: (f) => `${f.yawns10m} w 10 min` },
  { key: 'time', name: 'Bez przerwy', norm: 'do 20 min bez wpływu', value: (f) => (f.minutesSinceBreak == null ? null : `${Math.round(f.minutesSinceBreak)} min`) },
];

export function fatigueWhy(): { el: HTMLElement; update: (f: FatigueSnapshot | null) => void } {
  const summary = h('summary', null, 'Dlaczego tyle?');
  const rows = ROWS.map((r) => {
    const val = h('span', { class: 'why-val' }, '–');
    const fill = h('span', { class: 'why-fill' });
    const li = h('li', { class: 'why-row' },
      h('span', { class: 'why-name' }, r.name, h('span', { class: 'why-w' }, ` · waga ${Math.round(FATIGUE_WEIGHTS[r.key] * 100)}%`)),
      val,
      h('span', { class: 'why-bar', title: r.norm }, fill),
      h('span', { class: 'why-norm' }, r.norm),
    );
    return { r, val, fill, li };
  });
  const el = h('details', { class: 'why' }, summary,
    h('ul', { class: 'why-list' }, rows.map((x) => x.li)),
    h('p', { class: 'why-foot' }, 'Pasek = jak bardzo składowa podnosi zmęczenie. Brak danych = jej waga przechodzi na pozostałe.'),
  );
  return {
    el,
    update: (f) => {
      el.hidden = !f?.components;
      if (!f?.components) return;
      summary.textContent = `Dlaczego ${f.percent}%?${f.simulated ? ' (symulacja)' : ''}`;
      for (const { r, val, fill, li } of rows) {
        const c = f.components[r.key];
        const v = r.value(f);
        li.dataset.missing = String(c === null);
        val.textContent = c === null || v === null ? 'brak danych' : v;
        fill.style.width = `${Math.round((c ?? 0) * 100)}%`;
        li.dataset.level = c === null ? '' : c >= 0.66 ? 'bad' : c >= 0.33 ? 'warn' : 'ok';
      }
    },
  };
}
