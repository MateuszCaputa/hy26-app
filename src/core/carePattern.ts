// Wzorzec, który się utrzymuje (14 dni) → podpowiedź „do kogo iść”. NIE diagnoza: liczymy tylko,
// ile dni z ostatnich 14 miało dużo minut z danym problemem z pomiarów. Czysta logika, bez Electrona.
import type { CarePattern, CareKind, IssueId, MinuteSample } from '../shared/types';
import { localDate } from './insights';

export const CARE_WINDOW_DAYS = 14;
/** Ile dni z 14 musi mieć wzorzec, żeby pokazać kartę. */
export const CARE_MIN_DAYS = 7;
/** Minimum minut dziennie z problemem, żeby dzień się liczył. */
export const CARE_MIN_MINUTES = 30;
/** Rzadkie mruganie: poniżej 8/min (ten sam próg co w podpowiedziach coacha). */
export const LOW_BLINK = 8;
/** Wysokie zmęczenie: 70%+ (poziom „bardzo zmęczony” w fatigue.ts). */
export const HIGH_FATIGUE = 70;

const NECK: IssueId[] = ['headForward', 'headBack', 'headTilt'];
const BACK: IssueId[] = ['slouch', 'shrug', 'shoulderTilt', 'twist'];

interface DayLoad {
  neck: number; // minuty
  back: number;
  eyes: number;
}

function dayLoad(samples: MinuteSample[]): DayLoad {
  let neck = 0;
  let back = 0;
  let eyes = 0;
  for (const s of samples) {
    if (s.present < 0.5) continue;
    for (const id of NECK) neck += s.issues[id] ?? 0;
    for (const id of BACK) back += s.issues[id] ?? 0;
    const lowBlink = s.blinkRate !== null && s.blinkRate < LOW_BLINK;
    const tired = s.fatigue !== null && s.fatigue >= HIGH_FATIGUE;
    if (lowBlink || tired) eyes++;
  }
  return { neck: neck / 60, back: back / 60, eyes };
}

/**
 * Czy w ostatnich 14 dniach (z dziś) utrzymuje się wzorzec:
 * - szyja / plecy: problem dominujący (więcej sekund niż druga grupa) i ≥ 30 min dziennie, w ≥ 7 dniach;
 * - oczy: ≥ 30 min dziennie z rzadkim mruganiem (< 8/min) lub zmęczeniem ≥ 70%, w ≥ 7 dniach.
 * Gdy spełnionych jest kilka, wybieramy ten z największą liczbą dni (remis: szyja > plecy > oczy).
 */
export function carePattern(samples: MinuteSample[], now: number): CarePattern {
  const byDate = new Map<string, MinuteSample[]>();
  for (const s of samples) {
    const d = localDate(s.ts);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(s);
  }
  const counts: Record<CareKind, { days: number; minutes: number }> = {
    neck: { days: 0, minutes: 0 },
    back: { days: 0, minutes: 0 },
    eyes: { days: 0, minutes: 0 },
  };
  for (let k = 0; k < CARE_WINDOW_DAYS; k++) {
    const noon = new Date(now);
    noon.setHours(12, 0, 0, 0);
    noon.setDate(noon.getDate() - k);
    const day = byDate.get(localDate(noon.getTime()));
    if (!day) continue;
    const l = dayLoad(day);
    const hit = (kind: CareKind, ok: boolean) => {
      if (!ok) return;
      counts[kind].days++;
      counts[kind].minutes += l[kind];
    };
    hit('neck', l.neck >= CARE_MIN_MINUTES && l.neck >= l.back);
    hit('back', l.back >= CARE_MIN_MINUTES && l.back > l.neck);
    hit('eyes', l.eyes >= CARE_MIN_MINUTES);
  }
  const triggered = (['neck', 'back', 'eyes'] as CareKind[])
    .filter((k) => counts[k].days >= CARE_MIN_DAYS)
    .sort((a, b) => counts[b].days - counts[a].days); // sort stabilny: remis zostawia kolejność szyja > plecy > oczy
  if (!triggered.length) return { kind: null, days: 0, evidence: [] };
  // Same liczby; tekst (w języku interfejsu) składa renderer/careCard.ts.
  const evidence = triggered.map((k) => ({ kind: k, days: counts[k].days, avgMinutes: Math.round(counts[k].minutes / counts[k].days) }));
  return { kind: triggered[0], days: counts[triggered[0]].days, evidence };
}
