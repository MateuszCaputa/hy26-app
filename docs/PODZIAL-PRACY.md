# Podział pracy — Rytm (4 osoby)

> **Jak czytać ten plik:** znajdź swój obszar (A, B, C albo D), przeczytaj sekcję 1 i 3–6, a potem bierz zadania ze swojej karty po kolei.
> Każde zadanie ma: **cel, pliki, kroki, „gotowe gdy”, zależności** i **gotowe polecenie dla Claude'a** do wklejenia.
>
> Jedna osoba = jeden obszar = własne katalogi. Obszary spotykają się tylko na **kontraktach danych** (sekcja 3).
> Dzięki temu 4 osoby i 4 Claude'y pracują równolegle bez konfliktów w gicie.

---

## 1. Kto za co odpowiada

| Obszar | Kto | Za co odpowiada | Katalogi (tylko ta osoba je zmienia) | Prefiks gałęzi |
|---|---|---|---|---|
| **A — Pomiar i aplikacja** | `<imię>` | Kamera mierzy dobrze, aplikacja działa 24 h, dane zespołu są bezpieczne, jest gotowy `.exe` | `src/lib/monitor.js`, `src/lib/metrics.js`, `src/lib/ticker.worker.js`, `src/lib/db.js`, `electron/`, `scripts/`, `public/` | `a/` |
| **B — Dane zdrowotne i decyzje** | `<imię>` | Import danych z telefonów i logika: co Rytm radzi teraz i co by się stało, gdyby… | `src/lib/import/`, `src/lib/decisions/`, `src/lib/whatif/`, `src/data/` | `b/` |
| **C — Interfejs i wygląd** | `<imię>` | Wszystkie ekrany demo — czytelne, ładne, prowadzą jury krok po kroku (Design = 20% oceny) | `src/screens/`, `src/components/`, `src/index.css`, `src/App.jsx` | `c/` |
| **D — Opieka zdrowotna, pitch, eksperyment** | `<imię>` | Treści medyczne i ścieżki NFZ, pomiar zespołu, prezentacja, zgłoszenie na HackTribe | `src/content/`, `docs/pitch/`, `README.md` | `d/` |

**Kapitan demo = osoba D.** Pilnuje czasu, prowadzi synchronizacje co 2 h, ma ostatnie słowo przy cięciu zakresu.

**Na start każdy:**
```bash
git clone https://github.com/MateuszCaputa/hy26-app.git && cd hy26-app
npm ci
npx electron --version     # pobiera Electrona przy pierwszym uruchomieniu
npm run desktop            # uruchamia Rytm → Start → imię + zgoda → kalibracja
claude                     # Claude Code czyta CLAUDE.md i ten plik
```
Pierwsze polecenie dla Claude'a: *„Przeczytaj CLAUDE.md i docs/PODZIAL-PRACY.md. Jestem osobą X (obszar …). Zaczynamy od zadania X1.”*

---

## 2. Karty zadań

Kolejność w karcie = priorytet. ✅ = już jest w `main`.

### A — Pomiar i aplikacja

**Już zrobione:** ✅ kamera + MediaPipe (twarz i sylwetka), kalibracja, wynik postawy 0–100, mruganie, PERCLOS, ziewanie, obecność, zapis co minutę do IndexedDB · ✅ Electron: zasobnik systemowy, pomiar przy schowanym oknie, kopia co 10 min do `Dokumenty/Rytm`, blokada usypiania · ✅ test dymny `scripts/desktop-smoke.mjs`.

#### A1 — Strojenie wykrywania na prawdziwych ludziach ⏱ ~2 h
- **Cel:** liczby na ekranie „Na żywo” zgadzają się z tym, co robi człowiek. Bez tego wykres na pitch jest niewiarygodny.
- **Pliki:** `src/lib/metrics.js` (progi), ewentualnie `src/lib/monitor.js`.
- **Kroki:**
  1. Każda z 4 osób robi 2-minutowy test: siedzi prosto → garbi się → przysuwa się do ekranu → mruga 10 razy → ziewa 2 razy.
  2. Notujesz, co pokazał Rytm (postawa, mrugnięcia, ziewnięcia) i ile było naprawdę.
  3. **Osobno 2 osoby w okularach:** czy mrugnięcia się liczą? Jeśli nie — obniż próg `blink > 0.5` / `< 0.35` w `MinuteAggregator` (np. 0.4 / 0.25) i sprawdź ponownie.
  4. Postawa: garbienie powinno dawać wynik < 70 w ciągu kilku sekund; prosta pozycja > 85.
