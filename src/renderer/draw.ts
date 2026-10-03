// Rysowanie linii kręgosłupa, barków i głowy na podglądzie kamery.
import type { Calibration, IssueId } from '../shared/types';
import type { Frame } from './analyzer';
import { POSE, type Landmark } from '../core/metrics';
import { drawBody, drawFaceContours } from './landmarks';
import { ISSUE_LABEL } from '../core/coach';

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export interface DrawOpts {
  mirror: boolean;
  calibration: Calibration | null;
}

/** Rysuje nakładkę; wideo ma object-fit: cover, więc odwzorowujemy ten sam kadr. */
export function drawOverlay(canvas: HTMLCanvasElement, video: { videoWidth: number; videoHeight: number }, f: Frame, o: DrawOpts): void {
  const dpr = window.devicePixelRatio || 1;
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const scale = Math.max(cw / vw, ch / vh);
  const ox = (cw - vw * scale) / 2;
  const oy = (ch - vh * scale) / 2;
  const project = (p: Landmark): [number, number] => {
    const x = ox + p.x * vw * scale;
    return [o.mirror ? cw - x : x, oy + p.y * vh * scale];
  };

  // Tło nakładki: twarz i szkielet zawsze przygaszone i neutralne – pokazują tylko, że kamera „widzi”.
  // Kolorem zapala się wyłącznie odcinek, z którym jest problem (FEEDBACK F2).
  const st = f.tracker?.state;
  // Do dwóch problemów naraz (np. uniesione barki i wysunięta głowa) – każdy podświetla swój odcinek.
  const issues = st === 'warn' || st === 'bad' ? f.tracker?.issues ?? [] : [];
  const has = (...ids: IssueId[]) => ids.some((id) => issues.includes(id));
  ctx.globalAlpha = issues.length ? 0.45 : 0.3;
  if (f.face) drawFaceContours(ctx, f.face, project);
  const lm = f.pose;
  if (lm) drawBody(ctx, lm, project);
  ctx.globalAlpha = 1;
  if (!lm) return;

  const P = (i: number): [number, number] | null => {
    const p = lm[i];
    if (!p || (p.visibility ?? 1) < 0.5) return null;
    return project(p);
  };

  const hot = st === 'bad' ? css('--bad') : css('--warn');
  const calmInk = 'rgba(255, 255, 255, 0.55)';
  const ls = P(POSE.leftShoulder);
  const rs = P(POSE.rightShoulder);
  const nose = P(POSE.nose);
  const le = P(POSE.leftEye);
  const re = P(POSE.rightEye);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.font = '600 13px system-ui, "Segoe UI Variable Text", "SF Pro Text", sans-serif';

  const line = (a: [number, number], b: [number, number], w: number, c: string, dash: number[] = []) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const dot = (p: [number, number], r: number, c: string) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
    ctx.fill();
  };
  /** Pozioma linia odniesienia przez środek odcinka – „tak powinno być”. */
  const level = (a: [number, number], b: [number, number]) => {
    const cx = (a[0] + b[0]) / 2;
    const cy = (a[1] + b[1]) / 2;
    const half = Math.hypot(a[0] - b[0], a[1] - b[1]) / 2 + 18;
    line([cx - half, cy], [cx + half, cy], 1.5, 'rgba(255, 255, 255, 0.7)', [4, 6]);
  };
  const label = (x0: number, y: number, text: string, c: string) => {
    const w = ctx.measureText(text).width + 14;
    const x = Math.min(cw - w / 2 - 8, Math.max(w / 2 + 8, x0)); // nie wychodź poza kadr
    ctx.fillStyle = 'rgba(18, 19, 20, 0.78)';
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 12, w, 24, 12);
    ctx.fill();
    ctx.fillStyle = c;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 0.5);
  };

  if (!ls || !rs) return;
  const mid: [number, number] = [(ls[0] + rs[0]) / 2, (ls[1] + rs[1]) / 2];
  const shoulderW = Math.hypot(ls[0] - rs[0], ls[1] - rs[1]);
  const HEAD: IssueId[] = ['headForward', 'headBack', 'slouch', 'tooClose'];
  const SHOULDERS: IssueId[] = ['shoulderTilt', 'twist', 'shrug'];
  const headIssue = has(...HEAD);

  // Szyja (barki → nos): spokojna, gdy jest dobrze; w kolorze, gdy problem dotyczy głowy lub pleców.
  if (nose) {
    line(mid, nose, headIssue ? 5 : 2.5, headIssue ? hot : calmInk);
    dot(nose, headIssue ? 6 : 4, headIssue ? hot : calmInk);
  }

  // Wzorzec z kalibracji: gdzie powinna być głowa. Przy problemie z głową – wyraźnie, ze strzałką „tu wróć”.
  if (o.calibration && nose) {
    const ideal: [number, number] = [mid[0], mid[1] - o.calibration.neckRatio * shoulderW];
    const r = Math.max(10, shoulderW * 0.07);
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = headIssue ? 0.9 : 0.35;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.arc(ideal[0], ideal[1], r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    const d = Math.hypot(ideal[0] - nose[0], ideal[1] - nose[1]);
    if (headIssue && d > r + 14) {
      const ux = (ideal[0] - nose[0]) / d;
      const uy = (ideal[1] - nose[1]) / d;
      const tip: [number, number] = [ideal[0] - ux * (r + 4), ideal[1] - uy * (r + 4)];
      line([nose[0] + ux * 10, nose[1] + uy * 10], tip, 2, '#ffffff');
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(tip[0], tip[1]);
      ctx.lineTo(tip[0] - ux * 9 - uy * 5, tip[1] - uy * 9 + ux * 5);
      ctx.lineTo(tip[0] - ux * 9 + uy * 5, tip[1] - uy * 9 - ux * 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Barki: podświetlone tylko przy przechyle, skręcie lub uniesieniu; przy przechyle z poziomicą obok.
  if (has(...SHOULDERS)) {
    if (has('shoulderTilt')) level(ls, rs);
    line(ls, rs, 5, hot);
    dot(ls, 5, hot);
    dot(rs, 5, hot);
  }

  // Głowa: linia oczu w kolorze przy przechyle głowy, z poziomicą obok.
  if (has('headTilt') && le && re) {
    level(le, re);
    line(le, re, 4, hot);
  }

  // Podpis prostymi słowami przy każdym podświetlonym odcinku. Liczby i stopnie są w „Szczegółach pomiaru”.
  if (!nose) return;
  const used: number[] = [];
  for (const id of issues) {
    if (id === 'stillness') continue;
    const atShoulders = SHOULDERS.includes(id);
    let y = atShoulders ? mid[1] + 34 : id === 'headTilt' && le && re ? Math.min(le[1], re[1]) - 30 : (mid[1] + nose[1]) / 2;
    while (used.some((u) => Math.abs(u - y) < 28)) y += 28; // dwa podpisy w tym samym miejscu – jeden pod drugim
    used.push(y);
    label(atShoulders ? mid[0] : nose[0], y, ISSUE_LABEL[id], hot);
  }
}
