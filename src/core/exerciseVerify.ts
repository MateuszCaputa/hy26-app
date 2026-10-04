// Weryfikacja ćwiczeń kamerą (zadanie A4, M4): liczy, czy ruch został wykonany, z tych samych metryk,
// które liczymy do oceny postawy. Nie ocenia techniki jak fizjoterapeuta: sprawdza zakres ruchu,
// czas utrzymania i powrót do pozycji wyjściowej.
//
// Pozycja wyjściowa = mediana z pierwszej sekundy po „Start” (nie kalibracja: na przerwie siedzi się różnie).
// Powtórzenie: sygnał ≥ `enter` przez co najmniej `minHoldMs`, potem powrót poniżej `exit` (histereza),
// a następne powtórzenie liczy się dopiero po `refractoryMs`.
//
// Sygnały (wszystkie względem pozycji wyjściowej):
//  - cofanie brody: o ile zmalała twarz (rozstaw oczu) bardziej niż barki → głowa cofa się względem tułowia;
//    odchylenie się całym ciałem zmniejsza oba i się znosi,
//  - unoszenie barków: o ile linia barków poszła w górę, w szerokościach barków,
//  - boczne rozciąganie szyi: przechył linii oczu w stopniach; liczymy sekundy utrzymania osobno na każdą stronę.
import type { PostureMetrics } from '../shared/types';
import { tr } from '../shared/i18n';

export type VerifyMode = 'reps' | 'hold-sides';

export type VerifySignal = 'head-back' | 'shoulders-up' | 'head-roll';

export interface VerifySpec {
  mode: VerifyMode;
  signal: VerifySignal;
  /** Powtórzenia (reps) albo sekundy na każdą stronę (hold-sides). */
  target: number;
  /** Próg wejścia w ruch i próg powrotu (histereza), w jednostkach sygnału. */
  enter: number;
  exit: number;
  /** Minimalny czas utrzymania ruchu, żeby powtórzenie się liczyło. */
  minHoldMs: number;
  refractoryMs: number;
  /** Krótka instrukcja pod licznikiem. */
  cue: string;
}

/** Ćwiczenia, które kamera z przodu rozpoznaje pewnie. Pozostałe zalicza się przyciskiem „Zrobione”. */
export const VERIFY_SPECS: Record<string, VerifySpec> = {
  // Test na żywo: sygnał cofania brody jest mały i drga – przy 1,5 s i wyjściu 0,015 krótkie spadki gubiły powtórzenie
  // (licznik migał na zielono, ale nie rósł). 0,8 s utrzymania i niższy próg wyjścia.
  'chin-tuck': { mode: 'reps', signal: 'head-back', target: 10, enter: 0.035, exit: 0.008, minHoldMs: 800, refractoryMs: 400, cue: tr('Cofnij brodę i przytrzymaj') },
  shrugs: { mode: 'reps', signal: 'shoulders-up', target: 10, enter: 0.06, exit: 0.025, minHoldMs: 150, refractoryMs: 300, cue: tr('Unieś barki do uszu i opuść') },
  'neck-side': { mode: 'hold-sides', signal: 'head-roll', target: 15, enter: 12, exit: 6, minHoldMs: 0, refractoryMs: 0, cue: tr('Przechyl głowę uchem do barku') },
};

export const canVerify = (exerciseId: string): boolean => exerciseId in VERIFY_SPECS;

const BASELINE_MS = 1000;
const BASELINE_MIN_SAMPLES = 4;

interface Baseline {
  eyeDistPx: number;
  shoulderWidthPx: number;
  shoulderY: number | null;
  headRollDeg: number;
}

