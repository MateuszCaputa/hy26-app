// Widok „Statystyki”: dwie zakładki (Postawa / Zmęczenie), same proste słupki, mało tekstu. Kolor słupka = ocena (zielony dobrze, bursztynowy do poprawy).
import type { AppCtx } from '../app';
import type { IssueId, StatsPayload } from '../../shared/types';
import { h } from '../dom';
import { ISSUE_LABEL } from '../../core/coach';

const DAYS = ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'];

type MetricId = 'posture' | 'fatigue';
type Day = StatsPayload['last7'][number];

interface Metric {
  label: string;
  key: 'posture' | 'fatigue';
  /** Czy wartość jest w dobrej strefie (kolor słupka). */
  good: (v: number) => boolean;
  unit: string;
  week: (d: Day) => number | null;
  weekUnit: string;
  weekGood: (v: number) => boolean;
}

const METRICS: Record<MetricId, Metric> = {
  posture: {
    label: 'Postawa',
    key: 'posture',
    good: (v) => v >= 80,
    unit: '',
    week: (d) => d.goodPercent,
    weekUnit: '%',
    weekGood: (v) => v >= 80,
  },
  fatigue: {
    label: 'Zmęczenie',
    key: 'fatigue',
    good: (v) => v < 40,
    unit: '%',
    week: (d) => d.avgFatigue,
    weekUnit: '%',
    weekGood: (v) => v < 40,
  },
};

const METRIC_KEY = 'postura.stats.metric';
function loadMetric(): MetricId {
  try {
    return localStorage.getItem(METRIC_KEY) === 'fatigue' ? 'fatigue' : 'posture';
  } catch {
    return 'posture';
  }
}
function saveMetric(m: MetricId): void {
  try {
    localStorage.setItem(METRIC_KEY, m);
  } catch {
    /* tylko wygoda: bez pamięci startujemy od „Postawa” */
  }
}

export async function renderStats(view: HTMLElement, ctx: AppCtx): Promise<void> {
  const head = h('div', { class: 'page-head' }, h('h1', null, 'Statystyki'));
  const page = h('div', { class: 'page stats' }, head, h('p', { class: 'fine' }, 'Wczytuję…'));
  view.append(page);
  let st: StatsPayload | null = null;
  try {
    st = (await window.postura?.getStats()) ?? null;
  } catch {
    st = null;
  }
  page.lastElementChild?.remove();
  if (!st || st.daysOfData === 0) {
    page.append(
      h('div', { class: 'empty' },
        h('p', null, 'Nie ma jeszcze danych. Pierwsze wyniki pojawią się po kilku minutach pracy.'),
        h('button', { class: 'btn', onclick: () => ctx.navigate('live') }, 'Przejdź do podglądu'),
      ),
    );
    return;
  }
  const data = st;

  // Zakładki: każda pokazuje tylko swoją część (Postawa albo Zmęczenie).
  const body = h('div', { class: 'stats-body' });
  let metric = loadMetric();
  const draw = () => body.replaceChildren(...(metric === 'posture' ? postureTab(data) : fatigueTab(data)));
  const seg = h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Statystyki' },
    (Object.keys(METRICS) as MetricId[]).map((id) =>
      h('button', {
        type: 'button',
        role: 'tab',
        'data-metric': id,
        'aria-selected': String(id === metric),
        onclick: () => {
          metric = id;
          saveMetric(id);
          seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.metric === id)));
          draw();
        },
      }, METRICS[id].label),
    ),
  );
  head.append(seg);
  draw();
  page.append(body);
}

function postureTab(st: StatsPayload): HTMLElement[] {
  const t = st.today;
  const y = st.yesterday;
  const m = METRICS.posture;
  return [
    h('section', { class: 'block' }, h('h2', null, 'Dziś'),
      h('div', { class: 'figs' },
        fig(pct(t.goodPercent), 'dobra postawa', delta(t.goodPercent, y?.goodPercent, true)),
        fig(t.avgPosture === null ? '–' : String(t.avgPosture), 'średni wynik', delta(t.avgPosture, y?.avgPosture, true)),
        fig(String(t.alerts), 'alerty', null),
      ),
      todayChart(st, m)),
    h('section', { class: 'block' }, h('h2', null, '7 dni'), weekChart(st, m)),
    issuesSection(st),
  ];
}

