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
  /** Pochylenie głowy w stopniach z macierzy twarzy (dodatnie = w dół), jeśli dostępne. */
  pitchDeg?: number | null;
}

// Przy 25 kl./s mrugnięcie widziane w jednej klatce trwa 0,04 s – próg 0,05 s je gubił (BADANIE-OCZU #3).
const BLINK_MIN = 0.02;
const BLINK_MAX = 0.4; // dłużej = długie mrugnięcie
const LONG_MAX = 3.0; // dłużej = raczej patrzenie w dół (klawiatura), nie liczymy
// Test na żywo (okulary): mrugnięcie dawało zamknięcie ok. 0,59 i nie przekraczało 0,6. Węższa histereza
// rozdziela też szybkie mrugnięcia, które przy CLOSE_OFF 0,4 zlewały się w jedno „długie”.
const CLOSE_ON = 0.52;
const CLOSE_OFF = 0.42;
/** Długie mrugnięcie = oko naprawdę zamknięte przez większość czasu, nie seria szybkich mrugnięć. */
const LONG_MIN_CLOSED_SHARE = 0.6;
const PERCLOS_CLOSED = 0.8; // oko zamknięte w co najmniej 80%
const YAWN_JAW = 0.55;
const YAWN_MIN_SEC = 1.5;
const YAWN_MAX_SEC = 6; // dłużej otwarte usta = jedzenie, picie, śmiech – nie ziewnięcie
const MIN_FPS_FOR_BLINKS = 12;
/** Głowa pochylona o tyle w dół względem wzorca = patrzenie na klawiaturę: nie oceniamy powiek. */
export const GAZE_DOWN_DEG = 12;
/** Okno liczby mrugnięć: mruganie zmienia się 4–5× z czynnością, 60 s to za mało (BADANIE-OCZU #6). */
const BLINK_WINDOW_SEC = 180;
const BLINK_MIN_SPAN_SEC = 60;
/** Mówienie: żuchwa „pracuje” (odchylenie jawOpen w 2 s), ale nie jest otwarta jak przy ziewaniu. */
const TALK_JAW_STD = 0.08;

interface PerclosSample { t: number; dt: number; closed: boolean }

/** Podgląd diagnostyczny oczu (klawisz D w widoku „Na żywo”). */
export interface EyeDebug {
  closed: number | null; // 0 otwarte – 1 zamknięte (po wszystkich poprawkach)
  ear: number | null;
  earRef: number | null;
  blend: number | null; // surowy eyeBlink z MediaPipe
  blendRel: number | null; // eyeBlink względem osobistej normy
  blinksTotal: number; // licznik od startu – rośnie od razu po mrugnięciu
  longTotal: number;
  rate: number | null;
  closeOn: number;
  reliable: boolean;
  fps: number;
  gazeDown: boolean;
  talking: boolean;
}

