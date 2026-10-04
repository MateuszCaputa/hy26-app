# Scenariusz wideo do zgłoszenia (etap 1) – ok. 3 min

> Wideo dołączamy do zgłoszenia jako link (np. YouTube niepubliczny – sprawdzić w trybie incognito). W 1. rundzie mentorzy **nie uruchamiają aplikacji**, więc to wideo „pokazuje” Upright.
> Zasady: **historia przed funkcjami** (`NA-KONIEC.md` §1), **pokazujemy 4 rzeczy dobrze** (uwaga mentora), mówimy tylko o tym, co jest w `main` (`docs/FEATURES.md` → „Known gaps / don't claim yet”).
> Cztery rzeczy, które pokazujemy: **(1)** nakładka – kontur powiek + szkielet zapalający się przy problemie, **(2)** decyzja – przerwa z powodem i „Dlaczego X%?”, **(3)** ćwiczenie liczone kamerą, **(4)** zmęczenie narastające w trybie prezentacji. Prywatność i „co dalej” – tylko słowami.

## Scenariusz

| Czas | Co na ekranie | Co mówimy (krótko) | Jak to wywołać w aplikacji |
|---|---|---|---|
| 0:00–0:20 | Twarz osoby przy laptopie, późno w nocy. Pochylona głowa, tarcie oczu. | „Siedzimy przy laptopach od wielu godzin. Szyja boli. Oczy pieką. Zauważamy to dopiero wieczorem – za późno.” | Bez aplikacji. Ujęcie z boku albo z kamery telefonu. |
| 0:20–0:40 | Sala hackathonu / nasze biurko, potem okno Upright „Na żywo”. | „Jesteśmy zespołem z HackYeah 2026. Zamiast kolejnego budzika zrobiliśmy aplikację, która patrzy razem z Tobą – i mówi, kiedy przestać.” | `npm start`, widok **Na żywo** po kalibracji. |
| 0:40–1:10 | **Wow:** podgląd kamery z konturem powiek i tęczówek. Mruganie widać na nakładce. Potem garbimy się / wysuwamy głowę – zapala się tylko odcinek, z którym jest problem, z podpisem. | „Upright widzi, jak mrugasz. Widzi szyję i barki. Kiedy wszystko jest dobrze, nakładka jest spokojna. Zapala się tylko to, co trzeba poprawić.” | Widok **Na żywo**. Usiąść prosto 3 s, potem wysunąć głowę do ekranu / unieść jeden bark. Trzymać 2–3 s, żeby kolor zdążył się zmienić. |
| 1:10–1:35 | Panel po prawej: „Zmęczenie X%” → rozwinięte **„Dlaczego X%?”** (składowe z wagami i normą, na dole „Wskaźnik orientacyjny, nie diagnoza medyczna.”). | „To nie jest czarna skrzynka. Każdy procent ma powód: mruganie, przymknięte oczy, ziewanie, czas bez przerwy. Porównujemy Cię tylko z Tobą.” | Kliknąć **„Dlaczego X%?”** pod paskiem zmęczenia. Najlepiej po kroku z trybem prezentacji (niżej), żeby liczby były wyraźne – albo nagrać ten fragment po 2:05. |
| 1:35–2:05 | **Decyzja:** ekran przerwy z linią powodu („Wynik postawy spada od kwadransa…”) i ćwiczeniem **Cofanie brody**. Start → licznik powtórzeń rośnie z kamery → „Zrobione” → komunikat „Ćwiczenie wykonane – kamera to potwierdziła.” | „Upright nie tylko mierzy. Mówi: przerwa teraz – i dlaczego. Ćwiczenie? Kamera sama liczy powtórzenia. Nie trzeba niczego klikać w trakcie.” | Najpewniej: `node build.mjs && npx electron . --view=break` (otwiera przerwę z powodem i cofaniem brody). Albo: **Ćwiczenia** → Cofanie brody → **Zacznij**. Kliknąć **Start**, robić powtórzenia z przytrzymaniem ok. 1,5 s. Wybrać ćwiczenie, które wyszło najpewniej na próbach (zapas: **Unoszenie i krążenia barków** lub **Rozciąganie boczne szyi**). |
| 2:05–2:30 | **Tryb prezentacji:** Ustawienia → przełącznik „Tryb prezentacji: symulacja zmęczenia” → powrót do **Na żywo**, zmęczenie rośnie, plakietka **SYMULACJA**. | „Zmęczenie narasta powoli, więc na potrzeby nagrania przyspieszamy je. To symulacja – jest wyraźnie oznaczona i nie trafia do statystyk. Tak wygląda popołudnie po pięciu godzinach przy ekranie.” | **Ustawienia** → grupa **Prezentacja** → zaznaczyć. Wrócić do **Na żywo**, poczekać ok. 45 s (w montażu przyspieszyć). Wyłączyć po nagraniu (albo zamknąć aplikację). |
| 2:30–2:45 | Ustawienia → grupa **Dane**: „Obraz z kamery nie jest zapisywany ani wysyłany. Baza zawiera tylko liczby…”. | „Wszystko liczy się na Twoim laptopie. Obraz nigdy nie wychodzi z komputera. Zapisujemy tylko liczby. Bez diagnoz i bez rozpoznawania emocji.” | **Ustawienia**, przewinąć do **Dane**. Nie klikać „Usuń moje dane”. |
| 2:45–3:00 | Plansza „Co dalej” (2–3 punkty), na końcu logo Upright. | „Co dalej? Gdy problem z szyją czy oczami się powtarza – skrót do właściwego specjalisty, raport dla lekarza i ścieżka NFZ. Potem firmy, szkoły, fizjoterapia między wizytami. Upright. Siedź prosto, odpoczywaj na czas.” | Plansza w montażu (z `docs/pitch/IDEAS.md` → „Co dalej”). **Mówimy w czasie przyszłym** – karty NFZ i raportu dla lekarza nie ma jeszcze w `main`. |

## Czego NIE mówimy (stan `main`, wg `docs/FEATURES.md`)
- Nie: „diagnozuje”, „wykrywa chorobę”. Tak: „wskaźnik”, „może wskazywać”, „warto skonsultować”.
- Nie: „powiadomienie natychmiast” – domyślnie ok. 40 s złej postawy.
- Nie: „dokładne mrugnięcia w okularach” – w okularach bywa niepewnie; nagrywać bez okularów albo nie mówić o dokładności.
- Nie: raport dla lekarza, karta NFZ, widok zespołu jako gotowe funkcje – tylko jako „co dalej”.
- Nie: „mierzyliśmy cały zespół przez 24 h” – chyba że mamy prawdziwe dane do pokazania.
- Każda liczba na ekranie musi być prawdziwa albo oznaczona (tryb prezentacji = **SYMULACJA**).

## Checklista przed nagraniem
- [ ] **Skupienie / Nie przeszkadzać** włączone w systemie (zero powiadomień z Discorda, poczty, Slacka). Zamknięte zbędne aplikacje i karty.
- [ ] **Ładowarka podłączona** – na baterii analiza twarzy zwalnia (25 → 15 kl./s), kontur powiek jest mniej płynny.
- [ ] **Światło:** twarz oświetlona z przodu, bez okna za plecami; bez odblasków w okularach (najlepiej nagrywać bez okularów).
- [ ] **Kadr:** widać głowę i oba barki; kamera na wysokości oczu, ok. 50–70 cm od twarzy.
- [ ] **Kalibracja świeża:** Kalibracja (zasobnik → Kalibracja) w tym samym miejscu i świetle, w którym nagrywamy.
- [ ] **Dane:** do nagrania „Na żywo” używamy prawdziwej kamery (`npm start`). Jeśli pokazujemy statystyki – tylko z danych demo, z napisem w montażu „dane przykładowe” (`npm run seed-demo && npm run demo:stats`).
- [ ] **Tryb prezentacji wyłączony** na początku (włączamy dopiero w kroku 2:05). Po nagraniu wyłączyć / zamknąć aplikację.
- [ ] **Próba ćwiczenia** 2–3 razy przed nagraniem; nagrywamy tylko to, które liczy się pewnie.
- [ ] **Okno aplikacji** na pełnym ekranie 1920×1080, nagrywanie ekranu w 1080p, mikrofon zewnętrzny lub cichy pokój.
- [ ] **Długość ≤ 3:00** po montażu; napisy PL (opcjonalnie EN).
- [ ] Link (YouTube niepubliczny) sprawdzony w trybie incognito przed wklejeniem do zgłoszenia.
