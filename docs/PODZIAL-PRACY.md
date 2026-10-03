# Podział pracy — Rytm (4 osoby)

> Jedna osoba = jeden obszar = własne katalogi. Obszary spotykają się tylko na **kontraktach** (sekcja 3).
> Dzięki temu każdy (i jego Claude) pracuje równolegle bez konfliktów w gicie.
> Wpiszcie imiona w tabeli poniżej i ten sam podział w `CLAUDE.md` → *Team & ownership*.

## 1. Kto za co odpowiada

| Obszar | Kto | Jedno zdanie | Katalogi (tylko ta osoba je zmienia) | Prefiks gałęzi |
|---|---|---|---|---|
| **A — Pomiar i aplikacja** | `<imię>` | Kamera mierzy dobrze, aplikacja działa 24 h i nie gubi danych | `src/lib/monitor.js`, `src/lib/metrics.js`, `src/lib/ticker.worker.js`, `src/lib/db.js`, `electron/`, `scripts/`, `public/` | `a/` |
| **B — Dane zdrowotne i decyzje** | `<imię>` | Import z telefonów + logika „co teraz zrobić” i „co jeśli” | `src/lib/import/`, `src/lib/decisions/`, `src/lib/whatif/`, `src/data/` | `b/` |
| **C — Interfejs i wygląd** | `<imię>` | Wszystkie ekrany demo wyglądają świetnie i prowadzą jury krok po kroku | `src/screens/`, `src/components/`, `src/index.css`, `src/App.jsx` | `c/` |
| **D — Opieka zdrowotna, pitch i eksperyment** | `<imię>` | Treści medyczne i NFZ, pomiar zespołu, prezentacja i zgłoszenie | `src/content/`, `docs/pitch/`, `README.md` | `d/` |

**Kapitan demo:** osoba D. Pilnuje czasu, prowadzi synchronizacje co 2 h i ma ostatnie słowo przy cięciu zakresu.

---

## 2. Zadania w każdym obszarze

Kolejność = priorytet. ✅ = już jest w `main`.

### A — Pomiar i aplikacja

Odpowiada za: dokładność pomiaru, stabilność przez 24 h, bezpieczeństwo danych zespołu, paczkę `.exe` / `.dmg`.

- ✅ Kamera + MediaPipe, kalibracja, postawa, mruganie, PERCLOS, ziewanie, zapis co minutę
- ✅ Electron: zasobnik, pomiar w tle, kopia co 10 min do `Dokumenty/Rytm`, blokada usypiania
- [ ] **A1** Strojenie progów na prawdziwych osobach (w tym 2 osoby w okularach): czy mruganie się liczy, czy postawa spada przy garbieniu. Zmiany tylko w `metrics.js`.
- [ ] **A2** Obsługa wielu osób na jednym laptopie bez mieszania danych (przełącznik osoby).
- [ ] **A3** Eksport raportu do PDF przez Electron (`webContents.printToPDF`) — funkcja `exportPdf()` dostępna przez `window.rytmDesktop`; zawartość raportu robi C, treść D.
- [ ] **A4** Release: `Rytm.exe` w zakładce GitHub Releases (zespół pobiera jednym kliknięciem); `.dmg` jeśli ktoś ma Maca.
- [ ] **A5** Wydajność: zużycie CPU przez 24 h (laptop nie może się dusić podczas kodowania).

Gotowe, gdy: każdy z zespołu mierzy się od kilku godzin, kopie powstają, nikt nie zgłasza zawieszeń.

### B — Dane zdrowotne i decyzje

Odpowiada za: zamianę rozproszonych danych w jeden obraz dnia i za to, **co** Rytm radzi (nie jak to wygląda).

