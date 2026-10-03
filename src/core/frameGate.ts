// Bramka klatek: analizujemy tylko nowe klatki z kamery.
// Zatrzymane wideo (np. element <video> odpięty od DOM przy zmianie zakładki) zwraca w kółko
// tę samą klatkę – bez tej bramki ocena postawy liczyłaby się z zamrożonego obrazu.

export interface VideoClock {
  paused: boolean;
  currentTime: number;
}

export class FrameGate {
  private lastTime = -1;
  /** Ile kolejnych wywołań nie dało nowej klatki (rośnie, gdy obraz stoi). */
  staleCount = 0;

  isFresh(v: VideoClock): boolean {
    if (v.paused || v.currentTime === this.lastTime) {
      this.staleCount++;
      return false;
    }
    this.lastTime = v.currentTime;
    this.staleCount = 0;
    return true;
  }

  /** Po ponownym podłączeniu strumienia czas wideo startuje od zera. */
  reset(): void {
    this.lastTime = -1;
    this.staleCount = 0;
  }
}
