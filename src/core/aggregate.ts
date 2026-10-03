// Agregacja odczytów do próbek minutowych i trend postawy.
import type { FatigueSnapshot, IssueId, MinuteSample, PostureState } from '../shared/types';

export interface FrameReading {
  present: boolean;
  score: number | null;
  state: PostureState;
  severities: Partial<Record<IssueId, number>>;
  fatigue: FatigueSnapshot | null;
}

interface Acc {
  minute: number;
  seen: number;
  presentSec: number;
  scoreSum: number;
  scoreSec: number;
  goodSec: number;
  fatigueSum: number;
  fatigueN: number;
  blinkSum: number;
  blinkN: number;
  perclosSum: number;
  perclosN: number;
  longSum: number;
  longN: number;
  yawnsMax: number;
  yawnsStart: number | null;
  issues: Partial<Record<IssueId, number>>;
}

const newAcc = (minute: number): Acc => ({
  minute,
  seen: 0,
  presentSec: 0,
  scoreSum: 0,
  scoreSec: 0,
  goodSec: 0,
  fatigueSum: 0,
  fatigueN: 0,
  blinkSum: 0,
  blinkN: 0,
  perclosSum: 0,
  perclosN: 0,
  longSum: 0,
  longN: 0,
  yawnsMax: 0,
  yawnsStart: null,
  issues: {},
});

const round1 = (v: number) => Math.round(v * 10) / 10;

const MAX_STEP_SEC = 2; // dłuższa przerwa między klatkami liczy się najwyżej jako 2 s
const ISSUE_SEVERITY = 0.5; // od tej kary problem liczy się do czasu „z problemem” w minucie
const MIN_MINUTE_SEC = 5; // minuta z mniej niż 5 s danych nie jest zapisywana
const MIN_PRESENT = 0.5; // minuta liczy się do trendu, gdy osoba była przy ekranie przez ≥ połowę czasu
const MIN_TREND_MINUTES = 8; // trend dopiero z 8 minut
const MIN_TOP_ISSUE_SEC = 30; // „najczęstszy problem” dopiero od 30 s łącznie

/** Zbiera odczyty klatka po klatce; po zmianie minuty zwraca gotową próbkę. Czas w ms. */
export class MinuteAggregator {
  private acc: Acc | null = null;
  private lastMs: number | null = null;

  add(ms: number, r: FrameReading): MinuteSample | null {
    const minute = Math.floor(ms / 60000) * 60000;
    let out: MinuteSample | null = null;
    if (this.acc && this.acc.minute !== minute) {
      out = this.finish(this.acc);
      this.acc = null;
    }
    if (!this.acc) this.acc = newAcc(minute);
    const dt = this.lastMs === null ? 0 : Math.min(MAX_STEP_SEC, Math.max(0, (ms - this.lastMs) / 1000));
    this.lastMs = ms;
    const a = this.acc;
    a.seen += dt;
    if (r.present) {
      a.presentSec += dt;
      if (r.score !== null) {
        a.scoreSum += r.score * dt;
        a.scoreSec += dt;
        if (r.state === 'good') a.goodSec += dt;
      }
      for (const [k, v] of Object.entries(r.severities) as [IssueId, number][]) {
        if (v >= ISSUE_SEVERITY) a.issues[k] = (a.issues[k] ?? 0) + dt;
      }
      const f = r.fatigue;
      if (f) {
        a.fatigueSum += f.percent;
        a.fatigueN++;
        if (f.blinkRate !== null) { a.blinkSum += f.blinkRate; a.blinkN++; }
        if (f.perclos !== null) { a.perclosSum += f.perclos; a.perclosN++; }
        if (f.longBlinksPerMin !== null) { a.longSum += f.longBlinksPerMin; a.longN++; }
        if (a.yawnsStart === null) a.yawnsStart = f.yawns10m;
        a.yawnsMax = Math.max(a.yawnsMax, f.yawns10m - a.yawnsStart);
      }
    }
    return out;
  }

  /** Domyka bieżącą minutę (np. przy pauzie lub zamknięciu). */
  flush(): MinuteSample | null {
    if (!this.acc) return null;
    const s = this.finish(this.acc);
    this.acc = null;
    this.lastMs = null;
    return s;
  }

  private finish(a: Acc): MinuteSample | null {
    if (a.seen < MIN_MINUTE_SEC) return null; // za mało danych w tej minucie
    const issues: Partial<Record<IssueId, number>> = {};
    for (const [k, v] of Object.entries(a.issues) as [IssueId, number][]) issues[k] = Math.round(v);
    return {
      ts: a.minute,
      present: round1(Math.min(1, a.presentSec / a.seen)),
      posture: a.scoreSec > 0 ? Math.round(a.scoreSum / a.scoreSec) : null,
      goodRatio: a.scoreSec > 0 ? Math.round((a.goodSec / a.scoreSec) * 100) / 100 : null,
      fatigue: a.fatigueN ? Math.round(a.fatigueSum / a.fatigueN) : null,
      blinkRate: a.blinkN ? round1(a.blinkSum / a.blinkN) : null,
      perclos: a.perclosN ? Math.round((a.perclosSum / a.perclosN) * 1000) / 1000 : null,
      longBlinks: a.longN ? round1(a.longSum / a.longN) : null,
      yawns: a.yawnsMax,
      issues,
    };
  }
}

/** Nachylenie prostej (pkt/min) dopasowanej do średnich minutowych wyniku postawy. */
export function postureSlope(samples: MinuteSample[]): number | null {
  const pts = samples.filter((s) => s.posture !== null && s.present >= MIN_PRESENT);
  if (pts.length < MIN_TREND_MINUTES) return null;
  const x0 = pts[0].ts;
  const xs = pts.map((s) => (s.ts - x0) / 60000);
  const ys = pts.map((s) => s.posture as number);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export function postureAvg(samples: MinuteSample[]): number | null {
  const pts = samples.filter((s) => s.posture !== null && s.present >= MIN_PRESENT);
  if (!pts.length) return null;
  return pts.reduce((a, s) => a + (s.posture as number), 0) / pts.length;
}

/** Najczęstszy problem w podanych próbkach (sekundy). */
export function topIssueOf(samples: MinuteSample[]): IssueId | null {
  const sum: Partial<Record<IssueId, number>> = {};
  for (const s of samples) for (const [k, v] of Object.entries(s.issues) as [IssueId, number][]) sum[k] = (sum[k] ?? 0) + v;
  let best: IssueId | null = null;
  let bv = 0;
  for (const [k, v] of Object.entries(sum) as [IssueId, number][]) if (v > bv) { bv = v; best = k; }
  return bv >= MIN_TOP_ISSUE_SEC ? best : null;
}