- **Gotowe gdy:** dla każdej osoby mrugnięcia w teście ±20% od faktycznej liczby, garbienie zawsze daje < 70, ziewnięcia wykrywane 2/2.
- **Zależności:** brak. **Zacznij od razu.**
- **Polecenie dla Claude'a:** *„Zadanie A1. Pomóż mi dostroić progi w src/lib/metrics.js. Wyniki testów: [wklej]. Zaproponuj nowe progi, nie zmieniaj formatu danych zapisywanych w IndexedDB.”*

#### A2 — Kilka osób na jednym laptopie ⏱ ~1 h
- **Cel:** jeśli ktoś pożycza laptop, dane się nie mieszają.
- **Pliki:** `src/lib/monitor.js`, `src/lib/db.js` (+ jedna kontrolka u C na ekranie Start — uzgodnij).
- **Kroki:** przełączenie osoby → `monitor.start(nowaOsoba)` wczytuje jej kalibrację (`baseline:<osoba>`), bieżąca minuta zapisuje się jeszcze na starą osobę.
- **Gotowe gdy:** zmiana osoby w trakcie pomiaru nie przypisuje minut do złej osoby (sprawdzone na „Dane zespołu”).

#### A3 — Eksport raportu do PDF ⏱ ~1 h
- **Cel:** przycisk „Pobierz PDF dla lekarza” daje prawdziwy plik PDF.
- **Pliki:** `electron/main.cjs`, `electron/preload.cjs`.
- **Kroki:** dodaj `ipcMain.handle('rytm:pdf', …)` → `win.webContents.printToPDF({ pageSize: 'A4', printBackground: true })` → zapis do `Dokumenty/Rytm/raport-RRRR-MM-DD.pdf`; wystaw w preload jako `window.rytmDesktop.exportPdf()`. C wywołuje to na ekranie raportu (ekran ma styl `@media print`).
- **Gotowe gdy:** PDF ma 1–2 strony A4, bez paska nawigacji, otwiera się w przeglądarce.
- **Zależności:** układ raportu od C (C6). Funkcję możesz zrobić wcześniej na dowolnym ekranie.

#### A4 — Release dla zespołu ⏱ ~30 min (powtarzaj po większych zmianach)
- **Cel:** każdy pobiera `Rytm.exe` jednym kliknięciem, bez Node.js.
- **Kroki:** podbij `version` w `package.json` → `npm run dist:win` → GitHub → Releases → nowy release z plikiem `release/Rytm-<wersja>.exe`. Mac: `npm run dist:mac` tylko na Macu.
- **Gotowe gdy:** osoba bez Node.js pobiera plik, uruchamia go („Więcej informacji → Uruchom mimo to” przy SmartScreen) i mierzy się.

#### A5 — Wydajność przez 24 h ⏱ ~1 h
- **Cel:** Rytm nie spowalnia laptopów, na których kodujecie.
- **Kroki:** Menedżer zadań → zużycie CPU przez Rytm. Jeśli > 15%: zmniejsz `TICK_MS` do 100 ms albo `POSE_EVERY` do 5 w `monitor.js` i sprawdź, czy mrugnięcia dalej się liczą (A1).
- **Gotowe gdy:** CPU < 15% na każdym laptopie zespołu, mruganie wciąż wykrywane.

---

### B — Dane zdrowotne i decyzje

Odpowiadasz za to, **co** Rytm radzi i **na jakiej podstawie**. Jak to wygląda — robi C. Teksty — robi D.

