// Kadr przed kalibracją: zanim zapamiętamy postawę, sprawdzamy, czy kamera widzi to, co trzeba.
// Jedna wskazówka naraz, najważniejsza pierwsza („Odsuń się”, „Przesuń się w lewo”, „Za ciemno”…).
// Współrzędne punktów: 0–1 względem obrazu z kamery (jak w MediaPipe).
import type { Landmark } from './metrics';
import { POSE } from './metrics';
import { tr } from '../shared/i18n';

export type FramingId = 'noPerson' | 'dark' | 'shoulders' | 'tooClose' | 'tooFar' | 'moveLeft' | 'moveRight' | 'headCut' | 'cameraLow';

export interface FramingHint {
  id: FramingId;
  text: string;
}

export interface FramingInput {
  pose: Landmark[] | null;
  /** Pochylenie głowy z modelu twarzy (dodatnie = w dół); null bez modelu twarzy. */
  headPitchDeg: number | null;
  /** Średnia jasność obrazu 0–255; null, gdy nieznana. */
  brightness: number | null;
  /** Czy podgląd jest lustrzany (wtedy „lewo” użytkownika = lewo na ekranie). */
  mirror: boolean;
}

/** Granice kadru, w których kalibracja jest wiarygodna. */
export const FRAME = {
  minEyeDist: 0.06, // rozstaw oczu / szerokość obrazu: dalej = za mało pikseli na twarz
  maxEyeDist: 0.16, // bliżej = barki wypadają z kadru, a twarz zniekształca obiektyw
  maxCenterOffset: 0.15, // twarz najwyżej 15% szerokości od środka
  minNoseY: 0.18, // wyżej = czubek głowy ucięty
  minBrightness: 55,
  cameraLowPitchDeg: -15, // twarz widziana od dołu: kamera za nisko
} as const;

/** Docelowe położenie „ducha” sylwetki (środek głowy i linia barków), 0–1. */
export const TARGET = { headX: 0.5, headY: 0.38, shouldersY: 0.74, shoulderHalfWidth: 0.24, headRadius: 0.1 } as const;

const VIS = 0.5;
const MIN_POSE_POINTS = 13; // do prawego barku (indeks 12) włącznie
const IMAGE_CENTER_X = 0.5;
const seen = (lm: Landmark[], i: number) => (lm[i]?.visibility ?? 1) >= VIS;

/** Wszystkie wskazówki w kolejności ważności; pusta lista = kadr w porządku. */
export function checkFraming(i: FramingInput): FramingHint[] {
  const out: FramingHint[] = [];
  const lm = i.pose;
  if (i.brightness !== null && i.brightness < FRAME.minBrightness) out.push({ id: 'dark', text: tr('Za ciemno – zapal światło albo odwróć się przodem do okna.') });
  if (!lm || lm.length < MIN_POSE_POINTS || !seen(lm, POSE.nose) || !seen(lm, POSE.leftEye) || !seen(lm, POSE.rightEye)) {
    out.unshift({ id: 'noPerson', text: tr('Usiądź przed kamerą, twarzą do ekranu.') });
    return out;
  }
  const eyeDist = Math.hypot(lm[POSE.leftEye].x - lm[POSE.rightEye].x, lm[POSE.leftEye].y - lm[POSE.rightEye].y);
  if (eyeDist > FRAME.maxEyeDist) out.push({ id: 'tooClose', text: tr('Odsuń się trochę od ekranu.') });
  else if (!seen(lm, POSE.leftShoulder) || !seen(lm, POSE.rightShoulder)) {
    out.push({ id: 'shoulders', text: tr('Barki muszą być w kadrze – odsuń się albo obniż kamerę.') });
  } else if (eyeDist < FRAME.minEyeDist) out.push({ id: 'tooFar', text: tr('Przysuń się bliżej ekranu.') });

  // „Lewo/prawo” z perspektywy użytkownika: w lustrzanym podglądzie x rośnie w jego prawo.
  const faceX = (lm[POSE.leftEye].x + lm[POSE.rightEye].x) / 2;
  const userX = i.mirror ? 1 - faceX : faceX;
  if (userX > IMAGE_CENTER_X + FRAME.maxCenterOffset) out.push({ id: 'moveLeft', text: tr('Przesuń się trochę w lewo.') });
  else if (userX < IMAGE_CENTER_X - FRAME.maxCenterOffset) out.push({ id: 'moveRight', text: tr('Przesuń się trochę w prawo.') });

  if (lm[POSE.nose].y < FRAME.minNoseY) out.push({ id: 'headCut', text: tr('Głowa jest za wysoko – obniż ekran albo usiądź niżej.') });
  if (i.headPitchDeg !== null && i.headPitchDeg < FRAME.cameraLowPitchDeg) {
    out.push({ id: 'cameraLow', text: tr('Kamera patrzy od dołu – podnieś laptopa albo ekran.') });
  }
  return out;
}

const IPD_CM = 6.3; // średni rozstaw źrenic dorosłego
const WEBCAM_HFOV_DEG = 65; // typowy poziomy kąt widzenia kamery internetowej
const DISTANCE_STEP_CM = 5; // zaokrąglamy do 5 cm – to tylko orientacja

/**
 * Szacunkowa odległość od ekranu w cm z rozstawu źrenic (śr. 6,3 cm) i typowego kąta
 * widzenia kamery internetowej (~65° w poziomie). Tylko do orientacji („ok. 60 cm”).
 */
export function estimateDistanceCm(eyeDistPx: number, imageWidthPx: number, hfovDeg = WEBCAM_HFOV_DEG): number | null {
  if (eyeDistPx <= 0 || imageWidthPx <= 0) return null;
  const focalPx = imageWidthPx / 2 / Math.tan((hfovDeg * Math.PI) / 360);
  return Math.round((IPD_CM * focalPx) / eyeDistPx / DISTANCE_STEP_CM) * DISTANCE_STEP_CM;
}
