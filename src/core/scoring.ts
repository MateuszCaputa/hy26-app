// Ocena postawy względem osobistej kalibracji: wynik 0–100, stany, histereza alertów.
import type { Calibration, IssueId, IssueReading, PostureMetrics, PostureState } from '../shared/types';
import { personalThreshold } from './calibration';

interface IssueDef {
  id: Exclude<IssueId, 'stillness'>;
  weight: number;
  /** Próg ostrzeżenia (ułamek albo stopnie). */
  threshold: number;
  unit: '%' | '°';
  deviation: (m: PostureMetrics, c: Calibration) => number;
}

const relDrop = (now: number, base: number) => (base === 0 ? 0 : (base - now) / Math.abs(base));

/**
 * Przechyły barków i głowy oceniamy względem poziomu, nie względem kalibracji:
 * prosto znaczy 0° u każdego. Kalibracja może przesunąć zero najwyżej o 3°
 * (lekko krzywo stojąca kamera), więc krzywa postawa przy kalibracji nie staje się normą.
 */
export const MAX_TILT_BASELINE_DEG = 3;
const levelBaseline = (calDeg: number) => Math.max(-MAX_TILT_BASELINE_DEG, Math.min(MAX_TILT_BASELINE_DEG, calDeg));

/** Powyżej tego obrotu głowy rozstaw oczu przestaje mówić o odległości i skręcie tułowia. */
export const MAX_YAW_FOR_DISTANCE_DEG = 25;
const yawTooLarge = (m: PostureMetrics) => m.headYawDeg != null && Math.abs(m.headYawDeg) > MAX_YAW_FOR_DISTANCE_DEG;

/** 15° dodatkowego pochylenia głowy liczymy jak 15% spadku „szyi” (ten sam próg ostrzeżenia). */
const PITCH_DEG_TO_RATIO = 0.15 / 15;

/** Wysunięcie głowy: większe z dwóch niezależnych pomiarów – opadania szyi i pochylenia głowy. */
function headForwardDeviation(m: PostureMetrics, c: Calibration): number {
  const neck = relDrop(m.neckRatio, c.neckRatio);
  if (m.headPitchDeg == null || c.headPitchDeg == null) return neck;
  return Math.max(neck, (m.headPitchDeg - c.headPitchDeg) * PITCH_DEG_TO_RATIO);
}

export const ISSUE_DEFS: IssueDef[] = [
  { id: 'headForward', weight: 0.3, threshold: 0.15, unit: '%', deviation: headForwardDeviation },
  { id: 'slouch', weight: 0.25, threshold: 0.1, unit: '%', deviation: (m, c) => relDrop(m.earRatio, c.earRatio) },
  { id: 'shoulderTilt', weight: 0.15, threshold: 5, unit: '°', deviation: (m, c) => Math.abs(m.shoulderTiltDeg - levelBaseline(c.shoulderTiltDeg)) },
  { id: 'tooClose', weight: 0.15, threshold: 0.15, unit: '%', deviation: (m, c) => (yawTooLarge(m) ? 0 : m.eyeDistPx / c.eyeDistPx - 1) },
  { id: 'headTilt', weight: 0.1, threshold: 10, unit: '°', deviation: (m, c) => Math.abs(m.headRollDeg - levelBaseline(c.headRollDeg)) },
  { id: 'twist', weight: 0.05, threshold: 0.15, unit: '%', deviation: (m, c) => (yawTooLarge(m) ? 0 : relDrop(m.shoulderToEye, c.shoulderToEye)) },
];

/** Suma ważonych kar, przy której wynik spada do zera. */
const PENALTY_FOR_ZERO = 0.6;

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Kara rośnie od połowy progu (0) do 1,5 progu (1); przy samym progu wynosi 0,5.
 * `sensitivity` mnoży progi: 0,8 = bardziej czuły, 1,3 = mniej czuły.
 */