#### B1 — Przykładowy zestaw danych z 60 dni ⏱ ~1,5 h · **PIERWSZE, bo C na nim pracuje**
- **Cel:** realistyczne dane do budowy ekranów i zabezpieczenie demo, gdyby import zawiódł.
- **Pliki:** `src/data/sample.js` → `export const SAMPLE_DAYS = [DayRecord, …]` (kontrakt w sekcji 3).
- **Kroki:**
  1. Generator z ustalonym ziarnem (te same dane przy każdym uruchomieniu).
  2. Realistyczne wartości: sen 5–8,5 h, tętno spoczynkowe 55–70, HRV 25–70 ms, kroki 2–15 tys., 2–4 treningi w tygodniu.
  3. Wbuduj zależności, które „co jeśli” ma pokazać: po < 6 h snu HRV następnego dnia niższe o ok. 10–15%; dni z treningiem → niższy stres; weekend → więcej snu.
  4. Każdy rekord ma `source: 'sample'` — interfejs zawsze pokazuje „dane przykładowe”.
- **Gotowe gdy:** 60 rekordów, wszystkie pola z kontraktu, C może je zaimportować i narysować.
- **Polecenie dla Claude'a:** *„Zadanie B1 z docs/PODZIAL-PRACY.md. Zrób src/data/sample.js zgodnie z kontraktem DayRecord, deterministyczny generator, zależności opisane w karcie.”*

#### B2 — Import Apple Health (z Fitatu) ⏱ ~3 h
- **Cel:** prawdziwe dane z iPhone'a jednego z nas.
- **Pliki:** `src/lib/import/apple.js` + worker `src/lib/import/apple.worker.js`.
- **Jak zdobyć plik:** iPhone → Zdrowie → zdjęcie profilu → „Eksportuj wszystkie dane zdrowotne” → rozpakuj ZIP → plik `eksport.xml` (po angielsku `export.xml`). **Wcześniej:** w Fitatu włącz synchronizację z Apple Zdrowie, wtedy posiłki i waga są w tym samym pliku.
- **Kroki:**
  1. Plik ma setki MB → **czytaj strumieniowo w workerze** (`file.stream()` + `TextDecoderStream`), wyrażeniem regularnym wyłapuj znaczniki `<Record …/>` i `<Workout …>`. Nie ładuj całości do pamięci i nie używaj DOMParsera.
  2. Typy do wyciągnięcia (atrybut `type`):
     - sen: `HKCategoryTypeIdentifierSleepAnalysis` (licz tylko wartości „Asleep…”, nie „InBed”),
     - `HKQuantityTypeIdentifierRestingHeartRate`, `HKQuantityTypeIdentifierHeartRateVariabilitySDNN`,
     - `HKQuantityTypeIdentifierStepCount`, elementy `Workout`,
     - Fitatu: `HKQuantityTypeIdentifierDietaryEnergyConsumed`, `HKQuantityTypeIdentifierBodyMass`.
  3. Agreguj do dni → `DayRecord` z `source: 'apple'`. Sen przypisuj do dnia, w którym się kończy.
  4. Raportuj postęp (procent wczytanego pliku) — C pokaże pasek postępu.
- **Gotowe gdy:** prawdziwy eksport wczytuje się bez zawieszenia aplikacji, wynik: tablica dni z ostatnich miesięcy, liczby zgadzają się z aplikacją Zdrowie (sprawdź 3 losowe dni).
- **Zależności:** plik od osoby z iPhone'em (D zbiera).

#### B3 — Import Samsung Health ⏱ ~2 h
- **Cel:** druga platforma (Android) — pokazuje „rozproszone dane”, o których mówi zadanie.
- **Pliki:** `src/lib/import/samsung.js`.
- **Jak zdobyć:** Samsung Health → Ustawienia → Prywatność / Zarządzanie danymi → „Pobierz dane osobiste” → folder z plikami CSV.
- **Kroki:**
  1. Użytkownik wybiera **kilka plików CSV naraz**. Nazwy zaczynają się od `com.samsung.health…` / `com.samsung.shealth…` (sen, kroki, tętno, stres, HRV).
  2. **Uwaga na format:** pierwsza linia pliku to zwykle metadane, nagłówek kolumn jest w drugiej; nazwy kolumn mają prefiksy. Najpierw obejrzyj prawdziwy plik, potem pisz parser.
  3. Agreguj do `DayRecord` z `source: 'samsung'`.
