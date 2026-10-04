// Widok „Statystyki”: dwie zakładki (Postawa / Zmęczenie) i wybór zakresu (dziś, 3 dni, 7 dni, miesiąc).
// Same proste słupki, mało tekstu. Kolor słupka = ocena (zielony dobrze, bursztynowy do poprawy).
import type { AppCtx } from '../app';
import type { IssueId, StatsPayload } from '../../shared/types';
import { h } from '../dom';
import { ISSUE_LABEL } from '../../core/coach';
import { getLang, tr } from '../../shared/i18n';

// Skróty dni i miesięcy w bieżącym języku (ta sama kolejność co wcześniej: od poniedziałku, od stycznia).
const EN_UI = getLang() === 'en';
const DAYS = EN_UI ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'];
const MONTHS = EN_UI
  ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  : ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

type TabId = 'posture' | 'fatigue';
type RangeId = 'today' | '3' | '7' | '30';
type Day = StatsPayload['last30'][number];

const TABS: Record<TabId, string> = { posture: tr('Postawa'), fatigue: tr('Zmęczenie') };
const RANGES: Record<RangeId, string> = { today: tr('Dziś'), '3': tr('Ostatnie 3 dni'), '7': tr('Ostatnie 7 dni'), '30': tr('Ostatni miesiąc') };

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
  const head = h('div', { class: 'page-head' }, h('h1', null, tr('Statystyki')));
  const page = h('div', { class: 'page stats' }, head, h('p', { class: 'fine' }, tr('Wczytuję…')));
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
        h('p', null, tr('Nie ma jeszcze danych. Pierwsze wyniki pojawią się po kilku minutach pracy.')),
        h('button', { class: 'btn', onclick: () => ctx.navigate('live') }, tr('Przejdź do podglądu')),
      ),
    );
    return;
  }
  const data = st;

  let tab = load<TabId>('postura.stats.metric', ['posture', 'fatigue'], 'posture');
  let range = load<RangeId>('postura.stats.range', ['today', '3', '7', '30'], 'today');
  const body = h('div', { class: 'stats-body' });

  // Zakres zamiast nagłówka „Dziś”. Własna lista zamiast <select>: natywna na macOS otwierała się nad przyciskiem
  // (system ustawia wybraną opcję na przycisku). Ta zawsze rozwija się pod nim.
  const label = h('span', null, RANGES[range]);
  const btn = h('button', { class: 'range-select', type: 'button', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': tr('Zakres') }, label);
  const menu = h('ul', { class: 'range-menu', role: 'listbox', hidden: true });
  const outside = (e: Event) => {
    if (!select.contains(e.target as Node)) close();
  };
  const close = () => {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside);
  };
  const open = () => {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', outside);
    menu.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  };
  btn.addEventListener('click', () => (menu.hidden ? open() : close()));
  // Kolejność wprost: klucze '3', '7', '30' wyglądają jak liczby, więc Object.keys stawiał „Dziś” na końcu.
  const ORDER: RangeId[] = ['today', '3', '7', '30'];
  for (const id of ORDER) {
    menu.append(h('li', null, h('button', {
      type: 'button',
      role: 'option',
      'data-id': id,
      'aria-selected': String(id === range),
      onclick: () => {
        range = id;
        save('postura.stats.range', range);
        label.textContent = RANGES[id];
        menu.querySelectorAll<HTMLElement>('[role="option"]').forEach((o) => o.setAttribute('aria-selected', String(o.dataset.id === id)));
        close();
        btn.focus();
        draw();
      },
    }, RANGES[id])));
  }
  const select = h('div', {
    class: 'range',
    onkeydown: (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !menu.hidden) {
        close();
        btn.focus();
      }
    },
  }, btn, menu);

  const draw = () => body.replaceChildren(...(tab === 'posture' ? postureTab(data, range, select) : fatigueTab(data, range, select)));
  const seg = h('div', { class: 'seg', role: 'tablist', 'aria-label': tr('Statystyki') },
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
      fig(pct(t.goodPercent), tr('dobra postawa'), delta(t.goodPercent, y?.goodPercent, true)),
      fig(t.avgPosture === null ? '–' : String(t.avgPosture), tr('średni wynik'), delta(t.avgPosture, y?.avgPosture, true)),
      fig(String(t.alerts), 'alerty', null),
    );
    chart = hourChart(st, 'posture', goodPosture, '', tr('Postawa dziś, godzina po godzinie'));
  } else {
    const days = daysOf(st, range);
    const avgScore = weighted(days, (d) => d.avgPosture);
    figs = h('div', { class: 'figs' },
      fig(pct(weighted(days, (d) => d.goodPercent)), tr('dobra postawa'), null),
      fig(avgScore === null ? '–' : String(avgScore), tr('średni wynik'), null),
      fig(String(days.reduce((a, d) => a + d.alerts, 0)), 'alerty', null),
    );
    chart = dayChart(days, (d) => d.goodPercent, goodPosture, '%', tr('Czas w dobrej postawie, {r}', { r: RANGES[range].toLowerCase() }));
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
      fig(pct(t.avgFatigue), tr('zmęczenie'), delta(t.avgFatigue, y?.avgFatigue, false)),
      breaksFig(t.breaksTaken, Math.floor(t.presentMinutes / 60)),
      fig(fmtDesk(t.presentMinutes), tr('przy biurku'), null),
    );
    chart = hourChart(st, 'fatigue', lowFatigue, '%', tr('Zmęczenie dziś, godzina po godzinie'));
  } else {
    const days = daysOf(st, range);
    const present = days.reduce((a, d) => a + d.presentMinutes, 0);
    figs = h('div', { class: 'figs' },
      fig(pct(weighted(days, (d) => d.avgFatigue)), tr('zmęczenie'), null),
      // BHP liczone dzień po dniu: 5 min przerwy po każdej pełnej godzinie pracy danego dnia.
      breaksFig(days.reduce((a, d) => a + d.breaks, 0), days.reduce((a, d) => a + Math.floor(d.presentMinutes / 60), 0)),
      fig(fmtDesk(present), tr('przy biurku'), null),
    );
    chart = dayChart(days, (d) => d.avgFatigue, lowFatigue, '%', tr('Zmęczenie, {r}', { r: RANGES[range].toLowerCase() }));
  }
  return [h('section', { class: 'block' }, select, figs, chart)];
}