- [ ] **B1** Przykładowy zestaw 60 dni (`src/data/sample.js`), wyraźnie oznaczony jako przykładowy — od niego zależą ekrany C, więc **pierwszy**.
- [ ] **B2** Import Apple Health `export.xml` — czytany strumieniowo w workerze (plik ma setki MB). Sen, tętno spoczynkowe, HRV, kroki, treningi, posiłki i waga z Fitatu.
- [ ] **B3** Import Samsung Health (CSV z „Pobierz dane osobiste”): sen, kroki, tętno, stres, HRV.
- [ ] **B4** Silnik decyzji „Decyzja teraz”: reguły łączące kamerę (zmęczenie, postawa, czas przy biurku) z danymi z telefonu (sen, HRV) → obiekt `Decision` (kontrakt niżej). Każda decyzja ma uzasadnienie z co najmniej 2 źródeł.
- [ ] **B5** „Co jeśli”: porównanie podobnych dni z historii (np. „dni po < 6 h snu”) → wynik zawsze z liczbą dni i zakresem. Bez uczenia maszynowego.
- [ ] **B6** (opcjonalnie) Model AI tylko przeredagowuje gotową decyzję na ludzki język; dostaje wyłącznie liczby, nigdy obraz.

Gotowe, gdy: na prawdziwym eksporcie z iPhone'a i z Samsunga pojawiają się sensowne decyzje i „co jeśli” z liczbą dni.

### C — Interfejs i wygląd

Odpowiada za: 20% oceny (Design) i za to, żeby demo było czytelne z ostatniego rzędu sali.

- ✅ Ekrany Start, Na żywo, Rytm dnia, Dane zespołu
- [ ] **C1** Wywiad wstępny na ekranie Start (5 pytań: praca, sport, cele, dolegliwości, zegarek/telefon) — odpowiedzi zapisane jako profil.
- [ ] **C2** **Widok zespołu** na pitch: wszyscy na jednym wykresie 24 h, najgorsza godzina zespołu, kilka dużych liczb na slajd.
- [ ] **C3** Notatki na osi czasu („pizza”, „pierwszy build”, „deploy”) — dodawane jednym kliknięciem, widoczne na wykresie.
- [ ] **C4** Ekran „Decyzja teraz” (dane z B4) z uzasadnieniem źródło po źródle i kliknięciem samopoczucia.
- [ ] **C5** Ekran „Co jeśli” (dane z B5): wybór decyzji → wynik z liczbą dni i zakresem.
- [ ] **C6** Ekran „Raport dla lekarza” (treść od D, PDF przez A3) + widok specjalisty i ścieżki NFZ.
- [ ] **C7** Import plików z telefonu (ekran wyboru pliku + postęp wczytywania), podpięty pod B2/B3.
- [ ] **C8** Dopracowanie: puste stany, ciemny motyw, czytelność na projektorze.

Do czasu gotowości B pracuje na `src/data/sample.js` (B1) — nie czeka.

### D — Opieka zdrowotna, pitch i eksperyment

Odpowiada za: treści, które jury z branży zdrowotnej przeczyta uważnie, oraz za to, żeby projekt w ogóle został poprawnie zgłoszony.

- [ ] **D1** **Eksperyment zespołu (start natychmiast):** każdy uruchamia Rytm, zgody, co kilka godzin zbiera `Dokumenty/Rytm/rytm-latest.json` od wszystkich; notuje ważne momenty (pizza, kryzys, deploy) z godziną.
- [ ] **D2** Treści w `src/content/` (zwykłe pliki JS, bez logiki):
  - teksty zaleceń i przypomnień,
  - **specjaliści i ścieżki NFZ** (kiedy potrzebne skierowanie, a kiedy nie, np. fizjoterapeuta, okulista, psycholog/psychiatra),
  - **niepokojące objawy → 112 / TIP NFZ 800 190 590 / telefon zaufania** (bez podawania przyczyn),
  - zastrzeżenie „Rytm nie jest wyrobem medycznym”.
- [ ] **D3** Treść raportu dla lekarza (co lekarz chce zobaczyć na 1 stronie).
- [ ] **D4** Pitch: PDF max 10 slajdów (`docs/pitch/`), scenariusz 3 min, odpowiedzi na trudne pytania (ChatGPT Health, AI Act, RODO, wyrób medyczny MDR).
- [ ] **D5** Nagranie zapasowego demo (gdyby kamera lub sieć zawiodły na scenie).
- [ ] **D6** Zgłoszenie na HackTribe **do 22:00**: tytuł, nazwa zespołu, członkowie, opis, PDF.

---

## 3. Kontrakty między obszarami