- **Gotowe gdy:** prawdziwy eksport z Samsunga daje dni ze snem, krokami i tętnem; brakujące pola = `null`, a nie błąd.

#### B4 — Silnik „Decyzja teraz” ⏱ ~3 h
- **Cel:** serce produktu. Rytm sam mówi, co zrobić teraz, z uzasadnieniem z kilku źródeł.
- **Pliki:** `src/lib/decisions/index.js` → `export function decide({ minutes, days, profile, now }) → Decision[]` (najważniejsza pierwsza).
- **Reguły na start** (każda musi mieć co najmniej 2 źródła w `why`):
  1. Zmęczenie z kamery ≥ 45 przez 10 min **+** sen poprzedniej nocy < 6 h → przerwa 10 min, dziś lżejszy trening.
  2. Przy biurku ≥ 55 min **+** postawa spada w ostatnich 20 min → przerwa 5 min z rozciąganiem (BHP: 5 min na godzinę pracy przy monitorze).
  3. HRV ≥ 15% poniżej Twojej średniej z 14 dni **+** zaplanowany trening → zamień trening interwałowy na spacer.
  4. Zła postawa > 2 h dziennie przez 5 dni **+** profil zgłasza ból karku/pleców → specjalista: fizjoterapeuta (`contentId: 'physio'`).
  5. Wysoki PERCLOS / mało mrugania przez kilka dni **+** dużo godzin przy ekranie → okulista (`contentId: 'eye'`).
  6. Niepokojące objawy z profilu (ból w klatce piersiowej, drętwienie ręki, myśli kryzysowe) → `kind: 'red-flag'`, **bez przyczyn**, tylko numery pomocy (`contentId: 'red-flags'`).
- **Gotowe gdy:** na danych przykładowych + prawdziwych minutach z kamery zwraca sensowne decyzje; testy na 6 regułach (wejście → oczekiwana decyzja) przechodzą.
- **Zależności:** B1 (dane), klucze `contentId` uzgodnione z D.

#### B5 — „Co jeśli” ⏱ ~2 h
- **Cel:** odpowiada na pytanie z zadania hackathonu: **lepsze decyzje** na podstawie własnej historii.
- **Pliki:** `src/lib/whatif/index.js` → `export function whatIf(questionId, days) → WhatIf`.
- **Pytania na start:**
  1. Sen < 6 h vs ≥ 7 h → HRV i tętno spoczynkowe następnego dnia.
  2. Trening vs brak treningu → sen tej nocy i stres następnego dnia.
  3. > 8 tys. kroków vs < 4 tys. → długość snu.
  4. Ostatni posiłek późno vs wcześnie (Fitatu) → sen. *(jeśli są dane)*
- **Metoda:** podziel dni na dwie grupy według warunku, porównaj średnią metryki; `effect` = różnica w %, `range` = 25.–75. percentyl, `nDays` = liczba dni w mniejszej grupie. **Jeśli `nDays < 5` → zwróć „za mało danych”** zamiast liczby.
- **Gotowe gdy:** każda odpowiedź ma liczbę dni i zakres; na danych przykładowych wychodzą wbudowane zależności z B1.

#### B6 — (opcjonalnie) AI przeredagowuje decyzję ⏱ ~1,5 h
- **Cel:** zalecenie brzmi jak od człowieka, a nie jak z reguły.
- **Zasady:** do modelu trafiają **tylko liczby i gotowa decyzja**, nigdy obraz ani imię; jeśli brak sieci/klucza → pokazujemy tekst z reguły. Klucz API tylko w `.env` (nie commitować, dopisz do `.env.example`).
- **Rób tylko, jeśli B4 i B5 są gotowe.**

---

### C — Interfejs i wygląd

Odpowiadasz za 20% oceny (Design) i za to, żeby jury z ostatniego rzędu wszystko zrozumiało.
**Nie czekasz na B:** do czasu gotowości importów pracujesz na `src/data/sample.js` (B1).

**Już zrobione:** ✅ ekrany Start (kalibracja), Na żywo, Rytm dnia (wykres + mapa energii), Dane zespołu, okienko przypomnienia z kliknięciem samopoczucia.

