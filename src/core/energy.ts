// „Bateria” (zadanie A6, S1): jedna liczba 0–100, którą każdy rozumie od razu,
// plus prognoza „za ile minut spadnie poniżej 30%”.
//
// Bateria = 100 − ważona suma „kosztów”:
//  - zmęczenie z twarzy (wskaźnik zmęczenia 0–100)       waga 0,50
//  - postawa: ile średni wynik z 15 min jest poniżej 90    waga 0,25
//  - czas od ostatniej przerwy (od 20 do 90 min)           waga 0,15
//  - Body Battery z zegarka rano (Garmin), jeśli jest      waga 0,10
// Brak składowej = jej waga rozkłada się na pozostałe.

export interface EnergyInputs {
  fatiguePercent: number | null;
  postureAvg15: number | null;
  minutesSinceBreak: number;
  /** Body Battery rano (0–100) z Garmina; null bez zegarka. */
  morningBodyBattery: number | null;
}

export const ENERGY_WEIGHTS = { fatigue: 0.5, posture: 0.25, time: 0.15, body: 0.1 } as const;
export const ENERGY_LOW = 30;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function energyPercent(i: EnergyInputs): number {
  const costs: { w: number; c: number | null }[] = [
    { w: ENERGY_WEIGHTS.fatigue, c: i.fatiguePercent === null ? null : clamp(i.fatiguePercent, 0, 100) },
    { w: ENERGY_WEIGHTS.posture, c: i.postureAvg15 === null ? null : clamp(((90 - i.postureAvg15) / 60) * 100, 0, 100) },
    { w: ENERGY_WEIGHTS.time, c: clamp(((i.minutesSinceBreak - 20) / 70) * 100, 0, 100) },
    { w: ENERGY_WEIGHTS.body, c: i.morningBodyBattery === null ? null : clamp(100 - i.morningBodyBattery, 0, 100) },
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
  if (points.length < 10) return null;
  const last = points[points.length - 1];
  const recent = points.filter((p) => last.min - p.min <= 30);
  if (recent.length < 10) return null;
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
  if (slope > -0.1 || now <= ENERGY_LOW) return null;
  const mins = (now - ENERGY_LOW) / -slope;
  return mins > 180 ? null : Math.max(1, Math.round(mins));
}