const median = (v: number[]): number => {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
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
  /** Surowy eyeBlink z MediaPipe przy otwartych oczach (osobista „zerowa” wartość). */
  private blendOpenHist: { t: number; v: number }[] = [];
  private pitchHist: { t: number; v: number }[] = [];
  private calibratedPitch: number | null = null;
  private jawHist: { t: number; v: number }[] = [];
  /** Odcinki czasu z mówieniem (do wyłączenia z liczby mrugnięć). */
  private talkSamples: { t: number; dt: number }[] = [];
  private blinkTalking: boolean[] = [];
  private gazeDown = false;
  private talking = false;
  private last: { closed: number | null; ear: number | null; blend: number | null } = { closed: null, ear: null, blend: null };
  private blinksTotal = 0;
  /** Zamknięcie oka z ostatnich 60 s – do progu mrugnięcia dopasowanego do osoby. */
  private closedHist: { t: number; v: number }[] = [];
  private longTotal = 0;

  constructor(private calibratedEarOpen: number | null = null) {}

  setCalibratedEarOpen(v: number | null): void {
    this.calibratedEarOpen = v;
  }

  /** Pochylenie głowy z kalibracji: wzorzec dla „patrzę w dół”. */
  setCalibratedPitch(v: number | null): void {
    this.calibratedPitch = v;
  }

  /** Czy w ostatniej klatce głowa była pochylona w dół (klawiatura, notatki). */
  isGazeDown(): boolean {
    return this.gazeDown;
  }

  debug(t: number): EyeDebug {
    return {
      closed: this.last.closed,
      ear: this.last.ear,
      earRef: this.earOpenRef(),
      blend: this.last.blend,
      blendRel: this.last.blend === null ? null : this.blendRelative(this.last.blend),
      blinksTotal: this.blinksTotal,
      longTotal: this.longTotal,
      rate: this.blinkRate(t),
      closeOn: this.blinkThresholds().on,
      reliable: this.isReliable(t),
      fps: this.fps(t),
      gazeDown: this.gazeDown,
      talking: this.talking,
    };
  }

  /**
   * Progi mrugnięcia: poziom „otwarte” (mediana) + typowa głębokość mrugnięcia (98. percentyl) z ostatnich 60 s.
   * Próg „zamknięte” w połowie drogi, ale nie wyżej niż stałe 0,52 i nie niżej niż 0,3 (szum przy otwartym oku).
   */
  blinkThresholds(): { on: number; off: number } {
    if (this.closedHist.length < 250) return { on: CLOSE_ON, off: CLOSE_OFF }; // ok. 10 s danych
    const s = this.closedHist.map((x) => x.v).sort((a, b) => a - b);
    const base = s[Math.floor(s.length * 0.5)];
    const peak = s[Math.floor(s.length * 0.98)];
    if (peak - base < 0.15) return { on: CLOSE_ON, off: CLOSE_OFF }; // brak wyraźnych mrugnięć – zostajemy przy stałym
    const on = Math.min(CLOSE_ON, Math.max(0.3, base + 0.5 * (peak - base)));
    return { on, off: Math.max(base + 0.05, on - 0.1) };
  }

  private countBlink(t: number): void {
    this.blinks.push(t);
    this.blinkTalking.push(this.talking);
    this.blinksTotal++;
  }

  /** Czy w ostatnich ~2 s użytkownik mówił. */
  isTalking(): boolean {
    return this.talking;
  }

  /**
   * eyeBlink z MediaPipe względem osobistej normy: u części osób (oczy wąskie, opadające powieki, okulary)
   * ma 0,3–0,7 przy OTWARTYCH oczach. Odejmujemy medianę z chwil, gdy EAR mówi „otwarte” (BADANIE-OCZU #2).
   */
  private blendRelative(b: number): number {
    if (this.blendOpenHist.length < 30) return b <= 0.85 ? 0 : b; // zanim poznamy normę: tylko pewne zamknięcia
    const base = Math.min(0.9, median(this.blendOpenHist.map((x) => x.v)));
    return clamp01((b - base) / (1 - base));
  }

  /**
   * Bieżący wzorzec „oko otwarte”: 90. percentyl EAR z ostatnich 30 s (mrugnięcia są krótkie, więc p90 ≈ oko otwarte).
   * Kalibracja służy tylko na start. Wcześniej brała górę (max z kalibracją ×0,85): kalibracja z EAR 0,56 przy
   * prawdziwym 0,29 robiła z otwartego oka „zamknięte” i licznik mrugnięć stał na zerze (test na żywo, 23:04).
   */
  earOpenRef(): number | null {
    if (this.earHist.length < 30) return this.calibratedEarOpen;
    const s = this.earHist.map((e) => e.v).sort((a, b) => a - b);
    return s[Math.floor(s.length * 0.9)];
  }

  /** Stopień zamknięcia oka 0 (otwarte) – 1 (zamknięte). */
  closedness(f: FaceFrame): number | null {
    let c: number | null = null;
    const ref = this.earOpenRef();
    if (f.ear !== null && ref) {
      const closedEar = ref * 0.35;
      c = 1 - clamp01((f.ear - closedEar) / (ref - closedEar));
    }
    if (f.blinkBlend !== null) {
      const rel = this.blendRelative(f.blinkBlend);
      c = c === null ? rel : Math.max(c, rel);
    }
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

    // Mówienie: zmienność otwarcia żuchwy w ostatnich 2 s.
    if (f.jawOpen !== null) {
      this.jawHist.push({ t, v: f.jawOpen });
      while (this.jawHist.length && t - this.jawHist[0].t > 2) this.jawHist.shift();
      const v = this.jawHist.map((x) => x.v);
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      const std = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
      this.talking = v.length >= 10 && std >= TALK_JAW_STD && mean < YAWN_JAW;
      if (this.talking) this.talkSamples.push({ t, dt });
    }

    // Patrzenie w dół (klawiatura, telefon): powieka opada za wzrokiem – to nie mrugnięcie ani senność.
    // Wzorzec = mediana z ostatnich 20 s ze WSZYSTKICH klatek: dłuższe pochylenie (garbienie, niżej ustawiony laptop)
    // staje się nową normą, a odcinamy tylko krótkie zerknięcia w dół. Wcześniej wzorzec z kalibracji / sprzed
    // pochylenia „zamrażał” bramkę i ignorowała prawie wszystkie mrugnięcia (test na żywo).
    if (f.pitchDeg != null) {
      this.pitchHist.push({ t, v: f.pitchDeg });
      while (this.pitchHist.length && t - this.pitchHist[0].t > 20) this.pitchHist.shift(); // ~10 s na dopasowanie
      const base = this.pitchHist.length >= 30 ? median(this.pitchHist.map((x) => x.v)) : this.calibratedPitch;
      this.gazeDown = base !== null && f.pitchDeg - base > GAZE_DOWN_DEG;
    } else this.gazeDown = false;
    if (this.gazeDown) {
      this.closure = null; // zamknięcie w trakcie patrzenia w dół nie liczy się ani jako mrugnięcie, ani długie
      this.prune(t);
      return;
    }

    const c = this.closedness(f) ?? 0;
    this.last = { closed: c, ear: f.ear, blend: f.blinkBlend };
    // Wszystkie próbki (nie tylko „otwarte”): wzorzec musi się sam poprawić, gdy startowy jest zły.
    if (f.ear !== null) {
      this.earHist.push({ t, v: f.ear });
      while (this.earHist.length && t - this.earHist[0].t > 30) this.earHist.shift();
    }
    // Norma eyeBlink: tylko gdy EAR pewnie mówi „otwarte” (żeby norma nie uczyła się z mrugnięć).
    const ref = this.earOpenRef();
    if (f.blinkBlend !== null && f.ear !== null && ref && f.ear >= ref * 0.8) {
      this.blendOpenHist.push({ t, v: f.blinkBlend });
      while (this.blendOpenHist.length && t - this.blendOpenHist[0].t > 60) this.blendOpenHist.shift();
    }

    // Mrugnięcia: histereza CLOSE_ON / CLOSE_OFF, dopasowana do osoby. U części osób punkty powiek z MediaPipe
    // przy mrugnięciu „domykają się” tylko do ~0,4–0,5 (wygładzanie modelu, okulary) – stały próg 0,52 je gubił.
    this.closedHist.push({ t, v: c });
    while (this.closedHist.length && t - this.closedHist[0].t > 60) this.closedHist.shift();
    const { on: closeOn, off: closeOff } = this.blinkThresholds();
    const sample = { t, dt, closed: c >= PERCLOS_CLOSED };
    this.perclosSamples.push(sample);
    if (this.closure === null && c >= closeOn) {
      this.closure = { start: t, samples: [] };
    }
    if (this.closure) {
      this.closure.samples.push(sample);
      const d = t - this.closure.start;
      if (d > LONG_MAX) {
        // Zamknięcia > 3 s traktujemy jak patrzenie w dół: nie trafiają do PERCLOS.
        for (const s of this.closure.samples) s.closed = false;
      }
      if (c <= closeOff) {
        const closedShare = this.closure.samples.filter((s) => s.closed).length / this.closure.samples.length;
        if (d >= BLINK_MIN && d <= BLINK_MAX) this.countBlink(t);
        else if (d > BLINK_MAX && d <= LONG_MAX) {
          if (closedShare >= LONG_MIN_CLOSED_SHARE) {
            this.longBlinks.push(t);
            this.longTotal++;
          } else this.countBlink(t); // seria szybkich mrugnięć bez pełnego otwarcia – to nie senność
        }
        this.closure = null;
      }
    }

    // Ziewanie: usta szeroko otwarte 1,5–6 s i zamknięte z powrotem (dłużej = jedzenie, picie, śmiech).
    if (f.jawOpen !== null && f.jawOpen >= YAWN_JAW) {
      if (this.yawnStart === null) {
        this.yawnStart = t;
        this.yawnCounted = false;
      }
    } else if (this.yawnStart !== null) {
      const d = t - this.yawnStart;
      if (d >= YAWN_MIN_SEC && d <= YAWN_MAX_SEC && !this.yawnCounted) {
        this.yawns.push(t);
        this.yawnCounted = true;
      }
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
    while (this.blinks.length && t - this.blinks[0] > 300) {
      this.blinks.shift();
      this.blinkTalking.shift();
    }
    while (this.talkSamples.length && t - this.talkSamples[0].t > BLINK_WINDOW_SEC) this.talkSamples.shift();
    keep(this.longBlinks, 300);
    keep(this.yawns, 600);
    keep(this.nods, 600);
    while (this.perclosSamples.length && t - this.perclosSamples[0].t > 60) this.perclosSamples.shift();
  }

  /**
   * Mrugnięcia na minutę z ostatnich 3 min, bez odcinków z mówieniem (mówienie podwaja mruganie).
   * null, gdy za mało wiarygodnych danych (min. 60 s bez mówienia).
   */
  blinkRate(t: number): number | null {
    if (!this.isReliable(t) || this.firstReliableT === null) return null;
    const span = Math.min(BLINK_WINDOW_SEC, t - this.firstReliableT);
    let talkSec = 0;
    for (const s of this.talkSamples) if (t - s.t <= span) talkSec += s.dt;
    const quietSpan = span - talkSec;
    if (quietSpan < BLINK_MIN_SPAN_SEC) return null;
    let n = 0;
    for (let i = 0; i < this.blinks.length; i++) if (t - this.blinks[i] <= span && !this.blinkTalking[i]) n++;
    return (n / quietSpan) * 60;
  }

  /** Zmęczenie OCZU (suche oko), nie senność: przy ekranie mruga się ok. 7/min zamiast ~17 (Tsubota 1993). */
  eyeStrain(t: number): boolean {
    const r = this.blinkRate(t);
    return r !== null && r < 8;
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
    // Przy ekranie ok. 7/min to norma (to „zmęczenie oczu”, nie senność), mówienie jest już wyłączone z liczby.
    // Senność podnosi wynik dopiero przy bardzo rzadkim (< 4/min, „gapienie się”) albo bardzo częstym mruganiu.
    blink:
      i.blinkRate === null
        ? null
        : Math.max(clamp01((4 - i.blinkRate) / 3), clamp01((i.blinkRate - 28) / 15)),
    long: i.longBlinksPerMin === null ? null : clamp01(i.longBlinksPerMin / 3),
    // „Skinienia” to prawie zawsze zerknięcia na klawiaturę – pokazujemy je, ale nie liczymy (BADANIE-OCZU #4).
    yawn: clamp01(i.yawns10m / 2),
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

/**
 * Czy dane z oczu nadają się do oceny zmęczenia: twarz wiarygodna (światło, odblaski okularów, fps)
 * i jest już mruganie albo PERCLOS. Bez tego wynik składałby się tylko z postawy, czasu i opadania głowy,
 * czyli nie mówiłby nic o zmęczeniu.
 */
export function eyesUsable(reliable: boolean, blinkRate: number | null, perclos: number | null): boolean {
  return reliable && (blinkRate !== null || perclos !== null);
}

/**
 * Tryb prezentacji (pokaz dla jury): sygnały oczu przesuwają się od bieżących w stronę typowego zmęczenia.
 * k = 0 → bez zmian, k = 1 → mruganie 3/min („gapienie się”), PERCLOS 20%, 2,5 długiego mrugnięcia/min, +3 ziewnięcia.
 * Postawa i czas od przerwy zostają prawdziwe. Wynik musi być oznaczony jako symulacja.
 */
export function simulateTired(i: FatigueInputs, k: number): FatigueInputs {
  const q = clamp01(k);
  const lerp = (from: number, to: number) => from + (to - from) * q;
  return {
    ...i,
    blinkRate: lerp(i.blinkRate ?? 7, 3),
    perclos: lerp(i.perclos ?? 0.03, 0.2),
    longBlinksPerMin: lerp(i.longBlinksPerMin ?? 0, 2.5),
    yawns10m: i.yawns10m + Math.round(3 * q),
  };
}

/** Wygładza wskaźnik zmęczenia (stała czasowa ~60 s), by nie skakał co klatkę. */
export class FatigueEstimator {
  private value: number | null = null;
  private lastT: number | null = null;

  /** null = oczy niewiarygodne: nie oceniamy zmęczenia (i nie przenosimy starej wartości dalej). */
  update(
    t: number,
    eyes: EyeAnalyzer,
    extra: { postureAvg15: number | null; minutesSinceBreak: number },
    /** Tryb prezentacji: siła symulacji 0–1 (patrz simulateTired); undefined = prawdziwe dane. */
    simulate?: number,
  ): FatigueSnapshot | null {
    const reliable = eyes.isReliable(t);
    const blinkRate = eyes.blinkRate(t);
    const perclos = eyes.perclos(t);
    const sim = simulate !== undefined;
    if (!sim && !eyesUsable(reliable, blinkRate, perclos)) {
      this.reset();
      return null;
    }
    const real: FatigueInputs = {
      blinkRate,
      perclos,
      longBlinksPerMin: eyes.longBlinksPerMin(t),
      yawns10m: eyes.yawns10m(t),
      nods10m: eyes.nods10m(t),
      ...extra,
    };
    const inputs = sim ? simulateTired(real, simulate) : real;
    const raw = fatiguePercent(inputs);
    const dt = this.lastT === null ? 0 : Math.max(0, t - this.lastT);
    this.lastT = t;
    // Symulacja na scenie: krótsze wygładzanie (~8 s), żeby zmiana była widoczna w czasie pokazu.
    this.value = this.value === null ? raw : this.value + (1 - Math.exp(-dt / (sim ? 8 : 60))) * (raw - this.value);
    const percent = Math.round(this.value);
    return {
      percent,
      level: fatigueLevel(percent),
      blinkRate: inputs.blinkRate,
      perclos: inputs.perclos,
      longBlinksPerMin: inputs.longBlinksPerMin,
      yawns10m: inputs.yawns10m,
      nods10m: inputs.nods10m,
      faceReliable: reliable,
      components: fatigueComponents(inputs),
      postureAvg15: inputs.postureAvg15,
      minutesSinceBreak: inputs.minutesSinceBreak,
      simulated: sim || undefined,
    };
  }

  /** Po przerwie zmęczenie oceniamy od nowa (część „czas od przerwy” spada do zera). */
  reset(): void {
    this.value = null;
    this.lastT = null;
  }
}