#### C1 — Wywiad wstępny ⏱ ~1,5 h
- **Cel:** Rytm wie, kim jesteś, zanim zacznie radzić (Q5 z naszej sesji pytań).
- **Pliki:** `src/screens/Start.jsx` (+ nowy komponent w `src/components/`).
- **Pytania (5, jedno na ekran, klikane, nie pisane):** rodzaj pracy (biuro / zdalnie / student / gry) · sport w tygodniu (0 / 1–2 / 3+) · cel (mniej bólu / więcej energii / lepszy sen / forma) · dolegliwości (kark, plecy, oczy, głowa, brak) · zegarek/telefon (iPhone / Samsung / inny / brak).
- **Zapis:** `db.set('profile:<osoba>', {...})` — B czyta to w `decide()`.
- **Gotowe gdy:** przejście trwa < 40 s, można cofnąć, odpowiedzi widać w profilu.

#### C2 — Widok zespołu na pitch ⏱ ~2,5 h · **najważniejszy ekran pitchu**
- **Cel:** jeden ekran, który otwiera prezentację: „tak wyglądała nasza noc”.
- **Pliki:** `src/screens/Team.jsx` + jedna linijka w `App.jsx`.
- **Zawartość:**
  - wykres 24 h: linia zmęczenia każdej osoby (różne kolory) + średnia zespołu pogrubiona,
  - **najgorszy moment zespołu** zaznaczony na wykresie („04:12 · średnie zmęczenie 68/100”),
  - 4 duże liczby: łącznie godzin przy biurku, minut w złej postawie, liczba przypomnień, ile razy zrobiliśmy przerwę,
  - notatki z osi czasu (C3).
- **Gotowe gdy:** po wczytaniu plików od 4 osób ekran czyta się z 5 metrów (sprawdźcie na projektorze lub dużym monitorze).

#### C3 — Notatki na osi czasu ⏱ ~1 h
- **Cel:** wykres staje się historią („pizza”, „pierwszy działający build”, „kryzys”, „deploy”).
- **Pliki:** komponent w `src/components/`, zapis przez `logEvent(person, 'note', { text })` z `src/lib/db.js` (bez zmian w db.js).
- **Gotowe gdy:** notatkę dodaje się jednym kliknięciem + krótkim tekstem, widać ją na „Rytmie dnia” i w widoku zespołu, przechodzi eksport/import.

#### C4 — Ekran „Decyzja teraz” ⏱ ~2 h
- **Pliki:** `src/screens/Decision.jsx`, dane z `decide()` (B4).
- **Zawartość:** duży tytuł decyzji → jedno konkretne działanie → **uzasadnienie źródło po źródle** z ikoną (kamera / zegarek / telefon / samopoczucie) → kliknięcie samopoczucia. Decyzja `red-flag` wygląda inaczej: tylko numery pomocy, wyraźnie, bez przewijania.
- **Gotowe gdy:** na danych przykładowych widać min. 3 różne decyzje; jury rozumie „dlaczego” bez tłumaczenia.

#### C5 — Ekran „Co jeśli” ⏱ ~1,5 h
- **Pliki:** `src/screens/WhatIf.jsx`, dane z `whatIf()` (B5).
- **Zawartość:** wybór pytania (karty) → wynik dużą liczbą („HRV niższe o 12%”) + **zakres i liczba dni zawsze widoczne** („na podstawie 14 dni, zakres 4–19%”) + etykieta „dane przykładowe”, gdy `source === 'sample'`.
- **Gotowe gdy:** „za mało danych” ma własny, sensowny wygląd; nigdzie nie ma liczby bez podstawy.

#### C6 — Ekran „Raport dla lekarza” ⏱ ~2 h
- **Pliki:** `src/screens/Report.jsx`, treść z `src/content/` (D), PDF przez `window.rytmDesktop.exportPdf()` (A3).
- **Zawartość (1 strona A4):** okres, godziny przy ekranie, minuty w złej postawie, trendy snu/HRV, zgłaszane dolegliwości, „częste przyczyny pasujące do danych” (bez diagnozy), sugerowany specjalista + **ścieżka NFZ** (czy potrzebne skierowanie) + zastrzeżenie, że Rytm nie jest wyrobem medycznym.
- **Gotowe gdy:** `@media print` daje czystą stronę A4; PDF otwiera się i jest czytelny.