function fatigueTab(st: StatsPayload): HTMLElement[] {
  const t = st.today;
  const y = st.yesterday;
  const m = METRICS.fatigue;
  // BHP przy monitorze: co najmniej 5 min przerwy po każdej godzinie pracy.
  const breaksDue = Math.floor(t.presentMinutes / 60);
  return [
    h('section', { class: 'block' }, h('h2', null, 'Dziś'),
      h('div', { class: 'figs' },
        fig(pct(t.avgFatigue), 'zmęczenie', delta(t.avgFatigue, y?.avgFatigue, false)),
        fig(String(t.breaksTaken), breaksDue ? `przerwy · min. ${breaksDue}` : 'przerwy', null,
          breaksDue ? `Zalecane co najmniej ${breaksDue} (5 min po każdej godzinie przy monitorze)` : undefined),
        fig(`${Math.floor(t.presentMinutes / 60)}:${String(t.presentMinutes % 60).padStart(2, '0')}`, 'przy biurku', null),
      ),
      todayChart(st, m)),
    h('section', { class: 'block' }, h('h2', null, '7 dni'), weekChart(st, m)),
    formSection(st),
  ];
}

/** Strzałka zmiany względem wczoraj (kolor = czy to dobrze); pełny opis w podpowiedzi. */
function delta(now: number | null, prev: number | null | undefined, higherIsBetter: boolean): HTMLElement | null {
  if (now === null || prev === null || prev === undefined) return null;
  const d = Math.round(now - prev);
  if (d === 0) return null;
  const good = d > 0 === higherIsBetter;
  return h('span', { class: `fig-delta ${good ? 'up' : 'down'}`, title: `${d > 0 ? '+' : '−'}${Math.abs(d)} względem wczoraj` }, `${d > 0 ? '↑' : '↓'}${Math.abs(d)}`);
}

const pct = (v: number | null) => (v === null ? '–' : `${v}%`);

function fig(val: string, label: string, extra: HTMLElement | null, title?: string): HTMLElement {
  return h('div', { class: 'fig', title }, h('span', { class: 'fig-val' }, val, extra), h('span', { class: 'fig-label' }, label));
}

interface Bar {
  label: string;
  value: number | null;
  /** Ton słupka: `good` / `warn` / `mute`. */
  tone: string;
  /** Pogrubiony podpis (np. dziś). */
  strong?: boolean;
}

/**
 * Prosty wykres słupkowy 0–100 bez siatki i osi Y: wartość nad słupkiem, podpis pod nim,
 * pełny opis po najechaniu albo Tab (obszar trafienia = cały pas słupka).
 */
function barChart(bars: Bar[], unit: string, aria: string, showValues = true): HTMLElement {
  const n = Math.max(bars.length, 1);
  // Stała szerokość: wszystkie wykresy mają tę samą skalę napisów niezależnie od liczby słupków.
  const W = 560, H = 150, T = showValues ? 20 : 6, B = 24;
  const band = W / n;
  const bw = Math.min(36, band * 0.6);
  const base = H - B;
  const Y = (v: number) => T + (1 - Math.max(0, Math.min(100, v)) / 100) * (base - T);

  let svg = `<line x1="0" x2="${W}" y1="${base}" y2="${base}" class="base"/>`;
  bars.forEach((b, i) => {
    const x = band * i + (band - bw) / 2;
    const cx = (x + bw / 2).toFixed(1);
    svg += `<text x="${cx}" y="${H - 6}" text-anchor="middle" class="axis${b.strong ? ' axis-today' : ''}">${b.label}</text>`;
    if (b.value === null) return;
    const top = Math.min(Y(b.value), base - 2);
    const r = Math.min(5, base - top);
    svg += `<path d="M${x} ${base} V${top + r} Q${x} ${top} ${x + r} ${top} H${x + bw - r} Q${x + bw} ${top} ${x + bw} ${top + r} V${base} Z" class="bar bar-${b.tone}" data-i="${i}"/>`;
    if (showValues) svg += `<text x="${cx}" y="${top - 6}" text-anchor="middle" class="bar-num">${Math.round(b.value)}</text>`;
  });

  const holder = h('div', { class: 'col-plot' });
  holder.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}">${svg}</svg>`;
  const svgEl = holder.querySelector('svg')!;
  const tip = h('div', { class: 'col-tip', role: 'status' });
  const show = (i: number) => {
    const b = bars[i];
    tip.replaceChildren(h('strong', null, b.value === null ? 'brak danych' : `${Math.round(b.value)}${unit}`), h('span', null, b.label));
    tip.style.left = `${((band * i + band / 2) / W) * 100}%`;
    tip.classList.add('on');
    svgEl.querySelectorAll('.bar').forEach((p) => p.classList.toggle('hover', p.getAttribute('data-i') === String(i)));
  };
  const hide = () => {
    tip.classList.remove('on');
    svgEl.querySelectorAll('.bar.hover').forEach((p) => p.classList.remove('hover'));
  };
  bars.forEach((b, i) => {
    svgEl.insertAdjacentHTML('beforeend', `<rect x="${band * i}" y="0" width="${band}" height="${base}" class="col-hit" tabindex="0" data-i="${i}" aria-label="${b.label}: ${b.value === null ? 'brak danych' : `${Math.round(b.value)}${unit}`}"/>`);
  });
  svgEl.querySelectorAll<SVGRectElement>('.col-hit').forEach((hit) => {
    const i = Number(hit.dataset.i);
    hit.addEventListener('pointerenter', () => show(i));
    hit.addEventListener('focus', () => show(i));
    hit.addEventListener('pointerleave', hide);
    hit.addEventListener('blur', hide);
  });
  holder.append(tip);
  return h('figure', { class: 'chart bar-chart' }, holder);
}

