// Windows: zasobnik nie pokazuje tekstu obok ikony (jak pasek menu na macOS),
// więc rysujemy wynik postawy wprost na ikonie: kółko w kolorze stanu + liczba.
import type { LiveStatus } from '../shared/types';

const SIZE = 32; // px fizyczne; w main ikona dostaje scaleFactor 2 → 16 px logicznych
const COLOR: Record<string, string> = { good: '#3fae6a', warn: '#e0a128', bad: '#d9473a' };

let lastKey = '';
let canvas: HTMLCanvasElement | null = null;

/** Wysyła nową ikonę tylko przy zmianie liczby lub stanu; `null` = wróć do zwykłej ikony. */
export function updateTrayBadge(s: LiveStatus, send: (png: string | null) => void): void {
  const show = s.score !== null && (s.state === 'good' || s.state === 'warn' || s.state === 'bad');
  const key = show ? `${s.state}:${s.score}` : 'none';
  if (key === lastKey) return;
  lastKey = key;
  if (!show) return send(null);

  canvas ??= Object.assign(document.createElement('canvas'), { width: SIZE, height: SIZE });
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = COLOR[s.state];
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
  const text = String(Math.min(99, s.score!)); // 100 nie zmieści się czytelnie w 16 px
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${text.length > 1 ? 19 : 22}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, SIZE / 2, SIZE / 2 + 1);
  send(canvas.toDataURL('image/png'));
}