#### C7 — Import danych z telefonu ⏱ ~1 h
- **Pliki:** `src/screens/Data.jsx` (nowa sekcja) lub osobny ekran.
- **Zawartość:** dwa przyciski („Apple Health — eksport.xml”, „Samsung Health — pliki CSV”), krótka instrukcja jak zrobić eksport, pasek postępu (z B2), podsumowanie „wczytano 143 dni, od … do …”, przycisk „użyj danych przykładowych”.

#### C8 — Dopracowanie ⏱ cały czas od +16 h
Puste stany na każdym ekranie, ciemny motyw, większe czcionki na projektorze, spójne odstępy, brak przewijania na ekranach demo w 1920×1080.

---

### D — Opieka zdrowotna, pitch i eksperyment

Odpowiadasz za treści, które jury z branży zdrowotnej przeczyta uważnie, i za to, żeby projekt **w ogóle został poprawnie zgłoszony**.

#### D1 — Eksperyment zespołu ⏱ start natychmiast, potem 5 min co 3 h
- **Cel:** prawdziwe dane do otwarcia pitchu („tak wyglądała nasza noc”).
- **Kroki:**
  1. Każdy uruchamia Rytm, daje zgodę (imię lub pseudonim — każdy decyduje sam), kalibruje się.
  2. **Klapy laptopów otwarte** (zamknięcie usypia komputer i przerywa pomiar).
  3. Co ~3 h zbierasz od wszystkich `Dokumenty/Rytm/rytm-latest.json` (Discord / pendrive) do jednego folderu.
  4. Prowadzisz **dziennik momentów** z godziną: pizza, kryzys, pierwszy build, deploy, kto zasnął na chwilę. To potem notatki na wykresie (C3).
  5. Zbierasz eksporty z telefonów: iPhone (Apple Health + Fitatu) i Samsung — przekazujesz B.
- **Gotowe gdy:** o +20 h masz pliki od wszystkich 4 osób i listę momentów.

#### D2 — Treści medyczne i ścieżki NFZ ⏱ ~3 h
- **Pliki:** `src/content/` — zwykłe pliki JS z danymi, bez logiki, np.:
  - `specialists.js` — `{ physio: {...}, eye: {...}, mental: {...}, gp: {...} }`: kto, kiedy iść, **czy na NFZ potrzebne skierowanie**, jak umówić (IKP / rejestracja / teleporada), ile się zwykle czeka.
  - `redFlags.js` — objawy, przy których **nie podajemy przyczyn**, tylko: 112, Telefoniczna Informacja Pacjenta NFZ 800 190 590, telefon zaufania dla dorosłych w kryzysie.
  - `tips.js` — teksty przypomnień i zaleceń (krótko, po ludzku, bez straszenia).
  - `disclaimer.js` — „Rytm nie jest wyrobem medycznym i nie stawia diagnoz…”.
- **Ważne:** **każdą informację o NFZ i każdy numer sprawdź na pacjent.gov.pl / nfz.gov.pl i wpisz źródło w komentarzu.** Np. zweryfikuj, do których specjalistów (okulista, psychiatra, fizjoterapia ambulatoryjna) potrzebne jest skierowanie — zasady się zmieniały.
- **Klucze (`physio`, `eye`, `mental`, `red-flags`…) uzgodnij z B** — B używa ich w `contentId`.
- **Gotowe gdy:** każdy `contentId` z B4 ma treść, każdy fakt ma źródło.

#### D3 — Treść raportu dla lekarza ⏱ ~1 h
- **Cel:** lekarz/fizjoterapeuta w 30 sekund widzi, o co chodzi.
- **Kroki:** spisz, co ma być na 1 stronie i w jakiej kolejności (C to składa w C6). Jeśli znacie kogoś z branży medycznej — zapytajcie, co chciałby zobaczyć.

