// Widok „Statystyki”: dwie zakładki (Postawa / Zmęczenie) i wybór zakresu (dziś, 3 dni, 7 dni, miesiąc).
// Same proste słupki, mało tekstu. Kolor słupka = ocena (zielony dobrze, bursztynowy do poprawy).
import type { AppCtx } from '../app';
import type { IssueId, StatsPayload } from '../../shared/types';
import { h } from '../dom';
import { ISSUE_LABEL } from '../../core/coach';

const DAYS = ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'];
const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

type TabId = 'posture' | 'fatigue';
type RangeId = 'today' | '3' | '7' | '30';
type Day = StatsPayload['last30'][number];

const TABS: Record<TabId, string> = { posture: 'Postawa', fatigue: 'Zmęczenie' };
const RANGES: Record<RangeId, string> = { today: 'Dziś', '3': 'Ostatnie 3 dni', '7': 'Ostatnie 7 dni', '30': 'Ostatni miesiąc' };

// Dobra strefa (kolor słupka): postawa 80+, zmęczenie poniżej 40%.
const goodPosture = (v: number) => v >= 80;
const lowFatigue = (v: number) => v < 40;

/** Pamięć wyboru (zakładka, zakres) tylko dla wygody; bez niej startujemy od domyślnych. */
function load<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: string): void {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* bez pamięci też działa */
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

  let tab = load<TabId>('postura.stats.metric', ['posture', 'fatigue'], 'posture');
  let range = load<RangeId>('postura.stats.range', ['today', '3', '7', '30'], 'today');
  const body = h('div', { class: 'stats-body' });

  // Zakres zamiast nagłówka „Dziś”: select wygląda jak nagłówek sekcji.
  const select = h('select', {
    class: 'range-select',
    'aria-label': 'Zakres',
    onchange: (e: Event) => {
      range = (e.target as HTMLSelectElement).value as RangeId;
      save('postura.stats.range', range);
      draw();
    },
  }, (Object.keys(RANGES) as RangeId[]).map((id) => h('option', { value: id, selected: id === range }, RANGES[id])));

  const draw = () => body.replaceChildren(...(tab === 'posture' ? postureTab(data, range, select) : fatigueTab(data, range, select)));
  const seg = h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Statystyki' },
    (Object.keys(TABS) as TabId[]).map((id) =>
      h('button', {
        type: 'button',
        role: 'tab',
        'data-tab': id,
        'aria-selected': String(id === tab),
        onclick: () => {
          tab = id;
          save('postura.stats.metric', id);
          seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === id)));
          draw();
        },
      }, TABS[id]),
    ),
  );
  head.append(seg);
  draw();
  page.append(body);
}

/** Dni z wybranego zakresu (od najstarszego). */
const daysOf = (st: StatsPayload, range: Exclude<RangeId, 'today'>) => st.last30.slice(-Number(range));

/** Średnia ważona minutami przy biurku (dni bez danych pomijamy). */
function weighted(days: Day[], pick: (d: Day) => number | null): number | null {
  let sum = 0;
  let w = 0;
  for (const d of days) {
    const v = pick(d);
    if (v === null || !d.presentMinutes) continue;
    sum += v * d.presentMinutes;
    w += d.presentMinutes;
  }
  return w ? Math.round(sum / w) : null;
}

function postureTab(st: StatsPayload, range: RangeId, select: HTMLElement): HTMLElement[] {
  const t = st.today;
  const y = st.yesterday;
  let figs: HTMLElement;
  let chart: HTMLElement;
  if (range === 'today') {
    figs = h('div', { class: 'figs' },
      fig(pct(t.goodPercent), 'dobra postawa', delta(t.goodPercent, y?.goodPercent, true)),
      fig(t.avgPosture === null ? '–' : String(t.avgPosture), 'średni wynik', delta(t.avgPosture, y?.avgPosture, true)),
      fig(String(t.alerts), 'alerty', null),
    );
    chart = hourChart(st, 'posture', goodPosture, '', 'Postawa dziś, godzina po godzinie');
  } else {
    const days = daysOf(st, range);
    const avgScore = weighted(days, (d) => d.avgPosture);
    figs = h('div', { class: 'figs' },
      fig(pct(weighted(days, (d) => d.goodPercent)), 'dobra postawa', null),
      fig(avgScore === null ? '–' : String(avgScore), 'średni wynik', null),
      fig(String(days.reduce((a, d) => a + d.alerts, 0)), 'alerty', null),
    );
    chart = dayChart(days, (d) => d.goodPercent, goodPosture, '%', `Czas w dobrej postawie, ${RANGES[range].toLowerCase()}`);
  }
  return [h('section', { class: 'block' }, select, figs, chart), issuesSection(st)];
}

