// Kalibracja odporna na złą postawę.
//
// 1. Kontrola na żywo: zanim zapamiętamy „prostą” postawę, sprawdzamy rzeczy, które mają
//    prawdę bezwzględną (głowa nie opuszczona, barki i głowa poziomo, twarz przodem).
// 2. Dwa kroki: „najprościej, jak umiesz” i „tak, jak zwykle siedzisz”. Różnica między nimi
//    to osobisty zakres – progi ostrzeżeń dopasowują się do niego, a gdy różnicy prawie nie ma,
//    wiadomo, że „prosta” pozycja wcale nie była prosta.
// 3. Dryf wzorca: jeśli w ciągu dnia siedzisz wyraźnie prościej niż przy kalibracji,
//    proponujemy nową kalibrację.
import type { Calibration, PostureMetrics, SlouchReference } from '../shared/types';

export interface CalibrationCheck {
  id: 'headDown' | 'headUp' | 'turned' | 'shoulders' | 'headTilt';
  text: string;
}

export const CAL_LIMITS = {
  headDownDeg: 12,
  headUpDeg: 15,
  yawDeg: 15,
  shoulderTiltDeg: 5,
  headRollDeg: 6,
} as const;

/** Co poprawić, zanim zapamiętamy pozycję jako prostą. Pusta lista = można kalibrować. */
export function checkCalibrationPose(m: PostureMetrics): CalibrationCheck[] {
  const out: CalibrationCheck[] = [];
  if (m.headPitchDeg != null && m.headPitchDeg > CAL_LIMITS.headDownDeg) out.push({ id: 'headDown', text: 'Unieś głowę i patrz na środek ekranu.' });
  if (m.headPitchDeg != null && m.headPitchDeg < -CAL_LIMITS.headUpDeg) out.push({ id: 'headUp', text: 'Opuść lekko brodę.' });
  if (m.headYawDeg != null && Math.abs(m.headYawDeg) > CAL_LIMITS.yawDeg) out.push({ id: 'turned', text: 'Usiądź przodem do ekranu.' });
  if (Math.abs(m.shoulderTiltDeg) > CAL_LIMITS.shoulderTiltDeg) out.push({ id: 'shoulders', text: 'Wyrównaj barki.' });
  if (Math.abs(m.headRollDeg) > CAL_LIMITS.headRollDeg) out.push({ id: 'headTilt', text: 'Wyprostuj głowę – bez przechylania na bok.' });
  return out;
}

const relDrop = (now: number, base: number) => (base === 0 ? 0 : (base - now) / Math.abs(base));

export interface CalibrationVerdict {
  ok: boolean;
  /** Komunikat dla użytkownika, gdy coś się nie zgadza. */
  warning?: string;
}

/** Minimalna różnica „prosto vs zwykle”, poniżej której prosta pozycja raczej nie była prosta. */
export const MIN_PERSONAL_RANGE = 0.06;

/** Ocena dwóch kroków kalibracji. */
export function judgeCalibration(cal: Calibration, slouch: SlouchReference): CalibrationVerdict {
  const neck = relDrop(slouch.neckRatio, cal.neckRatio);
  const ear = relDrop(slouch.earRatio, cal.earRatio);
  const pitch = slouch.headPitchDeg != null && cal.headPitchDeg != null ? slouch.headPitchDeg - cal.headPitchDeg : 0;
  if (neck < -0.05 && ear < -0.05) {
    return { ok: false, warning: 'W drugim kroku siedziałeś prościej niż w pierwszym. Spróbuj jeszcze raz: najpierw najprościej, potem zwyczajnie.' };
  }
  if (Math.max(neck, ear) < MIN_PERSONAL_RANGE && pitch < 6) {
    return {
      ok: false,
      warning: 'Twoja „prosta” postawa prawie nie różni się od zwykłej. Spróbuj wyprostować się mocniej: usiądź głęboko, unieś mostek, cofnij brodę.',
    };
  }
  return { ok: true };
}

/**
 * Osobisty próg ostrzeżenia dla metryki „spadku” (szyja, uszy): 40% drogi od prostej
 * do zwykłej pozycji, w granicach 8–20%. Bez drugiego kroku – próg domyślny.
 */
export function personalThreshold(defaultThr: number, baseValue: number, slouchValue: number | undefined): number {
  if (slouchValue === undefined) return defaultThr;
  const range = relDrop(slouchValue, baseValue);
  if (range < MIN_PERSONAL_RANGE) return defaultThr;
  return Math.min(0.2, Math.max(0.08, 0.4 * range));
}

/**
 * Dryf wzorca: zbiera mediany minutowe „szyi” z chwil, gdy twarz patrzy na ekran.
 * Jeśli przez co najmniej 10% czasu (min. 30 min danych) siedzisz o 8% prościej niż przy
 * kalibracji, wzorzec jest za niski – proponujemy nową kalibrację.
 */
export class BaselineDrift {
  private minute = -1;
  private bucket: number[] = [];
  private medians: number[] = [];

  constructor(private calNeck: number) {}

  reset(calNeck: number): void {
    this.calNeck = calNeck;
    this.minute = -1;
    this.bucket = [];
    this.medians = [];
  }

  /** @param t czas w sekundach */
  add(t: number, m: PostureMetrics): void {
    if (m.headYawDeg != null && Math.abs(m.headYawDeg) > CAL_LIMITS.yawDeg) return;
    if (m.headPitchDeg != null && Math.abs(m.headPitchDeg) > CAL_LIMITS.headDownDeg) return;
    const minute = Math.floor(t / 60);
    if (minute !== this.minute) {
      this.flush();
      this.minute = minute;
    }
    this.bucket.push(m.neckRatio);
  }

  private flush(): void {
    if (this.bucket.length >= 20) {
      const s = [...this.bucket].sort((a, b) => a - b);
      this.medians.push(s[s.length >> 1]);
      if (this.medians.length > 600) this.medians.shift();
    }
    this.bucket = [];
  }

  /** true, gdy warto zaproponować nową kalibrację. */
  suggestsRecalibration(): boolean {
    if (this.medians.length < 30) return false;
    const s = [...this.medians].sort((a, b) => a - b);
    const p90 = s[Math.floor(s.length * 0.9)];
    return p90 > this.calNeck * 1.08;
  }
}