#### D4 — Pitch i trudne pytania ⏱ ~4 h (rozłożone)
- **Pliki:** `docs/pitch/` (scenariusz, slajdy źródłowe, finalny PDF).
- **Scenariusz 3 min** (uzgodniony): 0:00 wykres naszej nocy → 0:30 problem (rozproszone dane, ból pleców u 31–51% pracowników biurowych) → 0:55 **demo na żywo** (kalibracja → garbienie → decyzja → co jeśli → raport) → 2:10 dlaczego nie ChatGPT Health (kamera widzi Cię przy pracy, działa sama, polski system NFZ, prywatność) → 2:35 model biznesowy (benefit pracowniczy, pracodawca nie widzi danych) i zamknięcie.
- **Slajdy:** max 10, PDF, po polsku lub angielsku (regulamin pozwala na oba).
- **Odpowiedzi na trudne pytania (po 2 zdania):** Czym różnicie się od ChatGPT Health / SitApp? · Co z RODO i danymi biometrycznymi? · Czy to wyrób medyczny (MDR)? · AI Act — rozpoznawanie emocji? · Skąd wiecie, że to zmęczenie? · Kto za to zapłaci?
- **Gotowe gdy:** 2 próby z zegarkiem, obie ≤ 3:00.

#### D5 — Zapasowe nagranie demo ⏱ ~1 h
Nagraj cały przepływ demo (OBS / Xbox Game Bar `Win+G`), gdy działa od początku do końca. Na scenie: jeśli kamera lub sieć zawiodą — puszczasz nagranie bez paniki.

#### D6 — Zgłoszenie na HackTribe ⏱ ~1 h · **najpóźniej 22:00**
Wymagane (regulamin pkt 5): tytuł projektu · nazwa zespołu · lista członków (1–6) · opis projektu · **PDF max 10 slajdów** (zrzuty ekranu, link do repozytorium, link do nagrania). Po polsku lub angielsku. Zostaw godzinę zapasu — po 23:00 zmiany nie są brane pod uwagę.

---

## 3. Kontrakty danych między obszarami

Uzgodnione kształty danych. **Zmiana = najpierw powiadom właścicieli obu stron.**

```js
// B → C, A: jeden dzień z danych telefonu (src/lib/import/* zwraca tablicę takich obiektów)
// Pola, których źródło nie ma, są null — nigdy undefined ani 0 „na zapas”.
DayRecord = {
  date: '2026-10-03',          // dzień lokalny (sen przypisany do dnia, w którym się kończy)
  source: 'apple' | 'samsung' | 'sample',
  sleepMin, sleepStart,        // minuty snu, początek snu (timestamp ms)
  restingHr, hrv,              // tętno spoczynkowe (bpm), HRV (ms)
  steps, workouts,             // kroki, liczba treningów
  kcalIn, weightKg,            // posiłki i waga (Fitatu przez Apple Health)
  stress,                      // Samsung: 0–100
}

// B → C: decyzja do pokazania teraz (src/lib/decisions/)
Decision = {
  id, kind: 'break' | 'posture' | 'training' | 'sleep' | 'specialist' | 'red-flag',
  title,                       // „Zrób teraz 10 minut przerwy”
  why: [{ source: 'camera' | 'watch' | 'phone' | 'mood' | 'profile', text }], // min. 2 źródła
  action,                      // jedno konkretne działanie
  contentId,                   // klucz do treści D w src/content/ (np. 'physio', 'red-flags')
}

// B → C: wynik „co jeśli” (src/lib/whatif/)
WhatIf = {
  questionId, question,        // „Co jeśli śpię < 6 h?”
  metric,                      // 'hrv' | 'restingHr' | 'sleepMin' | 'stress'
  nDays, effect,               // liczba dni (mniejsza grupa), różnica w %
  range: [low, high],          // 25.–75. percentyl
  basis,                       // „14 dni z < 6 h snu vs 31 dni z ≥ 7 h”
  source,                      // 'sample' → interfejs pokazuje „dane przykładowe”
  insufficient,                // true, gdy nDays < 5
}

// A → wszyscy: pomiary z kamery (już istnieją, IndexedDB store 'minutes', zapis co minutę)
// { id, person, t, presence, posture, fatigue, blinks, perclos, yawns, longClosures, badFrac, issues }
// Zdarzenia (store 'events'): { id, person, t, type: 'nudge' | 'mood' | 'calibration' | 'note', ... }

// C → B: profil z wywiadu (C1), kv 'profile:<osoba>'
// { name, consent, work, sportPerWeek, goal, complaints: [...], device }
```

