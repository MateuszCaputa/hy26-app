// Typy współdzielone przez proces główny, preload i interfejs.

export type IssueId =
  | 'headForward'
  | 'headBack'
  | 'shrug'
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
  /** Powiadomienia systemowe, gdy mini-widget jest wyłączony (z widgetem przypomnienia są w okienku pod nim). */
  systemNotifications: boolean;
  /** Język interfejsu (domyślnie polski). */
  language: 'pl' | 'en';
  /** Wygląd mini-widgetu: karta (wynik + stan + zmęczenie) albo mała pigułka z samą liczbą. */
  widgetStyle: 'card' | 'pill';
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
  // Domyślnie wyłączone: na macOS wymaga uprawnienia Dostępności, co myli przy pierwszym uruchomieniu.
  activityTracking: false,
  miniWidget: false,
  systemNotifications: true,
  language: 'pl',
  widgetStyle: 'card',
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
  /** Środek linii barków (y) w pikselach: odróżnia uniesienie barków od opadania głowy. */
  shoulderY?: number;
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
  /** Położenie nosa i barków (y, piksele) przy prostej postawie (stare kalibracje ich nie mają). */
  noseY?: number;
  shoulderY?: number;
  /** Drugi krok kalibracji: zwykła (zgarbiona) pozycja – osobisty zakres progów. */
  slouch?: SlouchReference;
}

export interface SlouchReference {
  neckRatio: number;
  earRatio: number;
  headPitchDeg: number | null;
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
  /** Składowe wskaźnika jako kara 0–1 (null = brak danych) – do „Dlaczego tyle?” w widoku na żywo. */
  components?: Record<'perclos' | 'blink' | 'long' | 'yawn' | 'posture' | 'time', number | null>;
  /** Wejścia spoza oczu, pokazywane przy składowych. */
  postureAvg15?: number | null;
  minutesSinceBreak?: number;
  /** Tryb prezentacji: sygnały oczu są symulowane (etykieta „SYMULACJA”, nie trafia do bazy). */
  simulated?: boolean;
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

/** Dyskretna podpowiedź w rogu ekranu (zamiast powiadomienia systemowego). */
export interface Nudge {
  kind: 'eye' | 'break' | 'posture';
  title: string;
  body: string;
  /** Odliczanie (np. 20 s patrzenia w dal); bez niego podpowiedź sama znika po chwili. */
  seconds?: number;
  /** Ćwiczenie z okienka przerwy: „Start” otwiera właśnie je. */
  exerciseId?: string;
  /** Skąd okienko się wysuwa: spod widgetu (w dół) albo znad niego (w górę). Ustawia proces główny. */
  from?: 'below' | 'above';
}

export type NudgeAction = 'start' | 'snooze' | 'dismiss' | 'eye-done';

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
  /** Do dwóch bieżących problemów, najważniejszy pierwszy. */
  issues?: IssueId[];
  minutesSinceBreak: number;
  note?: string;
  /** „Bateria” 0–100 i prognoza spadku poniżej 30% (null = nie spada / za mało danych). */
  energy?: { percent: number; minutesToLow: number | null } | null;
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
    /** Czasy (ms) zrobionych przerw i alertów postawy – znaczniki na wykresie dnia. */
    breakTimes: number[];
    alertTimes: number[];
  };
  /** Wczoraj, do porównania przy liczbach („↑ 5 vs wczoraj”); null, gdy wczoraj nie było pracy. */
  yesterday: {
    goodPercent: number | null;
    avgPosture: number | null;
    avgFatigue: number | null;
    avgBlinkRate: number | null;
    breaksTaken: number;
    presentMinutes: number;
  } | null;
  /** Ostatnie 7 dni (z dziś, od najstarszego) do wykresów słupkowych; null = brak danych tego dnia. */
  last7: { date: string; weekday: number; avgFatigue: number | null; goodPercent: number | null; presentMinutes: number }[];
  /** Ostatnie 30 dni (z dziś, od najstarszego) do wyboru zakresu w Statystykach; null = brak pracy tego dnia. */
  last30: {
    date: string;
    weekday: number;
    /** Dzień miesiąca (podpis osi). */
    day: number;
    goodPercent: number | null;
    avgPosture: number | null;
    avgFatigue: number | null;
    presentMinutes: number;
    breaks: number;
    alerts: number;
  }[];
  heatmap: { weekday: number; hour: number; form: number; minutes: number }[];
  bestHours: string | null;
  dipText: string | null;
  daysOfData: number;
  weekTopIssue: IssueId | null;
  weekIssueShare: Partial<Record<IssueId, number>>;
  /** Wzorzec z 14 dni do karty „Do kogo iść?” (core/carePattern.ts); brak = nie liczono. */
  care?: CarePattern;
}

export type CareKind = 'neck' | 'back' | 'eyes';

/** Utrzymujący się wzorzec z ostatnich 14 dni. To nie diagnoza, tylko liczba dni z danym problemem. */
export interface CarePattern {
  kind: CareKind | null;
  days: number;
  /** Spełnione wzorce (najwięcej dni pierwszy): liczby, tekst składa renderer. */
  evidence: CareEvidence[];
}

export interface CareEvidence {
  kind: CareKind;
  /** Dni z 14 z wzorcem. */
  days: number;
  /** Średnio minut dziennie z problemem w tych dniach. */
  avgMinutes: number;
}

export interface AppEvent {
  type: 'alert' | 'break-suggested' | 'break-done' | 'break-snoozed' | 'calibrated';
  detail?: string;
}
