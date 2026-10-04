# NA KONIEC – minimum przed finałową prezentacją

> **To jest najważniejsza lista.** Inne pliki (`docs/PLAN.md`, `docs/POMYSLY.md`, …) to pomysły i zaplecze – ta lista to **must-have**, bez którego nie kończymy.
> Odhaczaj `[x]`, dopisz **kto** i **kiedy**. Ostatnia aktualizacja: niedz. 04.10, ok. 00:30.

## ⏰ Plan poranka (termin zakładamy 11:00 – do potwierdzenia na Discordzie)
| Godzina | Co | Kto |
|---|---|---|
| od pobudki | Discord: termin, jury, kontakt z mentorami (sekcja 0) | ___ |
| do 07:30 | **Przejrzeć i scalić nocne PR-y** (lista niżej) – po każdym `npm test` + szybkie przeklikanie aplikacji | Mateusz |
| 07:00 | **Zamrożenie funkcji** – potem tylko poprawki | wszyscy |
| 07:30–08:00 | 30 min „wytłumacz nam” – każdy umie opowiedzieć każdy moduł (sekcja 2) | wszyscy |
| 07:30–08:30 | Test: tryb prezentacji, podgląd powiadomień, interaktywne ćwiczenie, ziewanie (sekcja 3) | ___ |
| 08:00–09:00 | **Zrzuty z prawdziwej kamery** + **nagranie wideo pitchu** | Mateusz / Bartek |
| 09:00–10:00 | **PDF ≤ 10 slajdów** + tekst zgłoszenia (szkic w `docs/pitch/SUBMISSION.md`) | Bartek (+ wszyscy) |
| 10:00–10:30 | **Zgłoszenie na HackTribe** + tag `v1.0-submission` + zrzut potwierdzenia | ___ |
| 10:30–11:00 | Zapas. Po terminie **żadnych zmian** w repo i zgłoszeniu (regulamin pkt 13) | – |

