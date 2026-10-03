// Filtr One Euro (Casiez i in., 2012): wygładza drgania punktów,
// a przy szybkim ruchu zmniejsza opóźnienie.

class LowPass {
  private y: number | null = null;
  filter(x: number, alpha: number): number {
    this.y = this.y === null ? x : alpha * x + (1 - alpha) * this.y;
    return this.y;
  }
  last(): number | null {
    return this.y;
  }
  reset(): void {
    this.y = null;
  }
}

const alphaFor = (cutoff: number, dt: number): number => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
};

export class OneEuroFilter {
  private x = new LowPass();
  private dx = new LowPass();
  private lastT: number | null = null;

  constructor(
    private minCutoff = 1.0,
    private beta = 0.02,
    private dCutoff = 1.0,
  ) {}

  /** @param t czas w sekundach */
  filter(value: number, t: number): number {
    if (this.lastT === null || t <= this.lastT) {
      this.lastT = t;
      this.dx.filter(0, 1);
      return this.x.filter(value, 1);
    }
    const dt = t - this.lastT;
    this.lastT = t;
    const prev = this.x.last() ?? value;
    const dValue = (value - prev) / dt;
    const edx = this.dx.filter(dValue, alphaFor(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.x.filter(value, alphaFor(cutoff, dt));
  }

  reset(): void {
    this.x.reset();
    this.dx.reset();
    this.lastT = null;
  }
}

/** Zestaw filtrów dla punktów (x, y) indeksowanych numerem punktu. */
export class PointSmoother {
  private filters = new Map<number, [OneEuroFilter, OneEuroFilter]>();
  constructor(
    private minCutoff = 1.2,
    private beta = 0.05,
  ) {}

  smooth(index: number, x: number, y: number, t: number): [number, number] {
    let f = this.filters.get(index);
    if (!f) {
      f = [new OneEuroFilter(this.minCutoff, this.beta), new OneEuroFilter(this.minCutoff, this.beta)];
      this.filters.set(index, f);
    }
    return [f[0].filter(x, t), f[1].filter(y, t)];
  }

  reset(): void {
    this.filters.clear();
  }
}
