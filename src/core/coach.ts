// Komunikaty, ćwiczenia rozluźniające i porady ergonomiczne.
import type { BreakKind, FatigueLevel, IssueId } from '../shared/types';
import { localized, tr } from '../shared/i18n';

export const ISSUE_LABEL: Record<IssueId, string> = localized({
  headForward: 'Głowa wysunięta do przodu',
  headBack: 'Głowa odchylona do tyłu',
  shrug: 'Barki uniesione',
  slouch: 'Garbienie',
  headTilt: 'Przechył głowy',
  shoulderTilt: 'Przechył barków',
  tooClose: 'Za blisko ekranu',
  twist: 'Skręt tułowia',
  stillness: 'Długi bezruch',
});

/** Jedna, konkretna wskazówka „na teraz”. */
export const ISSUE_TIP: Record<IssueId, string> = localized({
  headForward: 'Cofnij brodę, jakbyś robił „podwójny podbródek”.',
  headBack: 'Opuść lekko brodę – patrz prosto przed siebie.',
  shrug: 'Opuść barki – rozluźnij je w dół, z dala od uszu.',
  slouch: 'Oprzyj plecy i unieś mostek.',
  headTilt: 'Ustaw głowę prosto nad barkami.',
  shoulderTilt: 'Wyrównaj barki i sprawdź podłokietniki.',
  tooClose: 'Odsuń się na długość ręki (ok. 50–70 cm).',
  twist: 'Usiądź przodem do ekranu.',
  stillness: 'Zmień pozycję – rusz barkami i plecami.',
});

/** Co poprawić na stałe: rada ergonomiczna do najczęstszego problemu tygodnia. */
export const ERGONOMIC_TIP: Record<IssueId, string> = localized({
  shrug: 'Obniż biurko lub podłokietniki, żeby przedramiona leżały swobodnie, a barki nie musiały się unosić.',
  headBack: 'Obniż monitor: górna krawędź na wysokości oczu lub trochę niżej, żeby nie zadzierać głowy.',
  headForward: 'Podnieś monitor tak, by jego górna krawędź była na wysokości oczu; laptop postaw na podstawce z osobną klawiaturą.',
  slouch: 'Wsuń się głębiej w krzesło i użyj podparcia lędźwi (np. zwinięty ręcznik); stopy płasko na podłodze.',
  headTilt: 'Sprawdź, czy monitor stoi na wprost, a dokumenty nie leżą z boku; trzymając telefon, nie dociskaj go barkiem.',
  shoulderTilt: 'Wyrównaj podłokietniki i trzymaj mysz blisko klawiatury, łokcie pod kątem ok. 90°.',
  tooClose: 'Odsuń monitor na ok. 50–70 cm albo powiększ czcionkę w systemie zamiast przysuwać się do ekranu.',
  twist: 'Ustaw główny monitor dokładnie na wprost; drugi ekran obok, nie pod kątem wymagającym skrętu.',
  stillness: 'Ustaw sobie nawyk: każda rozmowa telefoniczna na stojąco, woda poza zasięgiem ręki.',
});

export interface Exercise {
  id: string;
  name: string;
  /** Czas ćwiczenia w sekundach (licznik na ekranie przerwy). */
  seconds: number;
  steps: string[];
  kinds: BreakKind[];
  /** Problemy, przy których to ćwiczenie jest dobierane w pierwszej kolejności. */
  forIssues: IssueId[];
  /** Ikona/rysunek: identyfikator ilustracji w UI. */
  figure: 'chin' | 'blades' | 'shrug' | 'neck-side' | 'eyes' | 'walk' | 'chest' | 'twist';
}

