// Płynna nakładka (MP9): sylwetka liczy się ~8 razy na sekundę, a ekran odświeża się ~60 razy.
// Zamiast skakać co 125 ms, punkty „podążają” wykładniczo za ostatnim pomiarem (stała czasowa tauMs).
// Bez alokacji w pętli: tablica wyjściowa jest wielokrotnie używana.
import type { Landmark } from './metrics';

export class LandmarkFollower {
  private out: Landmark[] = [];
  private target: Landmark[] | null = null;

  constructor(private readonly tauMs = 70) {}

  /** Nowy pomiar; `null` = brak osoby (nakładka znika od razu, bez „ducha”). */
  setTarget(lm: Landmark[] | null): void {
    this.target = lm;
    if (!lm) {
      this.out.length = 0;
      return;
    }
    if (this.out.length !== lm.length) {
      // Pierwszy pomiar lub inny model: startujemy od razu w punkcie docelowym.
      this.out = lm.map((p) => ({ ...p }));
    }
  }

  /** Krok animacji o `dtMs`; zwraca wygładzone punkty (widoczność bez wygładzania) albo null. */
  step(dtMs: number): Landmark[] | null {
    const t = this.target;
    if (!t || this.out.length === 0) return null;
    const k = 1 - Math.exp(-Math.max(0, dtMs) / this.tauMs);
    for (let i = 0; i < t.length; i++) {
      const o = this.out[i];
      const p = t[i];
      o.x += (p.x - o.x) * k;
      o.y += (p.y - o.y) * k;
      if (p.z !== undefined) o.z = (o.z ?? p.z) + (p.z - (o.z ?? p.z)) * k;
      o.visibility = p.visibility;
    }
    return this.out;
  }
}