**Nocne PR-y do przejrzenia rano** – wszystkie zaktualizowane do `main` (po wersji PL/EN Kacpra #121 i ziewaniu #123), bez konfliktów, **żaden nie jest scalony, nikt ich nie testował na żywo**:

| PR | Co | Rekomendacja | Test przed scaleniem |
|---|---|---|---|
| #118 | zrzuty do PDF, szkic zgłoszenia PL/EN + plan slajdów, ujawnienie AI | ✅ scalić | tylko przeczytać (same dokumenty) |
| #122 | ściąga Q&A, wcześniejszy kod (Kacper potwierdza!), szkic 10 slajdów PDF | ✅ scalić | tylko przeczytać |
| #105 | ziewnięcie ≠ mówienie (na bazie zmian Kacpra #123) | ✅ scalić | 3 udawane ziewnięcia z klawiszem D → „Ziewnięcia” +3, bez „MÓWISZ” |
| #116 | 2 błędy (kalibracja, timer), „nie diagnoza”, scenariusz wideo | ✅ scalić | jedna kalibracja + „Dlaczego X%?” pokazuje nowe zdanie (PL i EN) |
| #120 | karta „Do kogo iść?” – filar opieki zdrowotnej | ❓ decyzja zespołu + Marcin | Statystyki w trybie demo → karta, PL i EN |
| #110 | sprzątanie kodu (bez zmian działania) | ⏸️ można pominąć | przeklikać wszystkie ekrany |

Drobny brak na `main` (dla Kacpra): w Statystykach po angielsku słowo „alerty” nie jest przetłumaczone (`stats.ts`, `fig(…, 'alerty', …)`).

## ✅ Zgodność z wymaganiami zadania (Sport & Healthcare) – stan na noc 03/04.10
| Wymaganie (regulamin / opis zadania) | Stan | Co brakuje |
|---|---|---|
| Łączy **sport / ruch** | ✅ | – (ćwiczenia, przerwy, powtórzenia liczone kamerą) |
| Łączy **zdrowie fizyczne** | ✅ | – (postawa, kalibracja, kąt głowy) |
| Łączy **dobrostan psychiczny** | ⚠️ | mamy zmęczenie i energię, nie nastrój – w pitchu jako „rytm zmęczenia i energii” |
| Łączy **dostęp do opieki zdrowotnej** | ❌ | w aplikacji tylko zdanie o fizjoterapeucie; opcjonalny nocny PR z kartą „do kogo iść”; minimum: w pitchu jako „co dalej” |
| **Pomaga podejmować decyzje**, nie tylko mierzy | ✅ | – (przypomnienia, przerwa z powodem, „Dlaczego X%?”, prognoza energii) |
| Zgłoszenie: tytuł, zespół, członkowie, opis (PL/EN) | ❌ | szkic nocą w `docs/pitch/SUBMISSION.md`; uzupełnić nazwę zespołu i nazwisko Bartka |
| **PDF maks. 10 slajdów** | ❌ | do zrobienia rano (szkic układu slajdów w SUBMISSION.md) |
| Wideo / zrzuty / link do repo (opcjonalne, ale w 1. rundzie to „pokazuje” aplikację) | ⚠️ | zrzuty demo nocą; zrzuty z kamery + wideo rano |
| Ujawnienie użycia AI, modeli, danych | ⚠️ | nocny PR uzupełnia `AI_USAGE.md` (modele MediaPipe, licencje) |
| Oddzielenie kodu sprzed hackathonu | ✅ | brak kodu sprzed startu – projekt zaczęty od zera 3.10 o 11:00 (zapisane w `AI_USAGE.md`) |
| Zespół umie wyjaśnić każdy moduł | ⚠️ | 30 min „wytłumacz nam” + `docs/ARCHITECTURE.md` (w PR #110) |
| Prywatność, bez diagnoz i rozpoznawania emocji | ✅ | jedno zdanie „wskaźnik, nie diagnoza” w samej aplikacji |
| Brak zmian po terminie | ⚠️ | potwierdzić termin, tag `v1.0-submission`, potem stop |
| Prawa autorskie | ✅ | zostają przy nas (regulamin zadania pkt 14) |

## 0. Najpierw (rano, zanim cokolwiek innego)
- [ ] **Discord: potwierdzić termin zgłoszenia** – 11:00 czy 23:00 w niedzielę? Zasady są sprzeczne (angielski tekst zadania: 23:00, polski regulamin ogólny §4.3: 11:00). **Do potwierdzenia planujemy na 11:00.** — kto: ___
- [ ] **Discord: kto jest w jury** – regulamin (pkt 15) mówi, że jury zostanie ogłoszone na Discordzie najpóźniej 4.10. Sprawdzić nazwiska i firmy, żeby wiedzieć, do kogo mówimy. — kto: ___
- [ ] **Kontakt z mentorami rano** – czy da się jeszcze z kimś porozmawiać (nawet krótko) i pokazać, co zmieniliśmy po ich feedbacku. — kto: ___

## 1. Prezentacja (forma + treść)
- [ ] **Zrzuty ekranu do PDF – OBOWIĄZKOWE w praktyce.** W 1. rundzie mentorzy NIE uruchamiają aplikacji – Design (20%) oceniają ze zrzutów i wideo. Wybrać 4–6 najlepszych (1920×1080): Na żywo z nakładką (kontur powiek + szkielet), ćwiczenie z licznikiem z kamery, przypomnienie w rogu / widget, statystyki, kalibracja z sylwetką. Kandydaci do wyboru w `docs/pitch/screenshots/` (generowane automatycznie). — kto: ___
- [ ] **Tekst zgłoszenia** (tytuł, nazwa zespołu, członkowie, opis PL/EN) – szkic w `docs/pitch/SUBMISSION.md`, do poprawienia własnymi słowami. — kto: ___
- [ ] **Decyzja: wideo, slajdy czy hybryda.** Wymagane na HackTribe jest **PDF, maks. 10 slajdów**. Wideo jest dodatkiem, ale w 1. rundzie (ocena przez mentorów na platformie) często to ono „opowiada” projekt. Rekomendacja: **PDF (obowiązkowy) + krótkie wideo ≤ 3 min**. — kto: ___
- [ ] **Story na pierwszym miejscu** – w 1. rundzie liczy się historia, nie lista funkcji. Szkielet: problem (ból szyi, zmęczone oczy, ludzie zauważają za późno) → my w trakcie hackathonu → moment „wow” (kontur powiek, szkielet świecący przy problemie) → decyzja („przerwa teraz, bo…”) → ścieżka do specjalisty / NFZ → prywatność → co dalej.
- [ ] **Nie zalać jury funkcjami** (uwaga mentora). Pokazać **3–4 rzeczy dobrze**, resztę zostawić na pytania. Lista funkcji do wyboru: `docs/FEATURES.md`; czego NIE obiecywać: tamże „Known gaps / don't claim yet”.
- [ ] **Pokazać interaktywne ćwiczenie – warto!** Kamera sama liczy powtórzenia (Marcin, #99): **cofanie brody**, **unoszenie barków** i **przechylanie głowy uchem do barku**. To najmocniejszy „żywy” moment: robisz ćwiczenie, licznik rośnie, na końcu Bateria idzie w górę. Przećwiczyć wcześniej to, które działa najpewniej (2–3 próby), i tylko je pokazać. — kto: ___
- [ ] **Sekcja „Co dalej – implikacje na przyszłość”** (obowiązkowo) – gotowe punkty w `docs/pitch/IDEAS.md`.
- [ ] **Uczciwie o pomiarach** – gotowe zdania i liczby w `docs/BADANIE-OCZU.md` („wskaźnik, nie diagnoza”, „porównujemy Cię tylko z Tobą”). Wpisać zmierzony wynik mrugnięć (np. „X/20 wykrytych”) – tylko prawdziwe liczby.
- [ ] **Nagranie wideo pitchu (maks. ok. 3 min)** – dołączane do zgłoszenia jako link (np. YouTube niepubliczny – sprawdzić w trybie incognito). W 1. rundzie to ono „pokazuje” aplikację mentorom. Prawdziwa kamera (kontur powiek!), tryb prezentacji do pokazania zmęczenia, interaktywne ćwiczenie, bez powiadomień systemowych (Focus / Nie przeszkadzać), 1080p, kolejność wg story wyżej. — kto: Mateusz

## 2. Wszyscy muszą znać projekt (nie „wyklepany przez AI”)
Mentorzy mówili wprost, że źle oceniają prace, które wyglądają na zrobione przez AI bez zrozumienia. Regulamin też: **zespół musi umieć wyjaśnić każdą decyzję techniczną**.
- [ ] **Każda osoba umie w 2–3 zdaniach wyjaśnić**: jak liczymy postawę (kalibracja → odchylenia), mruganie i zmęczenie (EAR, PERCLOS, próg dopasowany do osoby), dlaczego wszystko jest lokalnie (MediaPipe na urządzeniu, tylko liczby w bazie), jak działają przypomnienia i przerwy.
- [ ] **30 min wspólnego „wytłumacz nam”** rano (każdy pyta Claude'a o swój i cudzy obszar, potem tłumaczy reszcie własnymi słowami).
- [ ] **`AI_USAGE.md` aktualny** – jakich narzędzi AI użyliśmy, projekt zaczęty od zera na HackYeah, lista tego, co powstało w trakcie. ✅ zrobione (#126)
- [ ] **Przygotowane odpowiedzi na trudne pytania**: „czym się różnicie od Straighty / Rest & Blink?”, „czy to wyrób medyczny?”, „czy działa w okularach / przy innym kolorze skóry?”, „co z RODO / AI Act?” (materiał: `docs/BADANIE-OCZU.md`, `research/BATERIA-vision.md` §7).

## 3. Aplikacja – ostatnie rzeczy
- [ ] **Opcja języka angielskiego w aplikacji** (przełącznik PL/EN w Ustawieniach). Uwaga: dużo tekstów jest rozsianych po kodzie (`src/core/coach.ts`, widoki, zasobnik, przypomnienia) – realnie 2–3 h. Jeśli brakuje czasu: minimum = EN na ekranach pokazywanych w prezentacji/wideo. — kto: ___
- [ ] **Merge PR #105** (ziewnięcie ≠ mówienie) po 2-minutowym teście: 3 udawane ziewnięcia z włączoną diagnostyką (klawisz D) → „Ziewnięcia” +3. — kto: Mateusz
- [ ] **Przetestować „Tryb prezentacji” (NOWE – nikt z nas go jeszcze nie widział)**: Ustawienia → „Tryb prezentacji: symulacja zmęczenia”. Przez ok. 45 s narasta rzadsze mruganie, przymykanie oczu i ziewanie, wynik jest oznaczony „SYMULACJA” i nie trafia do statystyk. Wyłącza się po zamknięciu aplikacji. Sprawdzić, czy wygląda dobrze na scenie i czy da się nim pokazać zmęczenie bez czekania. — kto: ___
- [ ] **Test powiadomień z Ustawień** (nie tylko testowe z zasobnika): Ustawienia → włączyć **„Tryb prezentacji”** → dopiero wtedy pokazuje się **„Podgląd powiadomień”** → kliknąć każde (20-20-20, przerwa, postawa) i sprawdzić, czy wyglądają dobrze i pokazują się pod widgetem / w rogu. Nie jesteśmy pewni, czy wszystkie działają. — kto: ___
- [ ] **(Opcjonalnie) Weryfikacja poprawek mrugania** – działają po testach na żywo; dla pewności i liczby na slajd: diagnostyka (klawisz D) → licznik przed/po 20 mrugnięciach. Jeśli brak czasu – pominąć. — kto: ___
- [ ] **Test mrugnięć dla slajdu**: licznik przed/po 20 mrugnięciach, w okularach i bez (diagnostyka – klawisz D). — kto: Mateusz
- [ ] **Zamrożenie funkcji o 07:00** – po tej godzinie tylko poprawki błędów.
- [ ] **Próba generalna**: świeży start aplikacji bez internetu (modele są w paczce) + pełna ścieżka demo 2× bez błędu.

## 3a. Z audytu kodu (`docs/CLEANUP.md`, sekcja B) – braki względem wymagań zadania
- [ ] **❌ Filar „dostęp do opieki zdrowotnej” – największa dziura** (kryterium „Relation to category”, 20%). W aplikacji jest tylko jedno zdanie „skonsultuj się z fizjoterapeutą”. **Minimum:** karta NFZ (lekarz rodzinny / fizjoterapeuta / okulista, TIP NFZ 800 190 590, niepokojące objawy → 112) + prosty wydruk podsumowania z 14 dni, pokazywane, gdy problem się utrzymuje. — kto: Marcin (+ Kacper do wykrycia wzorca)
- [ ] **⚠️ Dobrostan psychiczny** – mamy zmęczenie i energię, ale nie „nastrój”. „Najlepsze godziny” są liczone, ale już nie pokazywane. Ująć w pitchu jako „rytm zmęczenia i energii” albo przywrócić „najlepsze godziny”. — kto: ___
- [x] **Kod sprzed hackathonu** – brak; projekt zaczęty od zera 3.10 o 11:00, zapisane w `AI_USAGE.md` (#126).
- [ ] **⚠️ Ujawnienie AI w `AI_USAGE.md`** – dopisać modele MediaPipe (face_landmarker, pose_landmarker_full + lite, linki do kart modeli, licencja Apache 2.0), ikony (sprawdzić licencję), „bez zewnętrznych zbiorów danych”; usunąć wzmiankę o Claude API, bo asystent AI nie powstał. — kto: ___
- [ ] **⚠️ „Wskaźnik, nie diagnoza” w samej aplikacji** – jedno zdanie np. w opisie zmęczenia albo w ustawieniach prywatności. — kto: Mateusz
- [ ] **⚠️ Nazwa w systemowym pytaniu o kamerę** (`package.json` → `NSCameraUsageDescription`) wciąż mówi „Postura”, a interfejs już nowa nazwa – jury zobaczy to przy pierwszym uruchomieniu na Macu. — kto: Mateusz
- [ ] *(Opcjonalne – regulamin tego NIE wymaga)* Instalator `.dmg`/`.exe`: tylko jeśli chcemy dać jury link do pobrania. Mentorzy oceniają opis + PDF, a pitch idzie z naszego laptopa. — kto: ___
- [ ] **Błędy do poprawy (zgłoszone w audycie):** pętla kalibratora bez zabezpieczenia przed wyjątkiem (jeden błąd = zamrożona kalibracja), timer podsumowania dnia bez try/catch. — kto: Kacper / Mateusz
- [ ] **Sprzątanie kodu** – bezpieczne poprawki (S1–S10) jako szkic PR na gałęzi `mateusz/cleanup`: przetestować aplikację na tej gałęzi i zatwierdzić jednym ruchem.

## 4. Zgłoszenie na HackTribe (wymagane przez regulamin)
- [ ] Tytuł projektu: **Upright** (tak nazywa się aplikacja w interfejsie; wewnętrznie kod nadal używa „postura”)
- [ ] Nazwa zespołu: ___
- [ ] Lista członków (1–6): Mateusz, Kacper, Marcin, Bartłomiej
- [ ] Opis projektu (PL albo EN)
- [ ] **PDF prezentacji, maks. 10 slajdów** (mogą być zrzuty, link do repozytorium, link do demo/wideo)
- [ ] Link do repozytorium (publiczne? – zdecydować) i do wideo (sprawdzić w trybie incognito)
- [ ] **Tag `v1.0-submission`** na wersji, którą zgłaszamy (po terminie zmian nie wolno wprowadzać)
- [ ] Zgłoszone **z zapasem** (min. 30 min przed terminem) + zrzut ekranu potwierdzenia na czacie