/** Strzałka zmiany względem wczoraj (kolor = czy to dobrze); pełny opis w podpowiedzi. */
function delta(now: number | null, prev: number | null | undefined, higherIsBetter: boolean): HTMLElement | null {
  if (now === null || prev === null || prev === undefined) return null;
  const d = Math.round(now - prev);
  if (d === 0) return null;
  const good = d > 0 === higherIsBetter;
  return h('span', { class: `fig-delta ${good ? 'up' : 'down'}`, title: tr('{d} względem wczoraj', { d: `${d > 0 ? '+' : '−'}${Math.abs(d)}` }) }, `${d > 0 ? '↑' : '↓'}${Math.abs(d)}`);
}

const pct = (v: number | null) => (v === null ? '–' : `${v}%`);

/** Czas przy biurku: „7:56” do 10 h, potem pełne godziny („52 h”). */
const fmtDesk = (m: number) => (m >= 600 ? `${Math.round(m / 60)} h` : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`);

function fig(val: string, label: string, extra: HTMLElement | null, title?: string): HTMLElement {
  return h('div', { class: 'fig', title }, h('span', { class: 'fig-val' }, val, extra), h('span', { class: 'fig-label' }, label));
}

/** Przerwy z minimum BHP (5 min po każdej godzinie przy monitorze). */
function breaksFig(taken: number, due: number): HTMLElement {
  return fig(String(taken), due ? tr('przerwy · min. {n}', { n: due }) : tr('przerwy'), null,
    due ? tr('Zalecane co najmniej {n} (5 min po każdej godzinie przy monitorze)', { n: due }) : undefined);
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
  if (!hours.length) return h('p', { class: 'fine' }, tr('Dziś jeszcze brak pomiarów.'));
  const bars: Bar[] = hours.map(([hr, a]) => {
    const v = a.sum / a.n;
    return { label: `${hr}:00`, value: v, tone: good(v) ? 'good' : 'warn' };
  });
  return barChart(bars, unit, aria);
}

/** Zakres dni: jeden słupek na dzień. Przy miesiącu podpis co kilka dni, wartości tylko w podpowiedzi. */
function dayChart(days: Day[], pick: (d: Day) => number | null, good: (v: number) => boolean, unit: string, aria: string): HTMLElement {
  if (days.filter((d) => d.presentMinutes > 0).length === 0) return h('p', { class: 'fine' }, tr('Brak pomiarów w tym okresie.'));
  const long = days.length > 7;
  const last = days.length - 1;
  const bars: Bar[] = days.map((d, i) => {
    const v = d.presentMinutes ? pick(d) : null;
    const date = `${DAYS[d.weekday]} ${d.day} ${MONTHS[Number(d.date.slice(5, 7)) - 1]}`;
    const label = i === last ? tr('dziś') : long ? ((last - i) % 5 === 0 ? String(d.day) : '') : DAYS[d.weekday];
    return { label, tip: i === last ? tr('dziś, {d}', { d: date }) : date, value: v, tone: v === null ? 'mute' : good(v) ? 'good' : 'warn', strong: i === last };
  });
  return barChart(bars, unit, aria, !long);
}

function issuesSection(st: StatsPayload): HTMLElement {
  const sec = h('section', { class: 'block' }, h('h2', null, tr('Co poprawić')));
  const entries = (Object.entries(st.weekIssueShare) as [IssueId, number][]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!entries.length) {
    sec.append(h('p', { class: 'fine' }, tr('Brak powtarzających się problemów. Dobra robota.')));
    return sec;
  }
  sec.append(
    h('ul', { class: 'bars', title: tr('Udział w czasie ze złą postawą, ostatnie 7 dni') },
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
