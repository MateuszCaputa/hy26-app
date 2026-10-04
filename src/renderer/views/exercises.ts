// Widok „Ćwiczenia”: biblioteka ćwiczeń do zrobienia w dowolnej chwili.
import type { AppCtx } from '../app';
import { EXERCISES, ISSUE_LABEL } from '../../core/coach';
import { h, svg, fmtMin } from '../dom';
import { FIGURES } from '../figures';
import { tr } from '../../shared/i18n';

export function renderExercises(view: HTMLElement, ctx: AppCtx): void {
  view.append(
    h('div', { class: 'page' },
      h('h1', null, tr('Ćwiczenia')),
      h('p', { class: 'fine' }, tr('Krótkie ćwiczenia na siedząco i na stojąco. Przy bólu lub drętwieniu skonsultuj się z fizjoterapeutą.')),
      h('ul', { class: 'ex-list' },
        EXERCISES.map((e) =>
          h('li', { class: 'ex' },
            svg(FIGURES[e.figure], 'ex-fig'),
            h('div', { class: 'ex-body' },
              h('h3', null, e.name),
              h('p', { class: 'fine' }, `${e.seconds < 60 ? `${e.seconds} s` : fmtMin(e.seconds / 60)}. ${tr('Pomaga przy: {list}', { list: e.forIssues.map((i) => ISSUE_LABEL[i].toLowerCase()).join(', ') })}`),
              h('button', { class: 'btn small', onclick: () => ctx.startBreak(undefined, e.id) }, tr('Zacznij')),
            ),
          ),
        ),
      ),
    ),
  );
}