---

## 4. Pliki wspólne — dotykamy ostrożnie

`package.json` + `package-lock.json` · `src/App.jsx` (lista ekranów) · `src/index.css` · `CLAUDE.md` · `docs/PLAN.md` · ten plik.

1. `git pull --rebase origin main` tuż przed zmianą.
2. Minimalna zmiana, **osobny commit**, push od razu.
3. Na czacie: „pushed X, zróbcie rebase”.

Nowy ekran = nowy plik w `src/screens/` (C) + **jedna linijka** w `App.jsx`. Konflikt w `package-lock.json` → weź wersję z `main`, `npm install`, commit (nigdy ręcznie).

---

## 5. Jak pracujemy w gicie (skrót z docs/TEAM.md)

```bash
git switch main && git pull --rebase
git switch -c b/apple-import            # <prefiks obszaru>/<zadanie>
# ... praca, małe commity: "feat: …", "fix: …", "docs: …"
git pull --rebase origin main
git push -u origin HEAD
gh pr create --fill && gh pr merge --squash --delete-branch   # gdy się buduje i działa
```
- `main` **zawsze działa** — z niego robimy demo. Przed scaleniem: `npx vite build` + uruchomienie aplikacji.
- Gałąź żyje max 1–2 h. Po scaleniu odhacz zadanie w tym pliku (`[ ]` → `[x]`).

---

## 6. Harmonogram i punkty kontrolne

| Kiedy | A | B | C | D |
|---|---|---|---|---|
| **Teraz → +3 h** | A1 strojenie na ludziach | **B1 dane przykładowe** | C1 wywiad, C3 notatki | **D1 wszyscy się mierzą**, eksporty z telefonów |
| **+3 → +10 h** | A2, A3 PDF | B2 Apple, B3 Samsung | **C2 widok zespołu**, C7 import | D2 treści NFZ i objawy |
| **+10 → +16 h** | A4 release | B4 decyzje, B5 co jeśli | C4, C5 | D3 raport, D4 szkic slajdów |
| **+16 → +20 h** | A5, poprawki | B6 (opcjonalnie), poprawki | C6 raport, C8 dopracowanie | D4 próba pitchu ×2 |
| **+20 h → 22:00** | **zamrożenie kodu**, finalny `.exe` | tylko poprawki | tylko poprawki | wykres zespołu na slajd, D5 nagranie, **D6 zgłoszenie** |

**Synchronizacja co 2 h** (5 min, na stojąco): co jest w `main` · co blokuje · czy demo działa od początku do końca · co wycinamy.
**Utknąłeś na > 20 min → mówisz od razu.**

**Punkty kontrolne:**
- **+3 h:** wszyscy się mierzą, dane przykładowe w `main`.
- **+10 h:** importy działają na prawdziwych plikach, widok zespołu pokazuje dane 4 osób.
- **+16 h:** całe demo da się przeklikać: Start → Na żywo → Decyzja → Co jeśli → Raport.
- **+20 h:** zamrożenie kodu. Od teraz tylko poprawki błędów.

---

## 7. Zasady, których nie łamiemy

- Obraz z kamery **nigdy** nie opuszcza komputera ani nie jest zapisywany — tylko liczby co minutę.
- Rytm **nie rozpoznaje emocji** (AI Act art. 5) i **nie stawia diagnoz** — mówimy „częste przyczyny pasujące do Twoich danych”.
- Przy niepokojących objawach — **żadnych przyczyn**, tylko numery pomocy.
- Każda liczba w „co jeśli” ma **liczbę dni i zakres**; dane przykładowe są **zawsze oznaczone**.
- Prawdziwe dane zespołu (`%APPDATA%/rytm`, `Dokumenty/Rytm`) — **nigdy nie kasujemy**; testy używają `RYTM_TEST_DIR`.
- Nie commitujemy sekretów (`.env`) ani prywatnych eksportów z telefonów (trzymamy je poza repozytorium).
- `main` zawsze działa.