export interface VerifyProgress {
  /** Zbieranie pozycji wyjściowej (pierwsza sekunda). */
  phase: 'baseline' | 'active' | 'done';
  /** Zaliczone powtórzenia (reps) albo pełne sekundy (hold-sides, suma obu stron). */
  count: number;
  /** Cel w tych samych jednostkach (hold-sides: 2 × target). */
  goal: number;
  /** 0–1. */
  fraction: number;
  /** Czy w tej chwili ruch jest wykonywany (do podświetlenia licznika). */
  inMove: boolean;
  /** hold-sides: sekundy po lewej i prawej. */
  sides?: { left: number; right: number };
  /** Brak sylwetki w ostatniej sekundzie. */
  lost: boolean;
  /** Największy zakres ruchu (jednostki sygnału) – do testów i diagnostyki. */
  peak: number;
}

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export class ExerciseVerifier {
  private base: Baseline | null = null;
  private baseSamples: PostureMetrics[] = [];
  private startT: number | null = null;
  private lastSeenT = -Infinity;
  private lastT: number | null = null;
  private inMove = false;
  private moveStartT = 0;
  private lastRepT = -Infinity;
  private reps = 0;
  private left = 0;
  private right = 0;
  private peak = 0;

  constructor(readonly spec: VerifySpec) {}

  /** Sygnał ruchu względem pozycji wyjściowej (null = metryka niedostępna w tej klatce). */
  private signal(m: PostureMetrics, b: Baseline): number | null {
    const sw = m.shoulderToEye * m.eyeDistPx;
    if (this.spec.signal === 'head-back') return sw / b.shoulderWidthPx - m.eyeDistPx / b.eyeDistPx;
    if (this.spec.signal === 'shoulders-up') return m.shoulderY == null || b.shoulderY === null ? null : (b.shoulderY - m.shoulderY) / b.shoulderWidthPx;
    return m.headRollDeg - b.headRollDeg;
  }

  /** Kolejna klatka: `t` w ms, `m` = bieżące metryki postawy albo null (brak osoby). */
  update(t: number, m: PostureMetrics | null): VerifyProgress {
    if (this.startT === null) this.startT = t;
    const dt = this.lastT === null ? 0 : Math.min(500, Math.max(0, t - this.lastT));
    this.lastT = t;
    if (m) this.lastSeenT = t;

    if (!this.base) {
      if (m) this.baseSamples.push(m);
      if (t - this.startT >= BASELINE_MS && this.baseSamples.length >= BASELINE_MIN_SAMPLES) {
        const s = this.baseSamples;
        const ys = s.map((x) => x.shoulderY).filter((y): y is number => y != null);
        this.base = {
          eyeDistPx: median(s.map((x) => x.eyeDistPx)),
          shoulderWidthPx: median(s.map((x) => x.shoulderToEye * x.eyeDistPx)),
          shoulderY: ys.length ? median(ys) : null,
          headRollDeg: median(s.map((x) => x.headRollDeg)),
        };
      }
      return this.progress(t);
    }
    if (this.isDone() || !m) return this.progress(t);

    const sig = this.signal(m, this.base);
    if (sig === null) return this.progress(t);
    const sp = this.spec;

    if (sp.mode === 'hold-sides') {
      const a = Math.abs(sig);
      this.peak = Math.max(this.peak, a);
      // Histereza: wchodzimy powyżej `enter`, wychodzimy poniżej `exit`; strona = znak przechyłu.
      this.inMove = this.inMove ? a >= sp.exit : a >= sp.enter;
      if (this.inMove) {
        if (sig > 0) this.left = Math.min(sp.target, this.left + dt / 1000);
        else this.right = Math.min(sp.target, this.right + dt / 1000);
      }
      return this.progress(t);
    }

    this.peak = Math.max(this.peak, sig);
    if (!this.inMove) {
      if (sig >= sp.enter && t - this.lastRepT >= sp.refractoryMs) {
        this.inMove = true;
        this.moveStartT = t;
      }
    } else if (sig < sp.exit) {
      // Powrót: liczymy tylko, jeśli ruch był utrzymany wystarczająco długo.
      if (t - this.moveStartT >= sp.minHoldMs) {
        this.reps++;
        this.lastRepT = t;
      }
      this.inMove = false;
    }
    return this.progress(t);
  }

  private isDone(): boolean {
    return this.spec.mode === 'reps' ? this.reps >= this.spec.target : this.left >= this.spec.target && this.right >= this.spec.target;
  }

  private progress(t: number): VerifyProgress {
    const sp = this.spec;
    const hold = sp.mode === 'hold-sides';
    const count = hold ? Math.floor(this.left) + Math.floor(this.right) : this.reps;
    const goal = hold ? 2 * sp.target : sp.target;
    return {
      phase: !this.base ? 'baseline' : this.isDone() ? 'done' : 'active',
      count,
      goal,
      fraction: Math.min(1, (hold ? this.left + this.right : this.reps) / goal),
      inMove: this.inMove,
      sides: hold ? { left: Math.floor(this.left), right: Math.floor(this.right) } : undefined,
      lost: t - this.lastSeenT > 1000,
      peak: this.peak,
    };
  }
}
