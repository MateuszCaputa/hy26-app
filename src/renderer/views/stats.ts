// Widok „Statystyki”: dzisiejszy dzień, godziny formy, co poprawić na stałe.
import type { AppCtx } from '../app';
import type { IssueId, MinuteSample, StatsPayload } from '../../shared/types';
import { h, plural } from '../dom';
import { ERGONOMIC_TIP, ISSUE_LABEL } from '../../core/coach';

const DAYS = ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'];

export async function renderStats(view: HTMLElement, ctx: AppCtx): Promise<void> {
  const page = h('div', { class: 'page stats' }, h('h1', null, 'Statystyki'), h('p', { class: 'fine' }, 'Wczytuję…'));
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
        h('p', null, 'Nie ma jeszcze danych. Pierwsze wyniki pojawią się po kilku minutach pracy z włączoną analizą.'),
        h('button', { class: 'btn', onclick: () => ctx.navigate('live') }, 'Przejdź do podglądu'),
      ),
    );
    return;
  }
  page.append(todaySection(st), formSection(st), issuesSection(st));
}

function figure(value: string, label: string): HTMLElement {
  return h('div', { class: 'fig' }, h('span', { class: 'fig-val' }, value), h('span', { class: 'fig-label' }, label));
}

function todaySection(st: StatsPayload): HTMLElement {
  const t = st.today;
  const n = (v: number | null, suffix = '') => (v === null ? '–' : `${v}${suffix}`);
  const hours = Math.floor(t.presentMinutes / 60);
  const mins = t.presentMinutes % 60;
  return h('section', { class: 'block' },
    h('h2', null, 'Dziś'),
    h('div', { class: 'figs' },
      figure(n(t.goodPercent, '%'), 'czasu w dobrej postawie'),
      figure(n(t.avgPosture), 'średni wynik postawy'),
      figure(n(t.avgFatigue, '%'), 'średnie zmęczenie'),
      figure(String(t.breaksTaken), plural(t.breaksTaken, 'przerwa', 'przerwy', 'przerw')),
      figure(t.avgBlinkRate === null ? '–' : String(Math.round(t.avgBlinkRate)), 'mrugnięć na minutę'),
      figure(hours ? `${hours} h ${mins} min` : `${mins} min`, 'przy biurku'),
    ),
    t.minutes.length ? dayChart(t.minutes) : h('p', { class: 'fine' }, 'Dziś jeszcze nie pracowałeś przy kamerze.'),
    t.topIssue ? h('p', { class: 'lead' }, `Najczęstszy problem dziś: ${ISSUE_LABEL[t.topIssue].toLowerCase()}.`) : null,
  );
}

