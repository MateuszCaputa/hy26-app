// Metryki postawy z punktów MediaPipe Pose (33 punkty, ujęcie z przodu).
import type { PostureMetrics } from '../shared/types';
import { PointSmoother } from './oneEuro';
import type { HeadPose } from './headPose';
import type { ShoulderGate } from './shoulderGate';

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

/** Punkty siatki twarzy (478) – dokładniejsze niż kilka punktów twarzy z modelu sylwetki. */
export const FACE = {
  noseTip: 1,
  leftIris: 473, // lewe oko osoby
  rightIris: 468,
} as const;

const REQUIRED = [POSE.nose, POSE.leftEye, POSE.rightEye, POSE.leftShoulder, POSE.rightShoulder];
const MIN_VISIBILITY = 0.5;
const MIN_POSE_POINTS = 13; // do prawego barku (indeks 12) włącznie
const FACE_KEY_OFFSET = 1000; // klucze filtra dla punktów twarzy, osobne od punktów sylwetki
const MIN_EYE_DIST_PX = 3; // mniejszy rozstaw oczu = to nie twarz przy ekranie, tylko szum
const MIN_SHOULDER_W_PX = 10; // węższe barki = brak osoby w kadrze
const MIN_YAW_COS = 0.5; // korekta rozstawu oczu najwyżej ×2 (obrót do 60°)

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
  /** Barki z tej klatki odrzucone przez bramkę – użyto ostatnich dobrych. */
  shouldersHeld?: boolean;
}

export interface MetricsOptions {
  smoother?: PointSmoother;
  /** Punkty siatki twarzy z tej samej (lub ostatniej) klatki: nos i oczy biorę stąd. */
  face?: Landmark[] | null;
  /** Ustawienie głowy z macierzy twarzy. */
  headPose?: HeadPose | null;
  /** Odrzuca klatki z „zgadywanymi” barkami. */
  shoulderGate?: ShoulderGate;
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
  opts: MetricsOptions = {},
): MetricsResult {
  if (!lm || lm.length < MIN_POSE_POINTS) return { metrics: null, reason: 'no-person' };
  const vis = (i: number) => lm[i]?.visibility ?? 1;
  const face = opts.face && opts.face.length > FACE.leftIris ? opts.face : null;
  if (vis(POSE.leftShoulder) < MIN_VISIBILITY || vis(POSE.rightShoulder) < MIN_VISIBILITY) {
    return { metrics: null, reason: vis(POSE.nose) < MIN_VISIBILITY && !face ? 'no-person' : 'shoulders-hidden' };
  }
  if (!face && REQUIRED.some((i) => vis(i) < MIN_VISIBILITY)) return { metrics: null, reason: 'face-hidden' };

  const sm = opts.smoother;
  const smooth = (key: number, x: number, y: number): [number, number] => (sm ? sm.smooth(key, x, y, t) : [x, y]);
  const p = (i: number): [number, number] => smooth(i, lm[i].x * width, lm[i].y * height);
  // Punkty twarzy dostają osobne klucze filtra (1000+), żeby nie mieszać się z punktami sylwetki.
  const f = (i: number): [number, number] => smooth(FACE_KEY_OFFSET + i, face![i].x * width, face![i].y * height);

  const [nx, ny] = face ? f(FACE.noseTip) : p(POSE.nose);
  const [lex, ley] = face ? f(FACE.leftIris) : p(POSE.leftEye);
  const [rex, rey] = face ? f(FACE.rightIris) : p(POSE.rightEye);
  const eyeDist = dist(lex, ley, rex, rey);
  if (eyeDist < MIN_EYE_DIST_PX) return { metrics: null, reason: 'no-person' };

  let [lsx, lsy] = p(POSE.leftShoulder);
  let [rsx, rsy] = p(POSE.rightShoulder);
  let shouldersHeld = false;
  if (opts.shoulderGate) {
    const g = opts.shoulderGate.update(t, {
      lx: lsx, ly: lsy, rx: rsx, ry: rsy,
      visibility: Math.min(vis(POSE.leftShoulder), vis(POSE.rightShoulder)),
      eyeDist,
    });
    if (!g) return { metrics: null, reason: 'shoulders-hidden' };
    ({ lx: lsx, ly: lsy, rx: rsx, ry: rsy } = g);
    shouldersHeld = g.held;
  }

  const shoulderW = dist(lsx, lsy, rsx, rsy);
  if (shoulderW < MIN_SHOULDER_W_PX) return { metrics: null, reason: 'no-person' };
  const shoulderMidX = (lsx + rsx) / 2;
  const shoulderMidY = (lsy + rsy) / 2;

  // Uszy bywają zasłonięte (włosy, słuchawki): używamy widocznych, a w ostateczności oczu.
  const earsVisible = [POSE.leftEar, POSE.rightEar].filter((i) => vis(i) >= MIN_VISIBILITY);
  let earX: number;
  let earY: number;
  if (earsVisible.length > 0) {
    earX = earsVisible.map((i) => p(i)[0]).reduce((a, b) => a + b, 0) / earsVisible.length;
    earY = earsVisible.map((i) => p(i)[1]).reduce((a, b) => a + b, 0) / earsVisible.length;
  } else {
    earX = (lex + rex) / 2;
    earY = (ley + rey) / 2;
  }
  // Odległość od środka barków, a nie sama różnica wysokości: przy odchyleniu tułowia w bok
  // pionowa odległość maleje (cos kąta) i udawała wysuniętą głowę. Znak zostaje z osi pionowej.
  const fromShoulders = (x: number, y: number) => Math.sign(shoulderMidY - y) * dist(x, y, shoulderMidX, shoulderMidY);

  const pose = opts.headPose ?? null;
  // Obrót głowy zmniejsza widoczny rozstaw oczu: korygujemy, żeby nie udawał oddalenia od ekranu.
  const yawCos = pose ? Math.max(MIN_YAW_COS, Math.cos((pose.yawDeg * Math.PI) / 180)) : 1;
  const eyeDistFrontal = eyeDist / yawCos;

  return {
    metrics: {
      neckRatio: fromShoulders(nx, ny) / shoulderW,
      earRatio: fromShoulders(earX, earY) / shoulderW,
      // Przechył z macierzy twarzy jest dokładniejszy niż z dwóch punktów oczu.
      headRollDeg: pose ? pose.rollDeg : lineAngleDeg(rex, rey, lex, ley),
      shoulderTiltDeg: lineAngleDeg(rsx, rsy, lsx, lsy),
      eyeDistPx: eyeDistFrontal,
      shoulderToEye: shoulderW / eyeDistFrontal,
      noseX: nx,
      noseY: ny,
      shoulderY: shoulderMidY,
      headPitchDeg: pose ? pose.pitchDeg : null,
      headYawDeg: pose ? pose.yawDeg : null,
    },
    shouldersHeld,
  };
}

/** Mediana z listy liczb (do kalibracji). */
export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
