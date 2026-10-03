// Tempo pracy: liczba zdarzeń klawiatury i myszy na minutę. Nigdy treść, klawisze ani okna.
type Hook = {
  on(ev: string, cb: () => void): void;
  removeAllListeners?(ev?: string): void;
  start(): void;
  stop(): void;
};

export class ActivityCounter {
  private hook: Hook | null = null;
  private running = false;
  private kb = 0;
  private mouse = 0;
  private lastMove = 0;
  error: string | null = null;

  start(): boolean {
    if (this.running) return true;
    try {
      // Ładowane dynamicznie: brak modułu lub uprawnień nie może zatrzymać aplikacji.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('uiohook-napi') as { uIOhook: Hook };
      this.hook = mod.uIOhook;
      this.hook.on('keydown', () => this.kb++);
      this.hook.on('mousedown', () => this.mouse++);
      this.hook.on('wheel', () => this.mouse++);
      // Ruch myszy generuje setki zdarzeń: liczymy najwyżej jedno na 250 ms.
      this.hook.on('mousemove', () => {
        const now = Date.now();
        if (now - this.lastMove > 250) {
          this.lastMove = now;
          this.mouse++;
        }
      });
      this.hook.start();
      this.running = true;
      this.error = null;
      return true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.hook = null;
      return false;
    }
  }

  stop(): void {
    if (!this.running || !this.hook) return;
    try {
      this.hook.removeAllListeners?.();
      this.hook.stop();
    } catch {
      /* ignorujemy */
    }
    this.running = false;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Zwraca liczniki od ostatniego wywołania i je zeruje. */
  take(): { kb: number; mouse: number } {
    const out = { kb: this.kb, mouse: this.mouse };
    this.kb = 0;
    this.mouse = 0;
    return out;
  }
}
