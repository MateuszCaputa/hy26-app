// Nakładka w stylu demo MediaPipe: czysty szkielet górnej części ciała (limonkowe linie, różowe stawy)
// i kontury z siatki twarzy (powieki, tęczówki, brwi, usta, owal). Kontur powiek zamyka się przy mrugnięciu,
// więc widać, że licznik mrugnięć naprawdę „widzi” oczy.
import { FaceLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { Landmark } from '../core/metrics';

export type Project = (p: Landmark) => [number, number];

type Pair = readonly [number, number];
const pairs = (c: ReadonlyArray<{ start: number; end: number }>): Pair[] => c.map((x) => [x.start, x.end] as const);

// Górna część ciała: barki, ramiona, dłonie, tułów (punkty 11–24). Twarz z Pose pomijamy – rysuje ją siatka twarzy.
const BODY: Pair[] = pairs(PoseLandmarker.POSE_CONNECTIONS).filter(([a, b]) => a >= 11 && a <= 24 && b >= 11 && b <= 24);
const BODY_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24];

const EYES: Pair[] = [...pairs(FaceLandmarker.FACE_LANDMARKS_LEFT_EYE), ...pairs(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE)];
const IRISES: Pair[] = [...pairs(FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS), ...pairs(FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS)];
const BROWS: Pair[] = [...pairs(FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW), ...pairs(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW)];
const LIPS: Pair[] = pairs(FaceLandmarker.FACE_LANDMARKS_LIPS);
const OVAL: Pair[] = pairs(FaceLandmarker.FACE_LANDMARKS_FACE_OVAL);
/** Unikalne punkty z listy odcinków (liczone raz, nie co klatkę). */
const points = (list: Pair[]): number[] => [...new Set(list.flat())];
const EYE_DOTS = points(EYES);
const BROW_DOTS = points(BROWS);

const LIME = '#b6ff3b';
const PINK = '#ff3d9a';
const VIOLET = '#c08bff';
const SOFT = 'rgba(235, 245, 240, 0.35)';
const MIN_VIS = 0.5;

/** Jedna ścieżka na grupę odcinków (szybko: jedno stroke zamiast dziesiątek). */
function strokePairs(ctx: CanvasRenderingContext2D, lm: Landmark[], list: Pair[], project: Project, visible: (p: Landmark) => boolean): void {
  ctx.beginPath();
  for (const [ia, ib] of list) {
    const a = lm[ia];
    const b = lm[ib];
    if (!a || !b || !visible(a) || !visible(b)) continue;
    const [ax, ay] = project(a);
    const [bx, by] = project(b);
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  ctx.stroke();
}

const always = () => true;

function dots(ctx: CanvasRenderingContext2D, lm: Landmark[], idx: number[], project: Project, r: number): void {
  ctx.beginPath();
  for (const i of idx) {
    const p = lm[i];
    if (!p) continue;
    const [x, y] = project(p);
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
}
const poseVisible = (p: Landmark) => (p.visibility ?? 1) >= MIN_VIS;

export function drawFaceContours(ctx: CanvasRenderingContext2D, face: Landmark[], project: Project): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Owal, brwi i usta: delikatnie, żeby nie zasłaniały twarzy.
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = 1;
  strokePairs(ctx, face, OVAL, project, always);
  ctx.lineWidth = 1.5;
  strokePairs(ctx, face, BROWS, project, always);
  strokePairs(ctx, face, LIPS, project, always);
  // Powieki i tęczówki: wyraźnie, z lekką poświatą – to „dowód” na mrugnięcia.
  ctx.strokeStyle = VIOLET;
  ctx.shadowColor = VIOLET;
  ctx.shadowBlur = 6;
  ctx.lineWidth = 1.5;
  strokePairs(ctx, face, EYES, project, always);
  ctx.fillStyle = VIOLET;
  dots(ctx, face, EYE_DOTS, project, 1.8);
  if (face.length > 468) {
    ctx.lineWidth = 1.5;
    strokePairs(ctx, face, IRISES, project, always);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = SOFT;
  dots(ctx, face, BROW_DOTS, project, 1.4);
  ctx.restore();
}

export function drawBody(ctx: CanvasRenderingContext2D, pose: Landmark[], project: Project): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = LIME;
  // 1) miękka, szeroka poświata (tania: bez shadowBlur), 2) jasna linia z rozmyciem
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 12;
  strokePairs(ctx, pose, BODY, project, poseVisible);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3.5;
  ctx.shadowColor = LIME;
  ctx.shadowBlur = 12;
  strokePairs(ctx, pose, BODY, project, poseVisible);
  // stawy: różowe kółka z poświatą i jasnym środkiem
  ctx.shadowColor = PINK;
  ctx.shadowBlur = 14;
  for (const i of BODY_JOINTS) {
    const p = pose[i];
    if (!p || !poseVisible(p)) continue;
    const [x, y] = project(p);
    ctx.fillStyle = PINK;
    ctx.beginPath();
    ctx.arc(x, y, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3f9';
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