/** Dziś: średnia metryki w każdej godzinie pracy (min. 5 min obecności). */
function todayChart(st: StatsPayload, m: Metric): HTMLElement {
  const byHour = new Map<number, { sum: number; n: number }>();
  for (const s of st.today.minutes) {
    const v = s[m.key];
    if (s.present < 0.5 || v === null) continue;
    const hr = new Date(s.ts).getHours();
    const acc = byHour.get(hr) ?? { sum: 0, n: 0 };
    acc.sum += v;
    acc.n++;
    byHour.set(hr, acc);
  }
  const hours = [...byHour.entries()].filter(([, a]) => a.n >= 5).sort((a, b) => a[0] - b[0]);
  if (!hours.length) return h('p', { class: 'fine' }, 'Dziś jeszcze brak pomiarów.');
  const bars: Bar[] = hours.map(([hr, a]) => {
    const v = a.sum / a.n;
    return { label: `${hr}:00`, value: v, tone: m.good(v) ? 'good' : 'warn' };
  });
  return barChart(bars, m.unit, `${m.label} dziś, godzina po godzinie`);
}

function weekChart(st: StatsPayload, m: Metric): HTMLElement {
  const w = st.last7;
  if (w.filter((d) => d.presentMinutes > 0).length < 2) return h('p', { class: 'fine' }, 'Wykres pojawi się po dwóch dniach pomiarów.');
  const bars: Bar[] = w.map((d, i) => {
    const v = m.week(d);
    const today = i === w.length - 1;
    return { label: today ? 'dziś' : DAYS[d.weekday], value: v, tone: v === null ? 'mute' : m.weekGood(v) ? 'good' : 'warn', strong: today };
  });
  return barChart(bars, m.weekUnit, `${m.label}, ostatnie 7 dni`);
}

/** Godziny formy: średnia forma w danej godzinie ze wszystkich dni (ważona minutami); najlepsze na zielono, najsłabsze na bursztynowo. */
function formSection(st: StatsPayload): HTMLElement {
  const sec = h('section', { class: 'block' }, h('h2', null, 'Godziny formy'));
  const byHour = new Map<number, { sum: number; min: number }>();
  for (const c of st.heatmap) {
    const acc = byHour.get(c.hour) ?? { sum: 0, min: 0 };
    acc.sum += c.form * c.minutes;
    acc.min += c.minutes;
    byHour.set(c.hour, acc);
  }
  const hours = [...byHour.entries()].filter(([, a]) => a.min > 0).sort((a, b) => a[0] - b[0]).map(([hr, a]) => ({ hr, v: a.sum / a.min }));
  if (hours.length < 2) {
    sec.append(h('p', { class: 'fine' }, 'Pojawi się po kilku godzinach pracy.'));
    return sec;
  }
  const max = Math.max(...hours.map((x) => x.v));
  const min = Math.min(...hours.map((x) => x.v));
  const bars: Bar[] = hours.map((x) => ({
    label: String(x.hr),
    value: x.v,
    tone: max - x.v <= 5 ? 'good' : x.v - min <= 5 ? 'warn' : 'mute',
  }));
  if (st.bestHours) sec.append(h('p', { class: 'stat-hint' }, `Najlepiej ${st.bestHours}`));
  sec.append(barChart(bars, '/100', 'Forma w kolejnych godzinach dnia', false));
  return sec;
}

function issuesSection(st: StatsPayload): HTMLElement {
  const sec = h('section', { class: 'block' }, h('h2', null, 'Co poprawić'));
  const entries = (Object.entries(st.weekIssueShare) as [IssueId, number][]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!entries.length) {
    sec.append(h('p', { class: 'fine' }, 'Brak powtarzających się problemów. Dobra robota.'));
    return sec;
  }
  sec.append(
    h('ul', { class: 'bars', title: 'Udział w czasie ze złą postawą, ostatnie 7 dni' },
      entries.map(([k, v]) =>
        h('li', null,
          h('span', { class: 'bar-name' }, ISSUE_LABEL[k]),
          h('span', { class: 'bar-track' }, h('span', { class: 'bar-fill', style: `width:${v}%` })),
          h('span', { class: 'bar-val' }, `${v}%`),
        ),
      ),
    ),
  );
  return sec;
}
