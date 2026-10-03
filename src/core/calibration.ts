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
import { tr } from '../shared/i18n';

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
  if (m.headPitchDeg != null && m.headPitchDeg > CAL_LIMITS.headDownDeg) out.push({ id: 'headDown', text: tr('Unieś głowę i patrz na środek ekranu.') });
  if (m.headPitchDeg != null && m.headPitchDeg < -CAL_LIMITS.headUpDeg) out.push({ id: 'headUp', text: tr('Opuść lekko brodę.') });
  if (m.headYawDeg != null && Math.abs(m.headYawDeg) > CAL_LIMITS.yawDeg) out.push({ id: 'turned', text: tr('Usiądź przodem do ekranu.') });
  if (Math.abs(m.shoulderTiltDeg) > CAL_LIMITS.shoulderTiltDeg) out.push({ id: 'shoulders', text: tr('Wyrównaj barki.') });
  if (Math.abs(m.headRollDeg) > CAL_LIMITS.headRollDeg) out.push({ id: 'headTilt', text: tr('Wyprostuj głowę – bez przechylania na bok.') });
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

/** Drugi krok „prościej” niż pierwszy o więcej niż 5% (szyja i uszy) = kroki pomylone. */
const SWAPPED_STEPS_MARGIN = 0.05;
/** Bez różnicy w metrykach wystarczy 6° różnicy pochylenia głowy, by uznać kroki za różne. */
const MIN_PITCH_RANGE_DEG = 6;

/** Ocena dwóch kroków kalibracji. */
export function judgeCalibration(cal: Calibration, slouch: SlouchReference): CalibrationVerdict {
  const neck = relDrop(slouch.neckRatio, cal.neckRatio);
  const ear = relDrop(slouch.earRatio, cal.earRatio);
  const pitch = slouch.headPitchDeg != null && cal.headPitchDeg != null ? slouch.headPitchDeg - cal.headPitchDeg : 0;
  if (neck < -SWAPPED_STEPS_MARGIN && ear < -SWAPPED_STEPS_MARGIN) {
    return { ok: false, warning: tr('W drugim kroku siedziałeś prościej niż w pierwszym. Spróbuj jeszcze raz: najpierw najprościej, potem zwyczajnie.') };
  }
  if (Math.max(neck, ear) < MIN_PERSONAL_RANGE && pitch < MIN_PITCH_RANGE_DEG) {
    return {
      ok: false,
      warning: tr('Twoja „prosta” postawa prawie nie różni się od zwykłej. Spróbuj wyprostować się mocniej: usiądź głęboko, unieś mostek, cofnij brodę.'),
    };
  }
  return { ok: true };
}

// Osobisty próg: 40% osobistego zakresu, w granicach 8–20%.
const PERSONAL_SHARE = 0.4;
const PERSONAL_THR_MIN = 0.08;
const PERSONAL_THR_MAX = 0.2;

/**
 * Osobisty próg ostrzeżenia dla metryki „spadku” (szyja, uszy): 40% drogi od prostej
 * do zwykłej pozycji, w granicach 8–20%. Bez drugiego kroku – próg domyślny.
 */
export function personalThreshold(defaultThr: number, baseValue: number, slouchValue: number | undefined): number {
  if (slouchValue === undefined) return defaultThr;
  const range = relDrop(slouchValue, baseValue);
  if (range < MIN_PERSONAL_RANGE) return defaultThr;
  return Math.min(PERSONAL_THR_MAX, Math.max(PERSONAL_THR_MIN, PERSONAL_SHARE * range));
}

// Dryf wzorca: minuta liczy się od 20 odczytów; pamiętamy do 600 minut, oceniamy od 30;
// 90. percentyl szyi wyższy o 8% od kalibracji = siedzisz prościej niż przy kalibracji.
const DRIFT_MIN_READINGS = 20;
const DRIFT_MAX_MINUTES = 600;
const DRIFT_MIN_MINUTES = 30;
const DRIFT_PERCENTILE = 0.9;
const DRIFT_FACTOR = 1.08;

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
    if (this.bucket.length >= DRIFT_MIN_READINGS) {
      const s = [...this.bucket].sort((a, b) => a - b);
      this.medians.push(s[s.length >> 1]);
      if (this.medians.length > DRIFT_MAX_MINUTES) this.medians.shift();
    }
    this.bucket = [];
  }

  /** true, gdy warto zaproponować nową kalibrację. */
  suggestsRecalibration(): boolean {
    if (this.medians.length < DRIFT_MIN_MINUTES) return false;
    const s = [...this.medians].sort((a, b) => a - b);
    const p90 = s[Math.floor(s.length * DRIFT_PERCENTILE)];
    return p90 > this.calNeck * DRIFT_FACTOR;
  }
}

/** Szyja w granicach ±5% kalibracji: głowa i barki są względem siebie tam, gdzie powinny. */
const UPRIGHT_NECK = 0.05;
const POSITION_TAU_SEC = 10;

/**
 * Położenie nosa i barków w kadrze przy prostej postawie (odróżnia uniesienie barków od opadania głowy).
 * Uzupełnia się samo, gdy kalibracja go nie ma (stare kalibracje), i nadąża za przesunięciem na krześle –
 * ale tylko, gdy szyja ma długość z kalibracji, więc uniesione barki ani opuszczona głowa go nie przestawią.
 * Zmienia `c` w miejscu (ten sam obiekt ma tracker postawy).
 */
export function followPositionRef(c: Calibration, m: PostureMetrics, dtSec: number): void {
  if (m.shoulderY == null || c.neckRatio === 0) return;
  if (Math.abs(m.neckRatio - c.neckRatio) / Math.abs(c.neckRatio) > UPRIGHT_NECK) return;
  if (c.noseY == null || c.shoulderY == null) {
    c.noseY = m.noseY;
    c.shoulderY = m.shoulderY;
    return;
  }
  const a = 1 - Math.exp(-Math.max(0, dtSec) / POSITION_TAU_SEC);
  c.noseY += (m.noseY - c.noseY) * a;
  c.shoulderY += (m.shoulderY - c.shoulderY) * a;
}
