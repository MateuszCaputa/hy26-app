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
import type { CareEvidence, CareKind, StatsPayload } from '../shared/types';
import { h } from './dom';
import { tr } from '../shared/i18n';

// Teksty to klucze tr() (polski tekst); tłumaczymy przy rysowaniu, angielskie wersje w shared/i18n-en.ts.
const LEAD: Record<CareKind, string> = {
  neck: 'W {n} z ostatnich 14 dni Twoja szyja często pracowała w niewygodnej pozycji. Jeśli do tego coś boli lub sztywnieje, może warto pokazać to specjaliście.',
  back: 'W {n} z ostatnich 14 dni Twoje plecy i barki często pracowały w niewygodnej pozycji. Jeśli do tego coś boli, może warto pokazać to specjaliście.',
  eyes: 'W {n} z ostatnich 14 dni Twoje oczy często pracowały długo bez odpoczynku. Jeśli pieką, łzawią albo widzisz gorzej, rozważ badanie wzroku.',
};

/** Etykiety wzorców z core/carePattern.ts. */
const EVIDENCE_LABEL: Record<CareKind, string> = {
  neck: 'Szyja (głowa wysunięta, odchylona lub przechylona)',
  back: 'Plecy i barki (garbienie, uniesione lub krzywe barki)',
  eyes: 'Oczy (rzadkie mruganie lub wysokie zmęczenie)',
};

const evidenceText = (e: CareEvidence) =>
  tr('{label}: {days} z 14 dni, średnio {min} min dziennie', { label: tr(EVIDENCE_LABEL[e.kind]), days: e.days, min: e.avgMinutes });

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
  h('ul', { class: 'care-routes' }, routes.map(([who, what]) => h('li', null, h('strong', null, tr(who)), ` – ${tr(what)}`)));

/** Wspólny dół karty: infolinia NFZ, niepokojące objawy, zastrzeżenie. */
const footer = () => [
  h('p', { class: 'care-tip' },
    tr('Nie wiesz, gdzie się zapisać? Telefoniczna Informacja Pacjenta NFZ: '),
    h('strong', null, '800 190 590'), tr(' (bezpłatnie, całą dobę).')),
  h('p', { class: 'care-flags' },
    h('strong', null, tr('Nie czekaj')),
    tr(' przy drętwieniu lub osłabieniu rąk, nagłym, bardzo silnym bólu głowy albo nagłych zaburzeniach widzenia: pilnie do lekarza, a w nagłej sytuacji dzwoń '),
    h('strong', null, '112'), '.'),
  h('p', { class: 'fine' }, tr('Upright nie stawia diagnoz – pokazuje wzorce z Twoich danych.')),
];

export function careCard(st: StatsPayload): HTMLElement {
  const care = st.care;
  if (care?.kind) {
    const demo = new URLSearchParams(location.search).has('demo');
    return h('section', { class: 'block care' },
      h('h2', null, tr('Do kogo iść?'), demo ? h('span', { class: 'sim-badge', title: tr('Wzorzec z przykładowych danych demo') }, tr('DANE DEMO')) : null),
      h('p', null, tr(LEAD[care.kind], { n: care.days })),
      h('ul', { class: 'care-evidence fine' }, care.evidence.map((e) => h('li', null, evidenceText(e)))),
      routeList(ROUTES[care.kind]),
      ...footer(),
    );
  }
  return h('section', { class: 'block care' },
    h('details', { class: 'care-more' },
      h('summary', null, tr('Kiedy iść do specjalisty?')),
      h('p', null, tr('Jeśli ból szyi, pleców albo zmęczenie oczu wracają mimo przerw i ćwiczeń, rozważ wizytę:')),
      h('p', { class: 'fine' }, tr('Szyja, plecy, barki')),
      routeList([PHYSIO, GP]),
      h('p', { class: 'fine' }, tr('Oczy')),
      routeList(EYES),
      ...footer(),
    ),
  );
}