/** Wykres dnia: wynik postawy i zmęczenie (średnia krocząca z 5 min). */
function dayChart(mins: MinuteSample[]): HTMLElement {
  const W = 760, H = 220, L = 36, R = 92, T = 14, B = 28;
  const first = new Date(mins[0].ts);
  const last = new Date(mins[mins.length - 1].ts);
  const h0 = first.getHours();
  const h1 = Math.max(h0 + 2, last.getHours() + 1);
  const dayStart = new Date(first).setHours(h0, 0, 0, 0);
  const X = (ts: number) => L + ((ts - dayStart) / ((h1 - h0) * 3600e3)) * (W - L - R);
  const Y = (v: number) => T + (1 - v / 100) * (H - T - B);

  const smooth = (key: 'posture' | 'fatigue') => {
    const pts: { ts: number; v: number | null }[] = [];
    for (let i = 0; i < mins.length; i++) {
      const win = mins.slice(Math.max(0, i - 4), i + 1).filter((m) => m.present >= 0.5 && m[key] !== null && mins[i].ts - m.ts <= 5 * 60e3);
      pts.push({ ts: mins[i].ts, v: mins[i].present >= 0.5 && win.length ? win.reduce((a, m) => a + (m[key] as number), 0) / win.length : null });
    }
    return pts;
  };
  const path = (pts: { ts: number; v: number | null }[]) => {
    let d = '';
    let prevTs = 0;
    for (const p of pts) {
      if (p.v === null) { prevTs = 0; continue; }
      const gap = prevTs && p.ts - prevTs > 3 * 60e3;
      d += `${!d || gap || !prevTs ? 'M' : 'L'}${X(p.ts).toFixed(1)} ${Y(p.v).toFixed(1)}`;
      prevTs = p.ts;
    }
    return d;
  };
  const post = smooth('posture');
  const fat = smooth('fatigue');
  const lastOf = (pts: { v: number | null; ts: number }[]) => [...pts].reverse().find((p) => p.v !== null);
  const lp = lastOf(post);
  const lf = lastOf(fat);

  let grid = '';
  for (const v of [0, 50, 80, 100]) {
    grid += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="grid${v === 80 ? ' grid-good' : ''}"/>`;
    grid += `<text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" class="axis">${v}</text>`;
  }
  for (let hh = h0; hh <= h1; hh++) {
    const x = X(new Date(dayStart).setHours(hh));
    grid += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="axis">${hh}:00</text>`;
  }
  // Etykiety na końcach linii zamiast legendy; rozsuwamy, gdy się nakładają.
  let yp = lp?.v != null ? Y(lp.v) : 0;
  let yf = lf?.v != null ? Y(lf.v) : 0;
  if (lp && lf && Math.abs(yp - yf) < 16) {
    if (yp <= yf) { yp -= 8; yf += 8; } else { yp += 8; yf -= 8; }
  }
  const ends =
    (lp ? `<text x="${X(lp.ts) + 8}" y="${yp + 4}" class="end end-post">postawa ${Math.round(lp.v!)}</text>` : '') +
    (lf ? `<text x="${X(lf.ts) + 8}" y="${yf + 4}" class="end end-fat">zmęczenie ${Math.round(lf.v!)}%</text>` : '');

  const el = h('figure', { class: 'chart' });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Wynik postawy i zmęczenie w ciągu dnia">
    ${grid}
    <path d="${path(fat)}" class="line line-fat"/>
    <path d="${path(post)}" class="line line-post"/>
    ${ends}
  </svg>`;
  el.append(h('figcaption', { class: 'fine' }, 'Średnia z 5 minut. Linia 80 to granica dobrej postawy; przerwy w linii to czas poza biurkiem.'));
  return el;
}

function formSection(st: StatsPayload): HTMLElement {
  const sec = h('section', { class: 'block' }, h('h2', null, 'Twoje godziny formy'));
  if (st.bestHours) {
    sec.append(h('p', { class: 'lead' }, `Najlepsze godziny: ${st.bestHours}${st.dipText ? `; ${st.dipText}` : ''}.`));
    sec.append(h('p', { class: 'fine' }, 'Zadania wymagające skupienia planuj na najlepsze godziny, a przerwy i spotkania na spadki.'));
  }
  if (st.daysOfData < 7) {
    const left = 7 - st.daysOfData;
    sec.append(h('p', { class: 'fine' }, `Wnioski będą pewniejsze po tygodniu danych – brakuje jeszcze ${left} ${plural(left, 'dnia', 'dni', 'dni')}.`));
  }
  if (!st.heatmap.length) {
    sec.append(h('p', { class: 'fine' }, 'Mapa pojawi się, gdy w danej godzinie zbierze się co najmniej 10 minut pracy.'));
    return sec;
  }
  const hours = st.heatmap.map((c) => c.hour);
  const hMin = Math.min(...hours);
  const hMax = Math.max(...hours);
  const forms = st.heatmap.map((c) => c.form);
  const fMin = Math.min(...forms);
  const fMax = Math.max(...forms);
  const cols = hMax - hMin + 1;
  const grid = h('div', { class: 'heat', style: `grid-template-columns: 2.6rem repeat(${cols}, minmax(0, 1fr))`, role: 'table', 'aria-label': 'Wskaźnik formy: dzień tygodnia i godzina' });
  grid.append(h('span', null));
  for (let hh = hMin; hh <= hMax; hh++) grid.append(h('span', { class: 'heat-h' }, String(hh)));
  for (let d = 0; d < 7; d++) {
    if (!st.heatmap.some((x) => x.weekday === d)) continue; // dni bez pracy pomijamy
    grid.append(h('span', { class: 'heat-d' }, DAYS[d]));
    for (let hh = hMin; hh <= hMax; hh++) {
      const c = st.heatmap.find((x) => x.weekday === d && x.hour === hh);
      if (!c) {
        grid.append(h('span', { class: 'heat-c empty' }));
        continue;
      }
      const k = fMax === fMin ? 1 : (c.form - fMin) / (fMax - fMin);
      grid.append(h('span', {
        class: k > 0.55 ? 'heat-c strong' : 'heat-c',
        style: `--k:${(0.15 + 0.85 * k).toFixed(2)}`,
        title: `${DAYS[d]} ${hh}:00 – forma ${c.form}/100 (${c.minutes} min)`,
      }, String(c.form)));
    }
  }
  sec.append(grid, h('p', { class: 'fine heat-legend' }, h('span', { class: 'swatch lo' }), `słabsza forma (${fMin})`, h('span', { class: 'swatch hi' }), `lepsza forma (${fMax})`));
  sec.append(h('p', { class: 'fine' }, 'Forma łączy brak zmęczenia (45%), postawę (35%) i tempo pracy z klawiatury i myszy (20%).'));
  return sec;
}

function issuesSection(st: StatsPayload): HTMLElement {
  const sec = h('section', { class: 'block' }, h('h2', null, 'Co poprawić na stałe'));
  const entries = (Object.entries(st.weekIssueShare) as [IssueId, number][]).sort((a, b) => b[1] - a[1]);
  if (!st.weekTopIssue || !entries.length) {
    sec.append(h('p', { class: 'fine' }, 'W tym tygodniu nie widać powtarzającego się problemu. Dobra robota.'));
    return sec;
  }
  sec.append(h('p', { class: 'lead' }, ERGONOMIC_TIP[st.weekTopIssue]));
  sec.append(
    h('ul', { class: 'bars' },
      entries.map(([k, v]) =>
        h('li', null,
          h('span', { class: 'bar-name' }, ISSUE_LABEL[k]),
          h('span', { class: 'bar-track' }, h('span', { class: 'bar-fill', style: `width:${v}%` })),
          h('span', { class: 'bar-val' }, `${v}%`),
        ),
      ),
    ),
    h('p', { class: 'fine' }, 'Udział w czasie ze złą postawą z ostatnich 7 dni.'),
  );
  return sec;
}
