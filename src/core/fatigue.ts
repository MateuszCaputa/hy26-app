// Mrugnięcia, PERCLOS, ziewanie, opadanie głowy i wskaźnik zmęczenia 0–100%.
import type { FatigueLevel, FatigueSnapshot } from '../shared/types';
import type { Landmark } from './metrics';
import { clamp01 } from './scoring';

/** Punkty siatki twarzy MediaPipe (478) do współczynnika otwarcia oka (EAR). p1..p6 */
export const LEFT_EYE = [33, 160, 158, 133, 153, 144] as const;
export const RIGHT_EYE = [362, 385, 387, 263, 373, 380] as const;
export const MOUTH = { upper: 13, lower: 14, left: 78, right: 308 } as const;

/** EAR = (|p2−p6| + |p3−p5|) / (2·|p1−p4|), w pikselach (proporcje obrazu mają znaczenie). */
export function eyeAspectRatio(face: Landmark[], idx: readonly number[], w: number, h: number): number {
  const P = (i: number) => [face[idx[i]].x * w, face[idx[i]].y * h] as const;
  const d = (a: readonly [number, number], b: readonly [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const [p1, p2, p3, p4, p5, p6] = [P(0), P(1), P(2), P(3), P(4), P(5)];
  const horiz = d(p1, p4);
  return horiz === 0 ? 0 : (d(p2, p6) + d(p3, p5)) / (2 * horiz);
}

export function mouthAspectRatio(face: Landmark[], w: number, h: number): number {
  const P = (i: number) => [face[i].x * w, face[i].y * h] as const;
  const up = P(MOUTH.upper), lo = P(MOUTH.lower), l = P(MOUTH.left), r = P(MOUTH.right);
  const horiz = Math.hypot(l[0] - r[0], l[1] - r[1]);
  return horiz === 0 ? 0 : Math.hypot(up[0] - lo[0], up[1] - lo[1]) / horiz;
}

export interface FaceFrame {
  /** Średni EAR obu oczu albo null, gdy twarzy nie wykryto. */
  ear: number | null;
  /** Współczynnik mrugnięcia z blendshapes MediaPipe (0–1), jeśli dostępny. */
  blinkBlend: number | null;
  /** Otwarcie żuchwy z blendshapes (0–1) albo MAR, jeśli brak blendshapes. */
  jawOpen: number | null;
}

const BLINK_MIN = 0.05;
const BLINK_MAX = 0.4; // dłużej = długie mrugnięcie
const LONG_MAX = 3.0; // dłużej = raczej patrzenie w dół (klawiatura), nie liczymy
const CLOSE_ON = 0.6;
const CLOSE_OFF = 0.4;
const PERCLOS_CLOSED = 0.8; // oko zamknięte w co najmniej 80%
const YAWN_JAW = 0.55;
const YAWN_MIN_SEC = 1.5;
const MIN_FPS_FOR_BLINKS = 12;

interface PerclosSample { t: number; dt: number; closed: boolean }
interface Closure { start: number; samples: PerclosSample[] }

/** Analiza oczu i ust klatka po klatce. Czas w sekundach. */
export class EyeAnalyzer {
  private earHist: { t: number; v: number }[] = [];
  private closure: Closure | null = null;
  private blinks: number[] = [];
  private longBlinks: number[] = [];
  private perclosSamples: PerclosSample[] = [];
  private yawnStart: number | null = null;
  private yawnCounted = false;
  private yawns: number[] = [];
  private nods: number[] = [];
  private nodStart: number | null = null;
  private frames: { t: number; face: boolean }[] = [];
  private lastT: number | null = null;
  private firstReliableT: number | null = null;

  constructor(private calibratedEarOpen: number | null = null) {}

  setCalibratedEarOpen(v: number | null): void {
    this.calibratedEarOpen = v;
  }

  /** Bieżący wzorzec „oko otwarte”: 90. percentyl EAR z ostatnich 30 s (albo kalibracja). */
  earOpenRef(): number | null {
    if (this.earHist.length < 30) return this.calibratedEarOpen;
    const s = this.earHist.map((e) => e.v).sort((a, b) => a - b);
    const p90 = s[Math.floor(s.length * 0.9)];
    return this.calibratedEarOpen ? Math.max(p90, this.calibratedEarOpen * 0.85) : p90;
  }

  /** Stopień zamknięcia oka 0 (otwarte) – 1 (zamknięte). */
  closedness(f: FaceFrame): number | null {
    let c: number | null = null;
    const ref = this.earOpenRef();
    if (f.ear !== null && ref) {
      const closedEar = ref * 0.35;
      c = 1 - clamp01((f.ear - closedEar) / (ref - closedEar));
    }
    if (f.blinkBlend !== null) c = c === null ? f.blinkBlend : Math.max(c, f.blinkBlend);
    return c;
  }

  update(t: number, f: FaceFrame): void {
    const dt = this.lastT === null ? 0 : Math.min(0.5, t - this.lastT);
    this.lastT = t;
    const hasFace = f.ear !== null || f.blinkBlend !== null;
    this.frames.push({ t, face: hasFace });
    while (this.frames.length && t - this.frames[0].t > 10) this.frames.shift();

    if (!hasFace) {
      this.closure = null;
      this.yawnStart = null;
      return;
    }

    const c = this.closedness(f) ?? 0;
    if (f.ear !== null && c < 0.5) {
      this.earHist.push({ t, v: f.ear });
      while (this.earHist.length && t - this.earHist[0].t > 30) this.earHist.shift();
    }

    // Mrugnięcia: histereza CLOSE_ON / CLOSE_OFF.
    const sample = { t, dt, closed: c >= PERCLOS_CLOSED };
    this.perclosSamples.push(sample);
    if (this.closure === null && c >= CLOSE_ON) {
      this.closure = { start: t, samples: [] };
    }
    if (this.closure) {
      this.closure.samples.push(sample);
      const d = t - this.closure.start;
      if (d > LONG_MAX) {
        // Zamknięcia > 3 s traktujemy jak patrzenie w dół: nie trafiają do PERCLOS.
        for (const s of this.closure.samples) s.closed = false;
      }
      if (c <= CLOSE_OFF) {
        if (d >= BLINK_MIN && d <= BLINK_MAX) this.blinks.push(t);
        else if (d > BLINK_MAX && d <= LONG_MAX) this.longBlinks.push(t);
        this.closure = null;
      }
    }

    // Ziewanie.
    if (f.jawOpen !== null && f.jawOpen >= YAWN_JAW) {
      if (this.yawnStart === null) {
        this.yawnStart = t;
        this.yawnCounted = false;
      } else if (!this.yawnCounted && t - this.yawnStart >= YAWN_MIN_SEC) {
        this.yawns.push(t);
        this.yawnCounted = true;
      }
    } else {
      this.yawnStart = null;
    }

    this.prune(t);
    if (this.isReliable(t) && this.firstReliableT === null) this.firstReliableT = t;
    if (!this.isReliable(t)) this.firstReliableT = null;
  }

  /**
   * Opadanie głowy („przysypianie”): szybki spadek neckRatio poniżej 75% wzorca
   * i powrót w ciągu 0,3–2,5 s.
   */
  updateHead(t: number, neckRel: number | null): void {
    if (neckRel === null) {
      this.nodStart = null;
      return;
    }
    if (this.nodStart === null && neckRel < 0.75) this.nodStart = t;
    else if (this.nodStart !== null && neckRel > 0.85) {
      const d = t - this.nodStart;
      if (d >= 0.3 && d <= 2.5) this.nods.push(t);
      this.nodStart = null;
    } else if (this.nodStart !== null && t - this.nodStart > 2.5) {
      this.nodStart = null; // dłuższe pochylenie to nie przysypianie
    }
  }

  fps(t: number): number {
    const recent = this.frames.filter((f) => t - f.t <= 5);
    if (recent.length < 2) return 0;
    return (recent.length - 1) / (recent[recent.length - 1].t - recent[0].t || 1);
  }

  isReliable(t: number): boolean {
    if (this.frames.length < 10) return false;
    const faceShare = this.frames.filter((f) => f.face).length / this.frames.length;
    return faceShare >= 0.7 && this.fps(t) >= MIN_FPS_FOR_BLINKS;
  }

  private prune(t: number): void {
    const keep = (arr: number[], sec: number) => {
      while (arr.length && t - arr[0] > sec) arr.shift();
    };
    keep(this.blinks, 300);
    keep(this.longBlinks, 300);
    keep(this.yawns, 600);
    keep(this.nods, 600);
    while (this.perclosSamples.length && t - this.perclosSamples[0].t > 60) this.perclosSamples.shift();
  }

  /** Mrugnięcia na minutę z ostatniej minuty (null, gdy za mało wiarygodnych danych). */
  blinkRate(t: number): number | null {
    if (!this.isReliable(t) || this.firstReliableT === null) return null;
    const span = Math.min(60, t - this.firstReliableT);
    if (span < 20) return null;
    const n = this.blinks.filter((b) => t - b <= span).length;
    return (n / span) * 60;
  }

  perclos(t: number): number | null {
    if (!this.isReliable(t)) return null;
    let total = 0;
    let closed = 0;
    for (const s of this.perclosSamples) {
      total += s.dt;
      if (s.closed) closed += s.dt;
    }
    if (total < 20) return null;
    return clamp01(closed / total);
  }

  longBlinksPerMin(t: number): number | null {
    if (!this.isReliable(t)) return null;
    return this.longBlinks.filter((b) => t - b <= 300).length / 5;
  }

  yawns10m(t: number): number {
    return this.yawns.filter((y) => t - y <= 600).length;
  }

  nods10m(t: number): number {
    return this.nods.filter((y) => t - y <= 600).length;
  }

  /** Mrugnięcia od ostatniego odczytu (do statystyk minutowych). */
  blinkCount(): number {
    return this.blinks.length;
  }
}

export interface FatigueInputs {
  blinkRate: number | null;
  perclos: number | null;
  longBlinksPerMin: number | null;
  yawns10m: number;
  nods10m: number;
  /** Średni wynik postawy z ostatnich 15 min (null, gdy brak danych). */
  postureAvg15: number | null;
  minutesSinceBreak: number;
}

export const FATIGUE_WEIGHTS = {
  perclos: 0.3,
  blink: 0.2,
  long: 0.15,
  yawn: 0.1,
  posture: 0.15,
  time: 0.1,
} as const;

/** Składowe 0–1; null = brak danych (waga jest wtedy rozdzielana na pozostałe). */
export function fatigueComponents(i: FatigueInputs): Record<keyof typeof FATIGUE_WEIGHTS, number | null> {
  return {
    perclos: i.perclos === null ? null : clamp01((i.perclos - 0.05) / 0.15),
    blink:
      i.blinkRate === null
        ? null
        : Math.max(clamp01((10 - i.blinkRate) / 7), clamp01((i.blinkRate - 25) / 15)),
    long: i.longBlinksPerMin === null ? null : clamp01(i.longBlinksPerMin / 3),
    yawn: clamp01((i.yawns10m + i.nods10m) / 3),
    posture: i.postureAvg15 === null ? null : clamp01((80 - i.postureAvg15) / 40),
    time: clamp01((i.minutesSinceBreak - 20) / 70),
  };
}

export function fatiguePercent(i: FatigueInputs): number {
  const c = fatigueComponents(i);
  let sum = 0;
  let wsum = 0;
  for (const k of Object.keys(FATIGUE_WEIGHTS) as (keyof typeof FATIGUE_WEIGHTS)[]) {
    const v = c[k];
    if (v === null) continue;
    sum += FATIGUE_WEIGHTS[k] * v;
    wsum += FATIGUE_WEIGHTS[k];
  }
  return wsum === 0 ? 0 : (100 * sum) / wsum;
}

export function fatigueLevel(percent: number): FatigueLevel {
  if (percent >= 70) return 'veryTired';
  if (percent >= 40) return 'tired';
  return 'fresh';
}

/** Wygładza wskaźnik zmęczenia (stała czasowa ~60 s), by nie skakał co klatkę. */
export class FatigueEstimator {
  private value: number | null = null;
  private lastT: number | null = null;

  update(t: number, eyes: EyeAnalyzer, extra: { postureAvg15: number | null; minutesSinceBreak: number }): FatigueSnapshot {
    const inputs: FatigueInputs = {
      blinkRate: eyes.blinkRate(t),
      perclos: eyes.perclos(t),
      longBlinksPerMin: eyes.longBlinksPerMin(t),
      yawns10m: eyes.yawns10m(t),
      nods10m: eyes.nods10m(t),
      ...extra,
    };
    const raw = fatiguePercent(inputs);
    const dt = this.lastT === null ? 0 : Math.max(0, t - this.lastT);
    this.lastT = t;
    this.value = this.value === null ? raw : this.value + (1 - Math.exp(-dt / 60)) * (raw - this.value);
    const percent = Math.round(this.value);
    return {
      percent,
      level: fatigueLevel(percent),
      blinkRate: inputs.blinkRate,
      perclos: inputs.perclos,
      longBlinksPerMin: inputs.longBlinksPerMin,
      yawns10m: inputs.yawns10m,
      nods10m: inputs.nods10m,
      faceReliable: eyes.isReliable(t),
    };
  }

  /** Po przerwie zmęczenie oceniamy od nowa (część „czas od przerwy” spada do zera). */
  reset(): void {
    this.value = null;
    this.lastT = null;
  }
}
