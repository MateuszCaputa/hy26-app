// Metryki postawy z punktów MediaPipe Pose (33 punkty, ujęcie z przodu).
import type { PostureMetrics } from '../shared/types';
import { PointSmoother } from './oneEuro';

export interface Landmark {
  x: number; // 0–1 względem szerokości obrazu
  y: number; // 0–1 względem wysokości obrazu
  z?: number;
  visibility?: number;
}

/** Indeksy punktów MediaPipe Pose używane w analizie. */
export const POSE = {
  nose: 0,
  leftEye: 2,
  rightEye: 5,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
} as const;

const REQUIRED = [POSE.nose, POSE.leftEye, POSE.rightEye, POSE.leftShoulder, POSE.rightShoulder];
const MIN_VISIBILITY = 0.5;

/** Kąt odcinka względem poziomu, sprowadzony do zakresu −90°…90° (kierunek linii nie ma znaczenia). */
export function lineAngleDeg(x1: number, y1: number, x2: number, y2: number): number {
  let a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  if (a > 90) a -= 180;
  if (a < -90) a += 180;
  return a;
}

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

export interface MetricsResult {
  metrics: PostureMetrics | null;
  /** Powód braku metryk, do pokazania w UI. */
  reason?: 'no-person' | 'shoulders-hidden' | 'face-hidden';
}

/**
 * Liczy metryki z punktów jednej klatki. Punkty o niskiej widoczności są pomijane,
 * by np. ręka przy twarzy nie dawała fałszywych odczytów.
 */
export function computeMetrics(
  lm: Landmark[] | undefined,
  width: number,
  height: number,
  t: number,
  smoother?: PointSmoother,
): MetricsResult {
  if (!lm || lm.length < 13) return { metrics: null, reason: 'no-person' };
  const vis = (i: number) => lm[i]?.visibility ?? 1;
  if (vis(POSE.leftShoulder) < MIN_VISIBILITY || vis(POSE.rightShoulder) < MIN_VISIBILITY) {
    return { metrics: null, reason: vis(POSE.nose) < MIN_VISIBILITY ? 'no-person' : 'shoulders-hidden' };
  }
  if (REQUIRED.some((i) => vis(i) < MIN_VISIBILITY)) return { metrics: null, reason: 'face-hidden' };

  const p = (i: number): [number, number] => {
    const x = lm[i].x * width;
    const y = lm[i].y * height;
    return smoother ? smoother.smooth(i, x, y, t) : [x, y];
  };

  const [nx, ny] = p(POSE.nose);
  const [lex, ley] = p(POSE.leftEye);
  const [rex, rey] = p(POSE.rightEye);
  const [lsx, lsy] = p(POSE.leftShoulder);
  const [rsx, rsy] = p(POSE.rightShoulder);

  const shoulderW = dist(lsx, lsy, rsx, rsy);
  const eyeDist = dist(lex, ley, rex, rey);
  if (shoulderW < 10 || eyeDist < 3) return { metrics: null, reason: 'no-person' };

  const shoulderMidY = (lsy + rsy) / 2;

  // Uszy bywają zasłonięte (włosy, słuchawki): używamy widocznych, a w ostateczności oczu.
  const earsVisible = [POSE.leftEar, POSE.rightEar].filter((i) => vis(i) >= MIN_VISIBILITY);
  let earY: number;
  if (earsVisible.length > 0) {
    earY = earsVisible.map((i) => p(i)[1]).reduce((a, b) => a + b, 0) / earsVisible.length;
  } else {
    earY = (ley + rey) / 2;
  }

  return {
    metrics: {
      neckRatio: (shoulderMidY - ny) / shoulderW,
      earRatio: (shoulderMidY - earY) / shoulderW,
      headRollDeg: lineAngleDeg(rex, rey, lex, ley),
      shoulderTiltDeg: lineAngleDeg(rsx, rsy, lsx, lsy),
      eyeDistPx: eyeDist,
      shoulderToEye: shoulderW / eyeDist,
      noseX: nx,
      noseY: ny,
    },
  };
}

/** Mediana z listy liczb (do kalibracji). */
export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
