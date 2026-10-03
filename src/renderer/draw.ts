// Rysowanie linii kręgosłupa, barków i głowy na podglądzie kamery.
import type { Calibration, PostureState } from '../shared/types';
import type { Frame } from './analyzer';
import { POSE } from '../core/metrics';

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export interface DrawOpts {
  mirror: boolean;
  calibration: Calibration | null;
}

const stateColor = (s: PostureState | undefined): string =>
  s === 'good' ? css('--good') : s === 'warn' ? css('--warn') : s === 'bad' ? css('--bad') : css('--muted');

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
  const lm = f.pose;
  if (!lm) return;

  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const scale = Math.max(cw / vw, ch / vh);
  const ox = (cw - vw * scale) / 2;
  const oy = (ch - vh * scale) / 2;
  const P = (i: number): [number, number] | null => {
    const p = lm[i];
    if (!p || (p.visibility ?? 1) < 0.5) return null;
    let x = ox + p.x * vw * scale;
    const y = oy + p.y * vh * scale;
    if (o.mirror) x = cw - x;
    return [x, y];
  };

  const color = stateColor(f.tracker?.state);
  const ink = css('--overlay-ink');
  const ls = P(POSE.leftShoulder);
  const rs = P(POSE.rightShoulder);
  const nose = P(POSE.nose);
  const le = P(POSE.leftEye);
  const re = P(POSE.rightEye);
  const lear = P(POSE.leftEar);
  const rear = P(POSE.rightEar);

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
  const label = (x0: number, y: number, text: string, c: string) => {
    const w = ctx.measureText(text).width + 14;
    const x = Math.min(cw - w / 2 - 8, Math.max(w / 2 + 8, x0)); // nie wychodź poza kadr
    ctx.fillStyle = 'rgba(14, 22, 24, 0.72)';
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

  // Wzorzec z kalibracji: gdzie powinien być nos przy prostej postawie.
  if (o.calibration && nose) {
    const ideal: [number, number] = [mid[0], mid[1] - o.calibration.neckRatio * shoulderW];
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.arc(ideal[0], ideal[1], Math.max(10, shoulderW * 0.07), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  line(ls, rs, 4, ink);
  if (lear && rear) line(lear, rear, 2, ink, [3, 6]);
  if (le && re) line(le, re, 3, ink);
  if (nose) line(mid, nose, 7, color);
  for (const p of [ls, rs, nose, le, re]) {
    if (!p) continue;
    ctx.fillStyle = p === nose ? color : ink;
    ctx.beginPath();
    ctx.arc(p[0], p[1], p === nose ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Odczyty przy liniach – względem wzorca, gdy jest kalibracja.
  const m = f.metrics;
  const cal = o.calibration;
  if (m) {
    const tilt = cal ? m.shoulderTiltDeg - cal.shoulderTiltDeg : m.shoulderTiltDeg;
    const sx = o.mirror ? Math.min(ls[0], rs[0]) : Math.max(ls[0], rs[0]);
    label(sx, mid[1] + 34, `barki ${Math.abs(tilt).toFixed(0)}°`, Math.abs(tilt) > 5 ? css('--warn') : '#fff');
    if (le && re) {
      const roll = cal ? m.headRollDeg - cal.headRollDeg : m.headRollDeg;
      const ex = Math.max(le[0], re[0]) + 46;
      label(ex, (le[1] + re[1]) / 2, `głowa ${Math.abs(roll).toFixed(0)}°`, Math.abs(roll) > 10 ? css('--warn') : '#fff');
    }
    if (cal && nose) {
      const drop = ((cal.neckRatio - m.neckRatio) / cal.neckRatio) * 100;
      const txt = drop > 0 ? `szyja −${drop.toFixed(0)}%` : `szyja +${Math.abs(drop).toFixed(0)}%`;
      label(mid[0] - shoulderW * 0.32, (mid[1] + nose[1]) / 2, txt, drop > 15 ? css('--bad') : drop > 8 ? css('--warn') : '#fff');
    }
  }
}
