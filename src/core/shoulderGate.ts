// Bramka barków: odrzuca klatki, w których model sylwetki „zgaduje” barki
// (zasłonięte przez krzesło, bluzę, rękę), zamiast wliczać je do oceny.
//
// Klatka jest odrzucana, gdy: model jest niepewny (visibility), szerokość barków
// względem rozstawu oczu nagle odbiega od mediany z ostatnich sekund albo linia barków
// nagle się przekrzywia. Wtedy przez chwilę trzymamy ostatnie dobre barki.
// Jeśli „nowe” barki są stabilne przez dłużej, uznajemy je za prawdziwą zmianę pozycji.

import { median } from './metrics';

export interface ShoulderPoints {
  lx: number;
  ly: number;
  rx: number;
  ry: number;
}

export interface ShoulderInput extends ShoulderPoints {
  /** Mniejsza z widoczności obu barków (0–1). */
  visibility: number;
  /** Rozstaw oczu w pikselach (skala, niezależna od barków). */
  eyeDist: number;
}

export interface ShoulderResult extends ShoulderPoints {
  /** true = zwracamy ostatnie dobre barki zamiast bieżących. */
  held: boolean;
}

const MIN_VISIBILITY = 0.65;
const WINDOW_SEC = 3;
const MAX_WIDTH_JUMP = 0.18; // 18% względem mediany
const MAX_TILT_JUMP_DEG = 10;
const HOLD_SEC = 2;
const ACCEPT_NEW_AFTER_SEC = 1.5;

interface Sample {
  t: number;
  ratio: number; // szerokość barków / rozstaw oczu
  tilt: number;
}

const describe = (p: ShoulderInput): Sample & { t: number } => ({
  t: 0,
  ratio: Math.hypot(p.lx - p.rx, p.ly - p.ry) / Math.max(1, p.eyeDist),
  tilt: (Math.atan2(p.ly - p.ry, p.lx - p.rx) * 180) / Math.PI,
});

/** Różnica kątów linii (bez kierunku), w stopniach 0–90. */
const tiltDiff = (a: number, b: number) => {
  let d = Math.abs(a - b) % 180;
  if (d > 90) d = 180 - d;
  return d;
};

export class ShoulderGate {
  private accepted: Sample[] = [];
  private candidates: Sample[] = [];
  private last: { t: number; p: ShoulderPoints } | null = null;
  /** Ile klatek odrzucono (diagnostyka). */
  rejected = 0;

  update(t: number, p: ShoulderInput): ShoulderResult | null {
    const s = { ...describe(p), t };
    while (this.accepted.length && t - this.accepted[0].t > WINDOW_SEC) this.accepted.shift();

    let ok = p.visibility >= MIN_VISIBILITY;
    if (ok && this.accepted.length >= 5) {
      const mRatio = median(this.accepted.map((a) => a.ratio));
      const mTilt = median(this.accepted.map((a) => a.tilt));
      ok = Math.abs(s.ratio - mRatio) / mRatio <= MAX_WIDTH_JUMP && tiltDiff(s.tilt, mTilt) <= MAX_TILT_JUMP_DEG;

      if (!ok && p.visibility >= MIN_VISIBILITY) {
        // Może to prawdziwa zmiana pozycji: jeśli „nowe” barki są stabilne, przyjmujemy je.
        this.candidates = this.candidates.filter((c) => t - c.t <= ACCEPT_NEW_AFTER_SEC + 0.5);
        const cR = this.candidates.length ? median(this.candidates.map((c) => c.ratio)) : s.ratio;
        const cT = this.candidates.length ? median(this.candidates.map((c) => c.tilt)) : s.tilt;
        const consistent = Math.abs(s.ratio - cR) / cR <= MAX_WIDTH_JUMP / 2 && tiltDiff(s.tilt, cT) <= MAX_TILT_JUMP_DEG / 2;
        if (!consistent) this.candidates = [];
        this.candidates.push(s);
        if (t - this.candidates[0].t >= ACCEPT_NEW_AFTER_SEC) {
          this.accepted = [...this.candidates];
          this.candidates = [];
          ok = true;
        }
      }
    }

    if (ok) {
      this.candidates = [];
      if (this.accepted[this.accepted.length - 1] !== s) this.accepted.push(s);
      this.last = { t, p: { lx: p.lx, ly: p.ly, rx: p.rx, ry: p.ry } };
      return { ...this.last.p, held: false };
    }

    this.rejected++;
    if (this.last && t - this.last.t <= HOLD_SEC) return { ...this.last.p, held: true };
    return null;
  }

  reset(): void {
    this.accepted = [];
    this.candidates = [];
    this.last = null;
  }
}