const RAW_EXERCISES: Exercise[] = [
  {
    id: 'eyes-20',
    name: 'Reguła 20-20-20',
    seconds: 20,
    steps: ['Oderwij wzrok od ekranu.', 'Patrz na coś oddalonego o ok. 6 m (okno, koniec pokoju).', 'Mrugnij świadomie kilka razy.'],
    kinds: ['eye'],
    forIssues: ['tooClose'],
    figure: 'eyes',
  },
  {
    id: 'chin-tuck',
    name: 'Cofanie brody',
    seconds: 60,
    steps: ['Usiądź prosto, patrz przed siebie.', 'Cofnij brodę poziomo, bez pochylania głowy.', 'Przytrzymaj 3 s, rozluźnij. Powtórz 10 razy.'],
    kinds: ['micro'],
    forIssues: ['headForward'],
    figure: 'chin',
  },
  {
    id: 'blade-squeeze',
    name: 'Ściąganie łopatek',
    seconds: 60,
    steps: ['Opuść barki od uszu.', 'Ściągnij łopatki do siebie i lekko w dół.', 'Przytrzymaj 5 s. Powtórz 10 razy.'],
    kinds: ['micro'],
    forIssues: ['slouch', 'headForward'],
    figure: 'blades',
  },
  {
    id: 'shrugs',
    name: 'Unoszenie i krążenia barków',
    seconds: 45,
    steps: ['Unieś barki do uszu i opuść – 10 razy.', 'Zrób 10 krążeń barkami do tyłu.', 'Rozluźnij ręce wzdłuż tułowia.'],
    kinds: ['micro'],
    forIssues: ['shrug', 'shoulderTilt', 'stillness'],
    figure: 'shrug',
  },
  {
    id: 'neck-side',
    name: 'Rozciąganie boczne szyi',
    seconds: 45,
    steps: ['Przechyl głowę uchem do barku.', 'Przytrzymaj 20 s, oddychając spokojnie.', 'Zmień stronę.'],
    kinds: ['micro'],
    forIssues: ['headTilt', 'shoulderTilt', 'headBack'],
    figure: 'neck-side',
  },
  {
    id: 'seated-twist',
    name: 'Skręt tułowia na siedząco',
    seconds: 40,
    steps: ['Usiądź prosto, dłoń na przeciwnym kolanie.', 'Obróć tułów i przytrzymaj 15 s.', 'Zmień stronę.'],
    kinds: ['micro'],
    forIssues: ['twist', 'stillness'],
    figure: 'twist',
  },
  {
    id: 'chest-opener',
    name: 'Otwarcie klatki piersiowej',
    seconds: 60,
    steps: ['Wstań, spleć dłonie za plecami.', 'Wyprostuj ręce i unieś mostek, łopatki do siebie.', 'Przytrzymaj 30 s, oddychając głęboko.'],
    kinds: ['micro', 'move'],
    forIssues: ['slouch'],
    figure: 'chest',
  },
  {
    id: 'walk',
    name: 'Przejdź się',
    seconds: 300,
    steps: ['Wstań od biurka.', 'Przejdź się 3–5 min: woda, schody, okno.', 'Na koniec rozciągnij klatkę i kark.'],
    kinds: ['move'],
    forIssues: ['stillness', 'slouch', 'headForward'],
    figure: 'walk',
  },
];

/** Nazwa i kroki ćwiczenia tłumaczone przy odczycie (reszta pól bez zmian). */
export const EXERCISES: Exercise[] = RAW_EXERCISES.map((e) => new Proxy(e, {
  get: (t, k) => (k === 'name' ? tr(t.name) : k === 'steps' ? t.steps.map((x) => tr(x)) : t[k as keyof Exercise]),
}));

export const exerciseById = (id: string): Exercise => EXERCISES.find((e) => e.id === id) ?? EXERCISES[0];

/** Dobiera ćwiczenie: najpierw pasujące do problemu, potem rotacja (seed = minuta). */
/**
 * Wybór ćwiczenia: po równo ze wszystkich ćwiczeń danego rodzaju (mikroprzerwa = wszystkie poza 20-20-20 i „Przejdź się”).
 * `_issue` zostaje w podpisie dla wywołujących, ale nie zawęża wyboru – zawężanie dawało w kółko te same dwa ćwiczenia.
 * `avoid` – ćwiczenie pokazane ostatnio, pomijamy je, o ile jest z czego wybrać.
 */
export function pickExercise(kind: BreakKind, _issue: IssueId | null, seed = 0, avoid?: string | null): string {
  const pool = EXERCISES.filter((e) => e.kinds.includes(kind));
  const fresh = avoid ? pool.filter((e) => e.id !== avoid) : pool;
  const list = fresh.length ? fresh : pool;
  return list[Math.floor(Math.abs(seed)) % list.length].id;
}

export const BREAK_TITLE: Record<BreakKind, string> = localized({
  eye: 'Przerwa dla oczu',
  micro: 'Mikroprzerwa',
  move: 'Przerwa ruchowa',
});

export const BREAK_REASON: Record<string, string> = localized({
  timer: 'Minął zaplanowany czas pracy.',
  alerts: 'Postawa psuła się kilka razy w ciągu ostatnich 15 min.',
  fatigue: 'Wskaźnik zmęczenia rośnie – lepiej odpocząć teraz.',
  'posture-trend': 'Wynik postawy spada od kwadransa – to typowy znak zmęczenia.',
});

export const FATIGUE_LABEL: Record<FatigueLevel, string> = localized({
  fresh: 'świeży',
  tired: 'zmęczony',
  veryTired: 'bardzo zmęczony',
});

export function fatigueAdvice(level: FatigueLevel, blinkRate: number | null): string {
  if (blinkRate !== null && blinkRate < 8) return tr('Mrugasz rzadko – mrugnij świadomie kilka razy i spójrz w dal.');
  if (level === 'veryTired') return tr('Zrób przerwę ruchową: wstań, napij się wody, przewietrz pokój.');
  if (level === 'tired') return tr('Zaplanuj przerwę w ciągu kilkunastu minut.');
  return tr('Dobra forma – to dobry moment na zadania wymagające skupienia.');
}
