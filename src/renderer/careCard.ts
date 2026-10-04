// Karta „Do kogo iść?” w Statystykach (filar „dostęp do opieki zdrowotnej”).
// Pełna karta tylko, gdy core/carePattern.ts widzi wzorzec w ≥ 7 z 14 dni; poza tym mały link
// „Kiedy iść do specjalisty?” z ogólną wersją. Bez diagnoz: „może warto”, „rozważ”.
//
// Fakty o NFZ sprawdzone 2026-10-04:
// - TIP NFZ 800 190 590, bezpłatnie, całą dobę 7 dni w tygodniu:
//   https://www.nfz.gov.pl/kontakt/telefoniczna-informacja-pacjenta/
// - Okulista na NFZ wymaga skierowania („Od 2015 roku wymagane jest skierowanie do dermatologa i okulisty”):
//   https://www.nfz.gov.pl/dla-pacjenta/informacje-o-swiadczeniach/
// - Bez skierowania m.in. optometrysta (oraz psycholog, psychiatra, ginekolog, onkolog, wenerolog, dentysta):
//   https://pacjent.gov.pl/artykul/kto-i-kiedy-nie-potrzebuje-skierowania
// - Fizjoterapia ambulatoryjna na NFZ wymaga skierowania; wystawia je każdy lekarz ubezpieczenia zdrowotnego
//   (np. lekarz rodzinny): https://www.nfz-warszawa.pl/dla-pacjenta/co-kazdy-pacjent-wiedziec-powinien/ehabilitacjalecznicza/
import type { CareKind, StatsPayload } from '../shared/types';
import { h } from './dom';

const LEAD: Record<CareKind, string> = {
  neck: 'Twoja szyja często pracowała w niewygodnej pozycji. Jeśli do tego coś boli lub sztywnieje, może warto pokazać to specjaliście.',
  back: 'Twoje plecy i barki często pracowały w niewygodnej pozycji. Jeśli do tego coś boli, może warto pokazać to specjaliście.',
  eyes: 'Twoje oczy często pracowały długo bez odpoczynku. Jeśli pieką, łzawią albo widzisz gorzej, rozważ badanie wzroku.',
};

type Route = [who: string, what: string];

const GP: Route = ['Lekarz rodzinny (POZ)', 'dobry pierwszy krok, bez skierowania. Wystawi skierowanie dalej, jeśli będzie potrzebne.'];
const PHYSIO: Route = ['Fizjoterapeuta', 'oceni postawę i dobierze ćwiczenia. Na NFZ potrzebne jest skierowanie od lekarza, np. rodzinnego.'];
const EYES: Route[] = [
  ['Optometrysta', 'zbada wzrok i dobierze okulary do pracy przy ekranie, bez skierowania.'],
  ['Okulista', 'na NFZ ze skierowaniem, np. od lekarza rodzinnego.'],
];

const ROUTES: Record<CareKind, Route[]> = {
  neck: [PHYSIO, GP],
  back: [PHYSIO, GP],
  eyes: [...EYES, GP],
};

const routeList = (routes: Route[]) =>
  h('ul', { class: 'care-routes' }, routes.map(([who, what]) => h('li', null, h('strong', null, who), ` – ${what}`)));

/** Wspólny dół karty: infolinia NFZ, niepokojące objawy, zastrzeżenie. */
const footer = () => [
  h('p', { class: 'care-tip' },
    'Nie wiesz, gdzie się zapisać? Telefoniczna Informacja Pacjenta NFZ: ',
    h('strong', null, '800 190 590'), ' (bezpłatnie, całą dobę).'),
  h('p', { class: 'care-flags' },
    h('strong', null, 'Nie czekaj'),
    ' przy drętwieniu lub osłabieniu rąk, nagłym, bardzo silnym bólu głowy albo nagłych zaburzeniach widzenia: pilnie do lekarza, a w nagłej sytuacji dzwoń ',
    h('strong', null, '112'), '.'),
  h('p', { class: 'fine' }, 'Upright nie stawia diagnoz – pokazuje wzorce z Twoich danych.'),
];

export function careCard(st: StatsPayload): HTMLElement {
  const care = st.care;
  if (care?.kind) {
    const demo = new URLSearchParams(location.search).has('demo');
    return h('section', { class: 'block care' },
      h('h2', null, 'Do kogo iść?', demo ? h('span', { class: 'sim-badge', title: 'Wzorzec z przykładowych danych demo' }, 'DANE DEMO') : null),
      h('p', null, `W ${care.days} z ostatnich 14 dni ${LEAD[care.kind]}`),
      h('ul', { class: 'care-evidence fine' }, care.evidence.map((e) => h('li', null, e))),
      routeList(ROUTES[care.kind]),
      ...footer(),
    );
  }
  return h('section', { class: 'block care' },
    h('details', { class: 'care-more' },
      h('summary', null, 'Kiedy iść do specjalisty?'),
      h('p', null, 'Jeśli ból szyi, pleców albo zmęczenie oczu wracają mimo przerw i ćwiczeń, rozważ wizytę:'),
      h('p', { class: 'fine' }, 'Szyja, plecy, barki'),
      routeList([PHYSIO, GP]),
      h('p', { class: 'fine' }, 'Oczy'),
      routeList(EYES),
      ...footer(),
    ),
  );
}
