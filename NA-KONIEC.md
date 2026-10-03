# NA KONIEC – minimum przed finałową prezentacją

> **To jest najważniejsza lista.** Inne pliki (`docs/PLAN.md`, `docs/POMYSLY.md`, …) to pomysły i zaplecze – ta lista to **must-have**, bez którego nie kończymy.
> Odhaczaj `[x]`, dopisz **kto** i **kiedy**. Ostatnia aktualizacja: niedz. 04.10, ok. 00:30.

## 0. Najpierw (rano, zanim cokolwiek innego)
- [ ] **Discord: potwierdzić termin zgłoszenia** – 11:00 czy 23:00 w niedzielę? Zasady są sprzeczne (angielski tekst zadania: 23:00, polski regulamin ogólny §4.3: 11:00). **Do potwierdzenia planujemy na 11:00.** — kto: ___
- [ ] **Discord: kto jest w jury** – regulamin (pkt 15) mówi, że jury zostanie ogłoszone na Discordzie najpóźniej 4.10. Sprawdzić nazwiska i firmy, żeby wiedzieć, do kogo mówimy. — kto: ___
- [ ] **Kontakt z mentorami rano** – czy da się jeszcze z kimś porozmawiać (nawet krótko) i pokazać, co zmieniliśmy po ich feedbacku. — kto: ___

## 1. Prezentacja (forma + treść)
- [ ] **Decyzja: wideo, slajdy czy hybryda.** Wymagane na HackTribe jest **PDF, maks. 10 slajdów**. Wideo jest dodatkiem, ale w 1. rundzie (ocena przez mentorów na platformie) często to ono „opowiada” projekt. Rekomendacja: **PDF (obowiązkowy) + krótkie wideo ≤ 3 min**. — kto: ___
- [ ] **Story na pierwszym miejscu** – w 1. rundzie liczy się historia, nie lista funkcji. Szkielet: problem (ból szyi, zmęczone oczy, ludzie zauważają za późno) → my w trakcie hackathonu → moment „wow” (kontur powiek, szkielet świecący przy problemie) → decyzja („przerwa teraz, bo…”) → ścieżka do specjalisty / NFZ → prywatność → co dalej.
- [ ] **Nie zalać jury funkcjami** (uwaga mentora). Pokazać **3–4 rzeczy dobrze**, resztę zostawić na pytania. Lista funkcji do wyboru: `docs/FEATURES.md`; czego NIE obiecywać: tamże „Known gaps / don't claim yet”.
- [ ] **Sekcja „Co dalej – implikacje na przyszłość”** (obowiązkowo) – gotowe punkty w `docs/pitch/IDEAS.md`.
- [ ] **Uczciwie o pomiarach** – gotowe zdania i liczby w `docs/BADANIE-OCZU.md` („wskaźnik, nie diagnoza”, „porównujemy Cię tylko z Tobą”). Wpisać zmierzony wynik mrugnięć (np. „X/20 wykrytych”) – tylko prawdziwe liczby.
- [ ] **Nagranie wideo** (jeśli robimy): tryb demo + czyste konto, bez powiadomień systemowych (Focus/Nie przeszkadzać), 1080p, plan z sekcji wyżej. — kto: ___

## 2. Wszyscy muszą znać projekt (nie „wyklepany przez AI”)
Mentorzy mówili wprost, że źle oceniają prace, które wyglądają na zrobione przez AI bez zrozumienia. Regulamin też: **zespół musi umieć wyjaśnić każdą decyzję techniczną**.
- [ ] **Każda osoba umie w 2–3 zdaniach wyjaśnić**: jak liczymy postawę (kalibracja → odchylenia), mruganie i zmęczenie (EAR, PERCLOS, próg dopasowany do osoby), dlaczego wszystko jest lokalnie (MediaPipe na urządzeniu, tylko liczby w bazie), jak działają przypomnienia i przerwy.
- [ ] **30 min wspólnego „wytłumacz nam”** rano (każdy pyta Claude'a o swój i cudzy obszar, potem tłumaczy reszcie własnymi słowami).
- [ ] **`AI_USAGE.md` aktualny** – jakich narzędzi AI użyliśmy, co było przed hackathonem (prototyp Kacpra), co powstało w trakcie.
- [ ] **Przygotowane odpowiedzi na trudne pytania**: „czym się różnicie od Straighty / Rest & Blink?”, „czy to wyrób medyczny?”, „czy działa w okularach / przy innym kolorze skóry?”, „co z RODO / AI Act?” (materiał: `docs/BADANIE-OCZU.md`, `research/BATERIA-vision.md` §7).

## 3. Aplikacja – ostatnie rzeczy
- [ ] **Opcja języka angielskiego w aplikacji** (przełącznik PL/EN w Ustawieniach). Uwaga: dużo tekstów jest rozsianych po kodzie (`src/core/coach.ts`, widoki, zasobnik, przypomnienia) – realnie 2–3 h. Jeśli brakuje czasu: minimum = EN na ekranach pokazywanych w prezentacji/wideo. — kto: ___
- [ ] **Merge PR #105** (ziewnięcie ≠ mówienie) po 2-minutowym teście: 3 udawane ziewnięcia z włączoną diagnostyką (klawisz D) → „Ziewnięcia” +3. — kto: Mateusz
- [ ] **Test mrugnięć dla slajdu**: licznik przed/po 20 mrugnięciach, w okularach i bez (diagnostyka – klawisz D). — kto: Mateusz
- [ ] **Sprzątanie kodu** (opcjonalnie, tylko jeśli zdążymy przed zamrożeniem): jedna gałąź `mateusz/cleanup`, testy, jedno zatwierdzenie – prompt w historii rozmowy / u Mateusza.
- [ ] **Zamrożenie funkcji o 07:00** – po tej godzinie tylko poprawki błędów.
- [ ] **Próba generalna**: świeży start aplikacji bez internetu (modele są w paczce) + pełna ścieżka demo 2× bez błędu.

## 4. Zgłoszenie na HackTribe (wymagane przez regulamin)
- [ ] Tytuł projektu: **Postura**
- [ ] Nazwa zespołu: ___
- [ ] Lista członków (1–6): Mateusz, Kacper, Marcin, Bartłomiej
- [ ] Opis projektu (PL albo EN)
- [ ] **PDF prezentacji, maks. 10 slajdów** (mogą być zrzuty, link do repozytorium, link do demo/wideo)
- [ ] Link do repozytorium (publiczne? – zdecydować) i do wideo (sprawdzić w trybie incognito)
- [ ] **Tag `v1.0-submission`** na wersji, którą zgłaszamy (po terminie zmian nie wolno wprowadzać)
- [ ] Zgłoszone **z zapasem** (min. 30 min przed terminem) + zrzut ekranu potwierdzenia na czacie
