// „Bateria” (zadanie A6, S1): jedna liczba 0–100, którą każdy rozumie od razu,
// plus prognoza „za ile minut spadnie poniżej 30%”.
//
// Bateria = 100 − ważona suma „kosztów”:
//  - zmęczenie z twarzy (wskaźnik zmęczenia 0–100)       waga 0,50
//  - postawa: ile średni wynik z 15 min jest poniżej 90    waga 0,25
//  - czas od ostatniej przerwy (od 20 do 90 min)           waga 0,15
// Brak składowej = jej waga rozkłada się na pozostałe.

export interface EnergyInputs {
  fatiguePercent: number | null;
  postureAvg15: number | null;
  minutesSinceBreak: number;
}

export const ENERGY_WEIGHTS = { fatigue: 0.5, posture: 0.25, time: 0.15 } as const;
export const ENERGY_LOW = 30;

// Koszt postawy: 0 przy średnim wyniku ≥ 90, pełny (100) przy 30 i niżej (90 − 60).
const POSTURE_COST_FROM = 90;
const POSTURE_COST_SPAN = 60;
// Koszt czasu: 0 do 20 min od przerwy, pełny po 90 min (20 + 70).
const TIME_COST_FROM_MIN = 20;
const TIME_COST_SPAN_MIN = 70;
// Prognoza: okno 30 min, co najmniej 10 punktów, spadek szybszy niż 0,1 pkt/min, horyzont do 3 h.
const FORECAST_WINDOW_MIN = 30;
const FORECAST_MIN_POINTS = 10;
const FORECAST_MIN_DROP_PER_MIN = 0.1;
const FORECAST_MAX_MIN = 180;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function energyPercent(i: EnergyInputs): number {
  const costs: { w: number; c: number | null }[] = [
    { w: ENERGY_WEIGHTS.fatigue, c: i.fatiguePercent === null ? null : clamp(i.fatiguePercent, 0, 100) },
    { w: ENERGY_WEIGHTS.posture, c: i.postureAvg15 === null ? null : clamp(((POSTURE_COST_FROM - i.postureAvg15) / POSTURE_COST_SPAN) * 100, 0, 100) },
    { w: ENERGY_WEIGHTS.time, c: clamp(((i.minutesSinceBreak - TIME_COST_FROM_MIN) / TIME_COST_SPAN_MIN) * 100, 0, 100) },
  ];
  let sum = 0;
  let w = 0;
  for (const k of costs) {
    if (k.c === null) continue;
    sum += k.w * k.c;
    w += k.w;
  }
  return Math.round(100 - (w ? sum / w : 0));
}

export interface EnergyPoint {
  /** Minuty (dowolne zero). */
  min: number;
  energy: number;
}

/**
 * Prognoza: prosta dopasowana do ostatnich 30 minut. Zwraca, za ile minut bateria spadnie
 * poniżej 30%, albo null, gdy nie spada, jest już nisko albo danych jest za mało (< 10 min)
 * lub prognoza sięga dalej niż 3 h (zbyt niepewna).
 */
export function minutesUntilLow(points: EnergyPoint[]): number | null {
  if (points.length < FORECAST_MIN_POINTS) return null;
  const last = points[points.length - 1];
  const recent = points.filter((p) => last.min - p.min <= FORECAST_WINDOW_MIN);
  if (recent.length < FORECAST_MIN_POINTS) return null;
  const n = recent.length;
  const mx = recent.reduce((a, p) => a + p.min, 0) / n;
  const my = recent.reduce((a, p) => a + p.energy, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of recent) {
    num += (p.min - mx) * (p.energy - my);
    den += (p.min - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den; // punkty na minutę
  const now = my + slope * (last.min - mx); // wygładzona bieżąca wartość
  if (slope > -FORECAST_MIN_DROP_PER_MIN || now <= ENERGY_LOW) return null;
  const mins = (now - ENERGY_LOW) / -slope;
  return mins > FORECAST_MAX_MIN ? null : Math.max(1, Math.round(mins));
}
