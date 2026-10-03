// Proste rysunki ćwiczeń (linia + akcent na ruchomej części).
import type { Exercise } from '../core/coach';

const wrap = (body: string) =>
  `<svg viewBox="0 0 200 200" role="img" aria-hidden="true" class="figure-svg" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <defs><marker id="fa" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--spine)" stroke="none"/></marker></defs>
    ${body}</svg>`;

const accent = 'stroke="var(--spine)" stroke-width="5"';

export const FIGURES: Record<Exercise['figure'], string> = {
  chin: wrap(`
    <path d="M70 168 C76 130 82 112 92 100"/>
    <circle cx="104" cy="70" r="30"/>
    <path d="M132 76 l8 6 l-8 4"/>
    <path ${accent} marker-end="url(#fa)" d="M164 72 H132" class="move-x"/>
    <path d="M60 172 H150" stroke-width="3" opacity=".4"/>`),
  blades: wrap(`
    <circle cx="100" cy="42" r="20"/>
    <path d="M100 62 V150"/>
    <path d="M52 84 Q100 70 148 84"/>
    <path d="M52 84 L44 150 M148 84 L156 150"/>
    <path ${accent} marker-end="url(#fa)" d="M66 110 H88" class="move-in-l"/>
    <path ${accent} marker-end="url(#fa)" d="M134 110 H112" class="move-in-r"/>`),
  shrug: wrap(`
    <circle cx="100" cy="46" r="20"/>
    <path d="M100 66 V150"/>
    <path d="M56 92 Q100 80 144 92" class="move-y"/>
    <path d="M56 92 L48 160 M144 92 L152 160"/>
    <path ${accent} marker-end="url(#fa)" marker-start="url(#fa)" d="M40 64 V100"/>
    <path ${accent} marker-end="url(#fa)" marker-start="url(#fa)" d="M160 64 V100"/>`),
  'neck-side': wrap(`
    <g class="tilt"><circle cx="100" cy="50" r="22"/></g>
    <path d="M100 74 V150"/>
    <path d="M56 96 Q100 84 144 96"/>
    <path d="M56 96 L48 162 M144 96 L152 162"/>
    <path ${accent} marker-end="url(#fa)" d="M126 24 Q146 40 140 66"/>`),
  eyes: wrap(`
    <path d="M30 100 Q70 62 110 100 Q70 138 30 100Z"/>
    <circle cx="70" cy="100" r="14"/>
    <path ${accent} marker-end="url(#fa)" d="M120 100 H180" stroke-dasharray="6 10"/>
    <path d="M178 76 V124" stroke-width="3" opacity=".4"/>`),
  walk: wrap(`
    <circle cx="104" cy="34" r="16"/>
    <path d="M104 50 L98 112"/>
    <path d="M98 112 L76 172 M98 112 L124 168" class="step"/>
    <path d="M102 66 L78 98 M102 66 L130 92"/>
    <path ${accent} marker-end="url(#fa)" d="M40 186 H170"/>`),
  chest: wrap(`
    <circle cx="100" cy="36" r="18"/>
    <path d="M100 54 V124"/>
    <path d="M100 124 L86 180 M100 124 L114 180"/>
    <path d="M100 66 L80 104 L100 118 M100 66 L120 104 L100 118"/>
    <path ${accent} marker-end="url(#fa)" d="M136 84 Q156 70 168 76"/>
    <path ${accent} marker-end="url(#fa)" d="M64 84 Q44 70 32 76"/>`),
  twist: wrap(`
    <circle cx="100" cy="40" r="18"/>
    <path d="M100 58 V128"/>
    <path d="M62 82 Q100 72 138 82" class="tilt"/>
    <path d="M70 128 H130 M74 128 L70 180 M126 128 L130 180"/>
    <path ${accent} marker-end="url(#fa)" d="M56 112 Q100 140 144 112"/>`),
};