export function evaluateIssues(m: PostureMetrics, c: Calibration, sensitivity = 1): IssueReading[] {
  return ISSUE_DEFS.map((d) => {
    const dev = d.deviation(m, c);
    // Szyja i garbienie: próg z osobistego zakresu (drugi krok kalibracji), jeśli jest.
    const base =
      d.id === 'headForward' ? personalThreshold(d.threshold, c.neckRatio, c.slouch?.neckRatio)
      : d.id === 'slouch' ? personalThreshold(d.threshold, c.earRatio, c.slouch?.earRatio)
      : d.threshold;
    const thr = base * sensitivity;
    return {
      id: d.id,
      severity: clamp01((dev - 0.5 * thr) / thr),
      value: d.unit === '%' ? dev * 100 : dev,
      unit: d.unit,
    };
  });
}

export function scoreFromIssues(issues: IssueReading[]): number {
  let penalty = 0;
  for (const r of issues) {
    const def = ISSUE_DEFS.find((d) => d.id === r.id);
    if (def) penalty += def.weight * r.severity;
  }
  return Math.round(100 * (1 - Math.min(1, penalty / PENALTY_FOR_ZERO)));
}

export function stateFromScore(score: number): PostureState {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warn';
  return 'bad';
}

export interface TrackerConfig {
  sensitivity: number;
  alertDelaySec: number;
  alertCooldownMin: number;
}

export interface TrackerOutput {
  state: PostureState;
  score: number | null; // wygładzony
  rawScore: number | null;
  present: boolean;
  topIssue: IssueId | null;
  /** Wygładzone kary (0–1) per problem. */
  severities: Partial<Record<IssueId, number>>;
  /** Ustawione tylko w momencie wyzwolenia alertu. */
  alert: IssueId | null;
  absentSec: number;
  stillMinutes: number;
}

const ABSENT_AFTER_SEC = 3;
const SCORE_TAU_SEC = 12; // stała czasowa wygładzania (≈ średnia z 10–20 s)
const CLEAR_SCORE = 75;
const CLEAR_HOLD_SEC = 5;
const STILL_WINDOW_SEC = 300;
const STILL_THRESHOLD = 0.08; // odchylenie położenia nosa w rozstawach oczu

/** Śledzi postawę w czasie: wygładza wynik i decyduje o alertach z histerezą. */
export class PostureTracker {
  private smoothed: number | null = null;
  private sev: Partial<Record<IssueId, number>> = {};
  private lastT: number | null = null;
  private lastSeenT: number | null = null;
  private badSince: number | null = null;
  private goodSince: number | null = null;
  private alertActive = false;
  private lastAlertT = -Infinity;
  private noseHist: { t: number; x: number; y: number; e: number }[] = [];
  private stillSince: number | null = null;

  constructor(
    private cal: Calibration,
    private cfg: TrackerConfig,
  ) {}

  setCalibration(cal: Calibration): void {
    this.cal = cal;
    this.smoothed = null;
    this.sev = {};
  }

  setConfig(cfg: TrackerConfig): void {
    this.cfg = cfg;
  }