function fatigueTab(st: StatsPayload, range: RangeId, select: HTMLElement): HTMLElement[] {
  const t = st.today;
  const y = st.yesterday;
  let figs: HTMLElement;
  let chart: HTMLElement;
  if (range === 'today') {
    figs = h('div', { class: 'figs' },
      fig(pct(t.avgFatigue), 'zmęczenie', delta(t.avgFatigue, y?.avgFatigue, false)),
      breaksFig(t.breaksTaken, Math.floor(t.presentMinutes / 60)),
      fig(fmtDesk(t.presentMinutes), 'przy biurku', null),
    );
    const pts = hourBars(st, 'fatigue', lowFatigue);
    chart = pts ? lineChart(pts, '%', 'Zmęczenie dziś, godzina po godzinie') : h('p', { class: 'fine' }, 'Dziś jeszcze brak pomiarów.');
  } else {
    const days = daysOf(st, range);
    const present = days.reduce((a, d) => a + d.presentMinutes, 0);
    figs = h('div', { class: 'figs' },
      fig(pct(weighted(days, (d) => d.avgFatigue)), 'zmęczenie', null),
      // BHP liczone dzień po dniu: 5 min przerwy po każdej pełnej godzinie pracy danego dnia.
      breaksFig(days.reduce((a, d) => a + d.breaks, 0), days.reduce((a, d) => a + Math.floor(d.presentMinutes / 60), 0)),
      fig(fmtDesk(present), 'przy biurku', null),
    );
    const pts = dayBars(days, (d) => d.avgFatigue, lowFatigue);
    chart = pts ? lineChart(pts, '%', `Zmęczenie, ${RANGES[range].toLowerCase()}`) : h('p', { class: 'fine' }, 'Brak pomiarów w tym okresie.');
  }
  // Jeden wykres + jedno zdanie o godzinach formy (drugi wykres pokazywał to samo odwrócone).
  return [h('section', { class: 'block' }, select, figs, chart, formLine(st))];
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

/** Czas przy biurku: „7:56” do 10 h, potem pełne godziny („52 h”). */
const fmtDesk = (m: number) => (m >= 600 ? `${Math.round(m / 60)} h` : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`);

function fig(val: string, label: string, extra: HTMLElement | null, title?: string): HTMLElement {
  return h('div', { class: 'fig', title }, h('span', { class: 'fig-val' }, val, extra), h('span', { class: 'fig-label' }, label));
}

/** Przerwy z minimum BHP (5 min po każdej godzinie przy monitorze). */
function breaksFig(taken: number, due: number): HTMLElement {
  return fig(String(taken), due ? `przerwy · min. ${due}` : 'przerwy', null,
    due ? `Zalecane co najmniej ${due} (5 min po każdej godzinie przy monitorze)` : undefined);
}

interface Bar {
  label: string;
  /** Pełny podpis w podpowiedzi (gdy pod słupkiem jest skrót albo nic). */
  tip?: string;
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
    if (b.label) svg += `<text x="${cx}" y="${H - 6}" text-anchor="middle" class="axis${b.strong ? ' axis-today' : ''}">${b.label}</text>`;
    if (b.value === null) return;
    const top = Math.min(Y(b.value), base - 2);
    const r = Math.min(bw / 4, 5, base - top);
    svg += `<path d="M${x} ${base} V${top + r} Q${x} ${top} ${x + r} ${top} H${x + bw - r} Q${x + bw} ${top} ${x + bw} ${top + r} V${base} Z" class="bar bar-${b.tone}" data-i="${i}"/>`;
    if (showValues) svg += `<text x="${cx}" y="${top - 6}" text-anchor="middle" class="bar-num">${Math.round(b.value)}</text>`;
  });

  const holder = h('div', { class: 'col-plot' });
  holder.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}">${svg}</svg>`;
  const svgEl = holder.querySelector('svg')!;
  const tip = h('div', { class: 'col-tip', role: 'status' });
  const valueText = (b: Bar) => (b.value === null ? 'brak danych' : `${Math.round(b.value)}${unit}`);
  const show = (i: number) => {
    const b = bars[i];
    tip.replaceChildren(h('strong', null, valueText(b)), h('span', null, b.tip ?? b.label));
    tip.style.left = `${((band * i + band / 2) / W) * 100}%`;
    tip.classList.add('on');
    svgEl.querySelectorAll('.bar').forEach((p) => p.classList.toggle('hover', p.getAttribute('data-i') === String(i)));
  };
  const hide = () => {
    tip.classList.remove('on');
    svgEl.querySelectorAll('.bar.hover').forEach((p) => p.classList.remove('hover'));
  };
  bars.forEach((b, i) => {
    svgEl.insertAdjacentHTML('beforeend', `<rect x="${band * i}" y="0" width="${band}" height="${base}" class="col-hit" tabindex="0" data-i="${i}" aria-label="${b.tip ?? b.label}: ${valueText(b)}"/>`);
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
function hourChart(st: StatsPayload, key: 'posture' | 'fatigue', good: (v: number) => boolean, unit: string, aria: string): HTMLElement {
  const bars = hourBars(st, key, good);
  return bars ? barChart(bars, unit, aria) : h('p', { class: 'fine' }, 'Dziś jeszcze brak pomiarów.');
}

function hourBars(st: StatsPayload, key: 'posture' | 'fatigue', good: (v: number) => boolean): Bar[] | null {
  const byHour = new Map<number, { sum: number; n: number }>();
  for (const s of st.today.minutes) {
    const v = s[key];
    if (s.present < 0.5 || v === null) continue;
    const hr = new Date(s.ts).getHours();
    const acc = byHour.get(hr) ?? { sum: 0, n: 0 };
    acc.sum += v;
    acc.n++;
    byHour.set(hr, acc);
  }
  const hours = [...byHour.entries()].filter(([, a]) => a.n >= 5).sort((a, b) => a[0] - b[0]);
  if (!hours.length) return null;
  return hours.map(([hr, a]) => {
    const v = a.sum / a.n;
    return { label: `${hr}:00`, value: v, tone: good(v) ? 'good' : 'warn' };
  });
}

/** Zakres dni: jeden słupek na dzień. Przy miesiącu podpis co kilka dni, wartości tylko w podpowiedzi. */
function dayChart(days: Day[], pick: (d: Day) => number | null, good: (v: number) => boolean, unit: string, aria: string): HTMLElement {
  const bars = dayBars(days, pick, good);
  return bars ? barChart(bars, unit, aria, days.length <= 7) : h('p', { class: 'fine' }, 'Brak pomiarów w tym okresie.');
}

function dayBars(days: Day[], pick: (d: Day) => number | null, good: (v: number) => boolean): Bar[] | null {
  if (days.filter((d) => d.presentMinutes > 0).length === 0) return null;
  const long = days.length > 7;
  const last = days.length - 1;
  const bars: Bar[] = days.map((d, i) => {
    const v = d.presentMinutes ? pick(d) : null;
    const date = `${DAYS[d.weekday]} ${d.day} ${MONTHS[Number(d.date.slice(5, 7)) - 1]}`;
    const label = i === last ? 'dziś' : long ? ((last - i) % 5 === 0 ? String(d.day) : '') : DAYS[d.weekday];
    return { label, tip: i === last ? `dziś, ${date}` : date, value: v, tone: v === null ? 'mute' : good(v) ? 'good' : 'warn', strong: i === last };
  });
  return bars;
}

/** Próg „zmęczony” (ten sam co w `core/fatigue.ts`): przerywana linia odniesienia na wykresie zmęczenia. */
const FATIGUE_LINE = 40;

/**
 * Zmęczenie jako jedna cienka linia 0–100 z przerywanym progiem – spokojniej niż słupki.
 * Bez siatki i osi Y; po najechaniu: pionowa linia, kropka i dymek z wartością.
 */
function lineChart(points: Bar[], unit: string, aria: string): HTMLElement {
  const n = Math.max(points.length, 1);
  const W = 560, H = 132, T = 8, B = 24;
  const band = W / n;
  const base = H - B;
  const X = (i: number) => band * i + band / 2;
  const Y = (v: number) => T + (1 - Math.max(0, Math.min(100, v)) / 100) * (base - T);

  // Linia przerwana tam, gdzie brak danych (np. dzień bez pracy).
  let d = '';
  let area = '';
  let run: [number, number][] = [];
  const flush = () => {
    if (run.length > 1) {
      d += `M${run.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} `;
      area += `M${run[0][0].toFixed(1)} ${base} L${run.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} L${run[run.length - 1][0].toFixed(1)} ${base} Z `;
    }
    run = [];
  };
  points.forEach((p, i) => (p.value === null ? flush() : run.push([X(i), Y(p.value)])));
  flush();

  const yLine = Y(FATIGUE_LINE).toFixed(1);
  let svg = `<line x1="0" x2="${W}" y1="${base}" y2="${base}" class="base"/>`;
  svg += `<line x1="0" x2="${W}" y1="${yLine}" y2="${yLine}" class="ref"/>`;
  svg += `<text x="0" y="${Number(yLine) - 5}" text-anchor="start" class="axis">${FATIGUE_LINE}%</text>`;
  svg += `<path d="${area}" class="line-area"/><path d="${d}" class="line"/>`;
  // Pojedynczy punkt (np. jedna godzina) – bez linii, sama kropka.
  points.forEach((p, i) => {
    if (p.value !== null && (points[i - 1]?.value ?? null) === null && (points[i + 1]?.value ?? null) === null) {
      svg += `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.value).toFixed(1)}" r="3" class="line-dot-static"/>`;
    }
  });
  points.forEach((p, i) => {
    if (p.label) svg += `<text x="${X(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="axis${p.strong ? ' axis-today' : ''}">${p.label}</text>`;
  });
  svg += `<line class="cross" y1="${T}" y2="${base}" x1="0" x2="0"/><circle class="line-dot" r="4" cx="0" cy="0"/>`;

  const holder = h('div', { class: 'col-plot' });
  holder.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}">${svg}</svg>`;
  const svgEl = holder.querySelector('svg')!;
  const cross = svgEl.querySelector('.cross')!;
  const dot = svgEl.querySelector('.line-dot')!;
  const tip = h('div', { class: 'col-tip', role: 'status' });
  const valueText = (p: Bar) => (p.value === null ? 'brak danych' : `${Math.round(p.value)}${unit}`);
  const show = (i: number) => {
    const p = points[i];
    tip.replaceChildren(h('strong', null, valueText(p)), h('span', null, p.tip ?? p.label));
    tip.style.left = `${(X(i) / W) * 100}%`;
    tip.classList.add('on');
    const x = X(i).toFixed(1);
    cross.setAttribute('x1', x);
    cross.setAttribute('x2', x);
    svgEl.classList.add('hovering');
    if (p.value !== null) {
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', Y(p.value).toFixed(1));
    }
    svgEl.classList.toggle('no-dot', p.value === null);
  };
  const hide = () => {
    tip.classList.remove('on');
    svgEl.classList.remove('hovering');
  };
  points.forEach((p, i) => {
    svgEl.insertAdjacentHTML('beforeend', `<rect x="${band * i}" y="0" width="${band}" height="${base}" class="col-hit" tabindex="0" data-i="${i}" aria-label="${p.tip ?? p.label}: ${valueText(p)}"/>`);
  });
  svgEl.querySelectorAll<SVGRectElement>('.col-hit').forEach((hit) => {
    const i = Number(hit.dataset.i);
    hit.addEventListener('pointerenter', () => show(i));
    hit.addEventListener('focus', () => show(i));
    hit.addEventListener('pointerleave', hide);
    hit.addEventListener('blur', hide);
  });
  holder.append(tip);
  return h('figure', { class: 'chart line-chart' }, holder);
}

/** Godziny formy jednym zdaniem zamiast drugiego wykresu, np. „Najlepiej 9–11 · spadek ok. 14:00”. */
function formLine(st: StatsPayload): HTMLElement | null {
  const dip = st.dipText?.match(/ok\. (\d{1,2}:00)/)?.[1];
  const parts = [st.bestHours ? `Najlepiej ${st.bestHours}` : null, dip ? `spadek ok. ${dip}` : null].filter(Boolean);
  return parts.length ? h('p', { class: 'stat-hint' }, parts.join(' · ')) : null;
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
