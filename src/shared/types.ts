// Typy współdzielone przez proces główny, preload i interfejs.

export type IssueId =
  | 'headForward'
  | 'slouch'
  | 'headTilt'
  | 'shoulderTilt'
  | 'tooClose'
  | 'twist'
  | 'stillness';

export type PostureState = 'good' | 'warn' | 'bad' | 'absent' | 'paused';

export type FatigueLevel = 'fresh' | 'tired' | 'veryTired';

export interface Settings {
  /** Mnożnik progów: <1 bardziej czuły, >1 mniej czuły. */
  sensitivity: number;
  /** Ile sekund złej postawy przed alertem. */
  alertDelaySec: number;
  /** Minimalna przerwa między alertami postawy (min). */
  alertCooldownMin: number;
  eyeBreakMin: number;
  microBreakMin: number;
  moveBreakMin: number;
  workStart: string; // "08:00"
  workEnd: string; // "17:00"
  onlyWorkHours: boolean;
  doNotDisturb: boolean;
  faceAnalysis: boolean;
  activityTracking: boolean;
  miniWidget: boolean;
  autostart: boolean;
  soundAlerts: boolean;
  cameraId: string;
  /** Odbicie lustrzane podglądu. */
  mirror: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: 1,
  alertDelaySec: 30,
  alertCooldownMin: 5,
  eyeBreakMin: 20,
  microBreakMin: 30,
  moveBreakMin: 55,
  workStart: '08:00',
  workEnd: '17:00',
  onlyWorkHours: false,
  doNotDisturb: false,
  faceAnalysis: true,
  activityTracking: true,
  miniWidget: false,
  autostart: false,
  soundAlerts: false,
  cameraId: '',
  mirror: true,
};

/** Surowe metryki postawy z jednej analizy (ujęcie z przodu). */
export interface PostureMetrics {
  /** (y linii barków − y nosa) / szerokość barków. Maleje przy wysuwaniu głowy i opadaniu szyi. */
  neckRatio: number;
  /** (y linii barków − y linii uszu) / szerokość barków. Maleje przy garbieniu. */
  earRatio: number;
  /** Kąt linii oczu względem poziomu, stopnie. */
  headRollDeg: number;
  /** Kąt linii barków względem poziomu, stopnie. */
  shoulderTiltDeg: number;
  /** Rozstaw oczu w pikselach (wielkość twarzy → odległość od ekranu). */
  eyeDistPx: number;
  /** Szerokość barków / rozstaw oczu (spada przy skręcie tułowia). */
  shoulderToEye: number;
  /** Środek nosa w pikselach (do detekcji ruchu/bezruchu). */
  noseX: number;
  noseY: number;
  /** Pochylenie głowy z macierzy twarzy (dodatnie = w dół), stopnie; null bez modelu twarzy. */
  headPitchDeg?: number | null;
  /** Obrót głowy w bok, stopnie; null bez modelu twarzy. */
  headYawDeg?: number | null;
}

export interface Calibration {
  createdAt: number;
  neckRatio: number;
  earRatio: number;
  headRollDeg: number;
  shoulderTiltDeg: number;
  eyeDistPx: number;
  shoulderToEye: number;
  /** Współczynnik otwarcia oka (EAR) przy otwartych oczach. */
  earOpen: number | null;
  /** Pochylenie głowy przy prostej postawie (stare kalibracje go nie mają). */
  headPitchDeg?: number | null;
}

export interface IssueReading {
  id: IssueId;
  /** 0–1: jak mocno przekroczony próg. */
  severity: number;
  /** Odchylenie w jednostkach czytelnych dla człowieka (%, °). */
  value: number;
  unit: '%' | '°';
}

export interface FatigueSnapshot {
  /** 0–100. */
  percent: number;
  level: FatigueLevel;
  blinkRate: number | null; // mrugnięcia / min
  perclos: number | null; // 0–1
  longBlinksPerMin: number | null;
  yawns10m: number;
  nods10m: number;
  faceReliable: boolean;
}

/** Agregat z jednej minuty, wysyłany do procesu głównego i zapisywany w SQLite. */
export interface MinuteSample {
  ts: number; // początek minuty (ms)
  present: number; // 0–1 udział czasu przy biurku
  posture: number | null; // średni wynik 0–100
  goodRatio: number | null; // udział czasu w dobrej postawie
  fatigue: number | null; // 0–100
  blinkRate: number | null;
  perclos: number | null;
  longBlinks: number | null;
  yawns: number;
  issues: Partial<Record<IssueId, number>>; // sekundy z danym problemem
  kb?: number;
  mouse?: number;
}

export type BreakKind = 'eye' | 'micro' | 'move';

export interface BreakSuggestion {
  kind: BreakKind;
  reason: 'timer' | 'alerts' | 'fatigue' | 'posture-trend';
  exerciseId: string;
}

export interface LiveStatus {
  state: PostureState;
  score: number | null;
  fatigue: FatigueSnapshot | null;
  topIssue: IssueId | null;
  minutesSinceBreak: number;
  note?: string;
}

export interface GarminDay {
  date: string; // YYYY-MM-DD
  sleepHours: number | null;
  sleepScore: number | null;
  stressAvg: number | null;
  bodyBatteryHigh: number | null;
  bodyBatteryLow: number | null;
  restingHr: number | null;
  hrv: number | null;
}

export interface StatsPayload {
  today: {
    minutes: MinuteSample[];
    goodPercent: number | null;
    avgPosture: number | null;
    avgFatigue: number | null;
    avgBlinkRate: number | null;
    breaksTaken: number;
    alerts: number;
    presentMinutes: number;
    topIssue: IssueId | null;
  };
  heatmap: { weekday: number; hour: number; form: number; minutes: number }[];
  bestHours: string | null;
  dipText: string | null;
  daysOfData: number;
  weekTopIssue: IssueId | null;
  weekIssueShare: Partial<Record<IssueId, number>>;
  garmin: { lastNight: GarminDay | null; insight: string | null; connected: boolean };
}

export interface AppEvent {
  type: 'alert' | 'break-suggested' | 'break-done' | 'break-snoozed' | 'calibrated';
  detail?: string;
}
