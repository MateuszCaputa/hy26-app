// Animowane rysunki ćwiczeń: ludzik pokazuje ruch w pętli (CSS, klasy `.a-*` w styles.css).
// Ruchoma część ciała ma kolor akcentu, a przerywany „duch” pokazuje pozycję wyjściową.
// W oknie przerwy animacja gra zawsze, na liście ćwiczeń po najechaniu; „ogranicz ruch” ją wyłącza.
import type { Exercise } from '../core/coach';

const wrap = (body: string) =>
  `<svg viewBox="0 0 200 200" role="img" aria-hidden="true" class="figure-svg" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    ${body}</svg>`;

/** Ruchoma część: kolor akcentu. */
const accent = 'stroke="var(--spine)"';
/** Pozycja wyjściowa ruchomej części. */
const ghost = 'stroke-dasharray="4 7" stroke-width="3" opacity=".35"';
const floor = (y: number, x1 = 50, x2 = 150) => `<path d="M${x1} ${y} H${x2}" stroke-width="3" opacity=".3"/>`;

export const FIGURES: Record<Exercise['figure'], string> = {
  // Z boku: głowa cofa się poziomo (bez pochylania), przytrzymanie, powrót.
  chin: wrap(`
    ${floor(176)}
    <path d="M86 172 C88 142 92 122 98 106"/>
    <path d="M98 106 L104 98"/>
    <circle cx="108" cy="74" r="26" ${ghost}/>
    <g class="a a-chin" ${accent}>
      <circle cx="108" cy="74" r="26"/>
      <path d="M134 76 l8 5 l-8 4"/>
    </g>`),
  // Od tyłu: łopatki zbliżają się do kręgosłupa.
  blades: wrap(`
    <circle cx="100" cy="40" r="18"/>
    <path d="M100 58 V152"/>
    <path d="M54 84 Q100 74 146 84"/>
    <path d="M54 84 L46 150 M146 84 L154 150"/>
    <path d="M74 94 Q68 106 76 120 M126 94 Q132 106 124 120" ${ghost}/>
    <path class="a a-blade-l" ${accent} d="M74 94 Q68 106 76 120"/>
    <path class="a a-blade-r" ${accent} d="M126 94 Q132 106 124 120"/>`),
  // Z przodu: barki i ręce idą w górę do uszu i opadają.
  shrug: wrap(`
    <circle cx="100" cy="44" r="18"/>
    <path d="M100 62 V152"/>
    <path d="M56 94 Q100 82 144 94" ${ghost}/>
    <g class="a a-shrug" ${accent}>
      <path d="M56 94 Q100 82 144 94"/>
      <path d="M56 94 L50 160 M144 94 L150 160"/>
    </g>`),
  // Z przodu: głowa przechyla się uchem do barku, przytrzymanie, druga strona.
  'neck-side': wrap(`
    <path d="M100 80 V152"/>
    <path d="M56 98 Q100 86 144 98"/>
    <path d="M56 98 L48 162 M144 98 L152 162"/>
    <circle cx="100" cy="52" r="22" ${ghost}/>
    <g class="a a-neck" ${accent}>
      <path d="M100 74 V80"/>
      <circle cx="100" cy="52" r="22"/>
    </g>`),
  // Oko: wzrok odchodzi w dal (do drzewa), linia patrzenia płynie.
  eyes: wrap(`
    <path d="M24 100 Q62 64 100 100 Q62 136 24 100Z"/>
    <circle class="a a-pupil" cx="62" cy="100" r="12" ${accent}/>
    <path class="a a-gaze" d="M110 100 H160" stroke-dasharray="6 10" ${accent} stroke-width="3"/>
    <path d="M176 128 V112 M176 112 l-10 0 l10 -24 l10 24 z" stroke-width="3" opacity=".6"/>`),
  // Z boku: krok – nogi i ręce na zmianę.
  walk: wrap(`
    ${floor(178, 40, 170)}
    <circle cx="104" cy="34" r="15"/>
    <path d="M104 49 L101 110"/>
    <path class="a a-leg1" ${accent} d="M101 110 V174"/>
    <path class="a a-leg2" d="M101 110 V174"/>
    <path class="a a-arm1" d="M103 64 V106"/>
    <path class="a a-arm2" ${accent} d="M103 64 V106"/>`),
  // Z boku, na stojąco: dłonie splecione z tyłu, ręce w tył i w górę, mostek do przodu.
  chest: wrap(`
    ${floor(180)}
    <path d="M98 120 L92 178 M98 120 L106 178"/>
    <g class="a a-chest-torso">
      <circle cx="104" cy="34" r="16"/>
      <path d="M102 50 L98 120"/>
      <path d="M101 62 L84 112" ${ghost}/>
      <path class="a a-chest-arm" ${accent} d="M101 62 L84 112"/>
    </g>`),
  // Z przodu, na krześle: barki obracają się na boki (widać je węższe), głowa patrzy przed siebie.
  twist: wrap(`
    <path d="M70 128 H130 M74 128 L70 180 M126 128 L130 180"/>
    <circle cx="100" cy="40" r="18"/>
    <path d="M100 58 V128"/>
    <path d="M62 82 Q100 72 138 82" ${ghost}/>
    <g class="a a-twist" ${accent}>
      <path d="M62 82 Q100 72 138 82"/>
      <path d="M62 82 L74 122 M138 82 L126 122"/>
    </g>`),
};