Uzgodnione kształty danych — zmiana = powiadom właścicieli obu stron.

```js
// B → C, A: jeden dzień z danych telefonu (src/lib/import/ zwraca tablicę takich obiektów)
// pola, których źródło nie ma, są null
DayRecord = {
  date: '2026-10-03',        // dzień lokalny
  source: 'apple' | 'samsung' | 'sample',
  sleepMin, sleepStart,      // minuty snu, początek snu (timestamp)
  restingHr, hrv,            // tętno spoczynkowe, HRV (ms)
  steps, workouts,           // kroki, liczba treningów
  kcalIn, weightKg,          // posiłki i waga (Fitatu przez Apple Health)
  stress,                    // Samsung: 0–100
}

// B → C: decyzja do pokazania teraz (src/lib/decisions/)
Decision = {
  id, kind: 'break' | 'posture' | 'training' | 'sleep' | 'specialist' | 'red-flag',
  title,                     // „Zrób teraz 10 minut przerwy”
  why: [{ source: 'camera' | 'watch' | 'phone' | 'mood', text }], // min. 2 źródła
  action,                    // jedno konkretne działanie
  contentId,                 // klucz do tekstów/ścieżki NFZ w src/content/ (D)
}

// B → C: wynik „co jeśli” (src/lib/whatif/)
WhatIf = { question, metric, nDays, effect, range: [low, high], basis }  // zawsze nDays i zakres

// A → wszyscy: pomiary z kamery (już istnieją w IndexedDB, store 'minutes')
// { person, t, posture, fatigue, blinks, perclos, yawns, presence, badFrac, ... }
```

Teksty (D) importujemy po kluczu, np. `import { SPECIALISTS } from '../content/specialists'` — D zmienia treść bez dotykania logiki ani ekranów.

---

## 4. Plików wspólnych dotykamy ostrożnie

`package.json` + `package-lock.json`, `src/App.jsx` (lista ekranów), `src/index.css`, `CLAUDE.md`, `docs/PLAN.md`:
pull tuż przed zmianą → minimalna zmiana → osobny commit → push od razu → napisz na czacie „pushed X, zróbcie rebase”.
Nowy ekran = nowy plik w `src/screens/` (C) + jedna linijka w `App.jsx`.

---

## 5. Harmonogram i punkty kontrolne

| Kiedy | A | B | C | D |
|---|---|---|---|---|
| **Teraz → +3 h** | A1 strojenie na ludziach | **B1 przykładowe dane** | C1 wywiad, C3 notatki | **D1 wszyscy się mierzą**, zbiera eksporty z telefonów |
| **+3 → +10 h** | A2, A3 PDF | B2 Apple, B3 Samsung | C2 widok zespołu, C7 import | D2 treści NFZ i objawy |
| **+10 → +16 h** | A4 release | B4 decyzje, B5 co jeśli | C4, C5 | D3 raport, D4 szkic slajdów |
| **+16 → +20 h** | A5, poprawki | B6 (opcjonalnie), poprawki | C6 raport, C8 dopracowanie | D4 próba pitchu ×2 |
| **+20 h → 22:00** | **zamrożenie kodu**, finalny `.exe` | tylko poprawki | tylko poprawki | wykres zespołu na slajd, D5 nagranie, **D6 zgłoszenie** |

Synchronizacja co 2 h (5 min, na stojąco): co jest w `main`, co blokuje, czy demo nadal działa od początku do końca.
Utknąłeś na > 20 min → mówisz od razu.

---

## 6. Zasady, których nie łamiemy (wszystkie obszary)

- Obraz z kamery nigdy nie opuszcza komputera; zapisujemy tylko liczby.
- Rytm **nie rozpoznaje emocji** (AI Act art. 5) i **nie stawia diagnoz** — „częste przyczyny pasujące do Twoich danych”.
- Każda liczba w „co jeśli” ma liczbę dni i zakres; dane przykładowe są zawsze oznaczone.
- Prawdziwe dane zespołu (`%APPDATA%/rytm`, `Dokumenty/Rytm`) — nigdy nie kasujemy; testy używają `RYTM_TEST_DIR`.
- `main` zawsze działa — z niego robimy demo.
