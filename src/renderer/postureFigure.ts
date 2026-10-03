// Ludzik w panelu „Na żywo” (C16, uwaga mentora F3): odwzorowuje bieżący problem postawy
// i strzałką pokazuje, jak go poprawić. Widok z boku: garbienie, głowa w przód/w dół, za blisko ekranu.
// Widok z przodu: przechył głowy, przechył barków, skręt tułowia.
import type { IssueId, PostureState } from '../shared/types';

const NS = 'http://www.w3.org/2000/svg';
const FRONT: IssueId[] = ['headTilt', 'shoulderTilt', 'twist'];
/** Od tej siły problemu (0–1) rysujemy strzałkę poprawy. */
const ARROW_FROM = 0.33;

export interface FigureInput {
  state: PostureState;
  topIssue: IssueId | null;
  severities: Partial<Record<IssueId, number>>;
  /** Przechył głowy i barków względem kalibracji (stopnie, ze znakiem, tak jak na podglądzie). */
  headRollDeg: number;
  shoulderRollDeg: number;
}

type Pose = { slouch: number; head: number; close: number; still: number; roll: number; shRoll: number; twist: number };
const ZERO: Pose = { slouch: 0, head: 0, close: 0, still: 0, roll: 0, shRoll: 0, twist: 0 };

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent?.append(e);
  return e;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export class PostureFigure {
  readonly el: SVGSVGElement;
  private target: Pose = { ...ZERO };
  private cur: Pose = { ...ZERO };
  private view: 'side' | 'front' = 'side';
  private arrowFor: IssueId | null = null;
  // Widok z boku
  private side: SVGGElement;
  private upper: SVGGElement;
  private spine: SVGPathElement;
  private neck: SVGLineElement;
  private head: SVGGElement;
  private arm: SVGPolylineElement;
  // Widok z przodu
  private front: SVGGElement;
  private fShoulders: SVGGElement;
  private fTorso: SVGPathElement;
  private fHead: SVGGElement;
  // Strzałki
  private arrows: Partial<Record<IssueId, SVGGElement>> = {};

  constructor() {
    this.el = el('svg', { viewBox: '0 0 260 200', class: 'pfig', role: 'img', 'aria-label': 'Ludzik pokazujący Twoją postawę' });
    const defs = el('defs', {}, this.el);
    const marker = el('marker', { id: 'pfig-head', viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0 0 L10 5 L0 10 Z', class: 'pfig-arrowhead' }, marker);

    // ——— Widok z boku (twarzą w prawo, do monitora) ———
    this.side = el('g', { class: 'pfig-side' }, this.el);
    el('path', { d: 'M62 82 L66 146 L118 146', class: 'pfig-prop' }, this.side); // krzesło
    el('path', { d: 'M150 120 H246', class: 'pfig-prop' }, this.side); // biurko
    el('rect', { x: 214, y: 58, width: 8, height: 50, rx: 2, class: 'pfig-prop pfig-screen' }, this.side); // monitor
    el('path', { d: 'M218 108 V120', class: 'pfig-prop' }, this.side);
    el('path', { d: 'M95 140 L142 140 L142 182 L156 182', class: 'pfig-body' }, this.side); // nogi
    this.upper = el('g', {}, this.side);
    this.spine = el('path', { class: 'pfig-body' }, this.upper);
    this.arm = el('polyline', { class: 'pfig-body pfig-thin' }, this.upper);
    this.neck = el('line', { class: 'pfig-body' }, this.upper);
    this.head = el('g', {}, this.upper);
    el('circle', { cx: 0, cy: 0, r: 14, class: 'pfig-head' }, this.head);
    el('path', { d: 'M8 -3 L13 -2', class: 'pfig-face' }, this.head); // oko
    el('path', { d: 'M13 2 L17 5 L13 7', class: 'pfig-face' }, this.head); // nos

    // ——— Widok z przodu ———
    this.front = el('g', { class: 'pfig-front' }, this.el);
    this.fTorso = el('path', { class: 'pfig-body' }, this.front);
    this.fShoulders = el('g', {}, this.front);
    el('line', { x1: -42, y1: 0, x2: 42, y2: 0, class: 'pfig-body' }, this.fShoulders);
    el('path', { d: 'M-42 0 L-48 48 M42 0 L48 48', class: 'pfig-body pfig-thin' }, this.fShoulders);
    this.fHead = el('g', {}, this.front);
    el('line', { x1: 0, y1: 0, x2: 0, y2: -14, class: 'pfig-body' }, this.fHead);
    el('circle', { cx: 0, cy: -32, r: 17, class: 'pfig-head' }, this.fHead);
    el('path', { d: 'M-7 -35 h3 M4 -35 h3', class: 'pfig-face' }, this.fHead); // oczy
    el('path', { d: 'M-5 -24 h10', class: 'pfig-face' }, this.fHead); // usta

    // ——— Strzałki poprawy (jedna naraz) ———
    const arrow = (id: IssueId, d: string, parent: SVGGElement) => {
      const g = el('g', { class: 'pfig-arrow' }, parent);
      el('path', { d, 'marker-end': 'url(#pfig-head)' }, g);
      this.arrows[id] = g;
    };
    arrow('slouch', 'M58 132 C50 112 50 92 58 70', this.side); // wyprostuj plecy (w górę za plecami)
    arrow('headForward', 'M150 40 C140 22 122 18 104 24', this.side); // cofnij brodę (głowa w tył i w górę)
    arrow('tooClose', 'M204 86 H170', this.side); // odsuń się od ekranu
    arrow('stillness', 'M78 28 C90 12 112 12 124 28', this.side); // zmień pozycję
    arrow('headTilt', 'M176 44 C186 58 186 74 176 86', this.front); // głowa prosto (kierunek ustawiany w update)
    arrow('shoulderTilt', 'M78 150 V112', this.front); // unieś niższy bark
    arrow('twist', 'M96 178 C116 190 144 190 164 178', this.front); // usiądź przodem

    this.render();
  }

  update(i: FigureInput): void {
    const s = i.severities;
    const on = i.state !== 'absent' && i.state !== 'paused';
    this.target = on
      ? {
          slouch: s.slouch ?? 0,
          head: s.headForward ?? 0,
          close: s.tooClose ?? 0,
          still: s.stillness ?? 0,
          roll: clamp(i.headRollDeg, -25, 25),
          shRoll: clamp(i.shoulderRollDeg, -15, 15),
          twist: s.twist ?? 0,
        }
      : { ...ZERO };
    const top = on ? i.topIssue : null;
    this.view = top && FRONT.includes(top) ? 'front' : 'side';
    this.arrowFor = top && (s[top] ?? (top === 'stillness' ? 1 : 0)) >= ARROW_FROM ? top : null;
    this.el.dataset.state = on ? i.state : 'idle';
    this.el.dataset.view = this.view;
    // Strzałka przechyłu głowy: w stronę wyprostowania (przeciwnie do przechyłu).
    const tilt = this.arrows.headTilt;
    if (tilt) tilt.setAttribute('transform', this.target.roll > 0 ? 'translate(260 0) scale(-1 1)' : '');
    const sh = this.arrows.shoulderTilt;
    // Niższy bark: przy dodatnim kącie (prawa strona niżej na obrazie) strzałka po prawej.
    if (sh) sh.setAttribute('transform', this.target.shRoll > 0 ? 'translate(104 0)' : '');
    for (const [id, g] of Object.entries(this.arrows) as [IssueId, SVGGElement][]) g.classList.toggle('on', id === this.arrowFor);
  }

  /** Płynne dojście do docelowej pozy; wołane z pętli rysowania (dt w ms). */
  tick(dt: number): void {
    const a = 1 - Math.exp(-dt / 160);
    let moved = false;
    for (const k of Object.keys(this.cur) as (keyof Pose)[]) {
      const d = this.target[k] - this.cur[k];
      if (Math.abs(d) > 0.001) {
        this.cur[k] += d * a;
        moved = true;
      }
    }
    if (moved) this.render();
  }

  private render(): void {
    const { slouch, head, close, roll, shRoll, twist } = this.cur;
    // Bok: biodro stałe, barki idą w przód i w dół przy garbieniu, plecy się zaokrąglają.
    const hx = 95, hy = 140;
    const sx = 95 + 16 * slouch, sy = 78 + 14 * slouch;
    const qx = 95 - 24 * slouch, qy = 110;
    this.spine.setAttribute('d', `M${hx} ${hy} Q${qx.toFixed(1)} ${qy} ${sx.toFixed(1)} ${sy.toFixed(1)}`);
    const nx = sx + 2 + 10 * head, ny = sy - 10 + 6 * head;
    this.neck.setAttribute('x1', sx.toFixed(1));
    this.neck.setAttribute('y1', sy.toFixed(1));
    this.neck.setAttribute('x2', nx.toFixed(1));
    this.neck.setAttribute('y2', ny.toFixed(1));
    const cx = nx + 2 + 16 * head, cy = ny - 16 + 10 * head;
    this.head.setAttribute('transform', `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${(28 * head).toFixed(1)})`);
    this.arm.setAttribute('points', `${sx.toFixed(1)},${(sy + 4).toFixed(1)} ${(sx + 16).toFixed(1)},${(sy + 40).toFixed(1)} 168,118`);
    this.upper.setAttribute('transform', `rotate(${(16 * close).toFixed(1)} ${hx} ${hy})`);
    // Przód: barki przechylone i węższe przy skręcie, głowa przechylona.
    const w = 1 - 0.38 * twist;
    this.fShoulders.setAttribute('transform', `translate(130 96) rotate(${shRoll.toFixed(1)}) scale(${w.toFixed(3)} 1)`);
    // Górne rogi tułowia obracają się razem z linią barków.
    const rad = (shRoll * Math.PI) / 180;
    const dx = 40 * w * Math.cos(rad), dy = 40 * w * Math.sin(rad);
    this.fTorso.setAttribute('d', `M${(130 - dx).toFixed(1)} ${(98 - dy).toFixed(1)} L106 170 M${(130 + dx).toFixed(1)} ${(98 + dy).toFixed(1)} L154 170 M106 170 H154`);
    this.fHead.setAttribute('transform', `translate(130 90) rotate(${roll.toFixed(1)})`);
  }
}