  /** @param t czas w sekundach */
  update(t: number, m: PostureMetrics | null): TrackerOutput {
    const dt = this.lastT === null ? 0 : Math.min(2, Math.max(0, t - this.lastT));
    this.lastT = t;

    if (!m) {
      const absentSec = this.lastSeenT === null ? Infinity : t - this.lastSeenT;
      const present = absentSec < ABSENT_AFTER_SEC;
      if (!present) {
        this.badSince = null;
        this.goodSince = null;
      }
      return {
        state: present ? stateFromScore(this.smoothed ?? 100) : 'absent',
        score: present ? this.smoothed : null,
        rawScore: null,
        present,
        topIssue: present ? this.topIssue() : null,
        severities: { ...this.sev },
        alert: null,
        absentSec: Number.isFinite(absentSec) ? absentSec : 0,
        stillMinutes: 0,
      };
    }

    if (this.lastSeenT !== null && t - this.lastSeenT > 120) {
      // Długa nieobecność: zaczynamy ocenę od nowa.
      this.smoothed = null;
      this.sev = {};
      this.noseHist = [];
      this.stillSince = null;
    }
    this.lastSeenT = t;

    const issues = evaluateIssues(m, this.cal, this.cfg.sensitivity);
    const raw = scoreFromIssues(issues);
    const a = dt === 0 || this.smoothed === null ? 1 : 1 - Math.exp(-dt / SCORE_TAU_SEC);
    this.smoothed = this.smoothed === null ? raw : this.smoothed + a * (raw - this.smoothed);
    for (const r of issues) {
      const prev = this.sev[r.id];
      this.sev[r.id] = prev === undefined ? r.severity : prev + a * (r.severity - prev);
    }

    const stillMinutes = this.updateStillness(t, m);
    if (stillMinutes >= 30) this.sev.stillness = Math.min(1, (stillMinutes - 30) / 30 + 0.5);
    else delete this.sev.stillness;

    const score = Math.round(this.smoothed);
    const state = stateFromScore(score);
    let alert: IssueId | null = null;

    if (state === 'bad') {
      this.goodSince = null;
      if (this.badSince === null) this.badSince = t;
      const cooldownOk = t - this.lastAlertT >= this.cfg.alertCooldownMin * 60;
      if (!this.alertActive && cooldownOk && t - this.badSince >= this.cfg.alertDelaySec) {
        this.alertActive = true;
        this.lastAlertT = t;
        alert = this.topIssue();
      }
    } else {
      this.badSince = null;
      if (score > CLEAR_SCORE) {
        if (this.goodSince === null) this.goodSince = t;
        if (t - this.goodSince >= CLEAR_HOLD_SEC) this.alertActive = false;
      } else {
        this.goodSince = null;
      }
    }

    return {
      state,
      score,
      rawScore: raw,
      present: true,
      topIssue: state === 'good' ? null : this.topIssue(),
      severities: { ...this.sev },
      alert,
      absentSec: 0,
      stillMinutes,
    };
  }

  /** Problem z największą ważoną karą: o nim mówi komunikat. */
  topIssue(): IssueId | null {
    let best: IssueId | null = null;
    let bestVal = 0;
    for (const d of ISSUE_DEFS) {
      const s = this.sev[d.id] ?? 0;
      if (s < 0.25) continue; // pomijamy drobne odchylenia
      const v = s * d.weight;
      if (v > bestVal) {
        bestVal = v;
        best = d.id;
      }
    }
    if (!best && (this.sev.stillness ?? 0) > 0) return 'stillness';
    return best;
  }

  private updateStillness(t: number, m: PostureMetrics): number {
    this.noseHist.push({ t, x: m.noseX, y: m.noseY, e: m.eyeDistPx });
    while (this.noseHist.length && t - this.noseHist[0].t > STILL_WINDOW_SEC) this.noseHist.shift();
    const span = this.noseHist.length ? t - this.noseHist[0].t : 0;
    if (span < STILL_WINDOW_SEC * 0.8) return this.stillSince === null ? 0 : (t - this.stillSince) / 60;
    const n = this.noseHist.length;
    const mx = this.noseHist.reduce((s, p) => s + p.x, 0) / n;
    const my = this.noseHist.reduce((s, p) => s + p.y, 0) / n;
    const me = this.noseHist.reduce((s, p) => s + p.e, 0) / n;
    const sd = Math.sqrt(this.noseHist.reduce((s, p) => s + (p.x - mx) ** 2 + (p.y - my) ** 2, 0) / n);
    if (sd / me < STILL_THRESHOLD) {
      if (this.stillSince === null) this.stillSince = t - span;
    } else {
      this.stillSince = null;
    }
    return this.stillSince === null ? 0 : (t - this.stillSince) / 60;
  }

  /** Wywoływane po przerwie: zeruje licznik bezruchu. */
  resetStillness(): void {
    this.noseHist = [];
    this.stillSince = null;
  }
}
