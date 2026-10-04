# Kod sprzed hackathonu vs zbudowany na HackYeah – SZKIC

> **To jest szkic do potwierdzenia przez Kacpra, nie deklaracja.** Zebrany z historii gita (`git log`, `git show --stat`) w nocy 03/04.10.
> Regulamin wymaga oddzielenia gotowego kodu od pracy na hackathonie, a zespół musi umieć to wyjaśnić.
> Miejsca oznaczone **„Kacper: potwierdź / popraw”** zna tylko on.

## 1. Oś czasu z gita (sob. 03.10.2026)
| Godz. | Commit | Kto | Co |
|---|---|---|---|
| 10:57 | `fb82440` | Mateusz | Start repozytorium: CLAUDE.md, zalążek planu, .gitignore. Brak kodu aplikacji. |
| 11:18–11:53 | `851771a`, `a40bd61` | Mateusz | Dokumenty zespołu, wspólne uprawnienia Claude Code. |
| 12:59 | `957cff3` (#1) | Marcin | Prototyp **„Rytm”** (Electron + kamera: postawa/zmęczenie, rytm dnia, dane zespołu). 37 plików, ok. 33 tys. linii dodanych (większość to `package-lock.json`). |
| 13:05 | `60c7748` (#2) | Marcin | Rytm: auto-kopia co 10 min, czuwanie komputera. |
| 13:09–13:17 | `ced7472` (#3), `a885e57` (#5) | Marcin | Podział pracy na 4 osoby, karty zadań. |
| **13:26** | **`345cf6e`** | **Kacper** | **Import „Postury”** jednym dużym commitem: 84 pliki, +6155 / −30233 (usuwa Rytm, wstawia Posturę). Sam `src/` + `test/`: 44 pliki, +4845 / −1526. |
| 13:27 → | `6ec543b`… | wszyscy | Od tego momentu cała praca to PR-y #6–#115 do `main`. |

- Rytm został potem zarchiwizowany: plan w `docs/archive-rytm/`, kod pod tagiem `backup/rytm-marcin` (wskazuje na `a885e57`). Z Rytmu przejęliśmy **pomysły** (np. ścieżka do opieki, „mierzyliśmy samych siebie”), nie kod.
- Zmiana od importu do dziś w `src/` + `test/`: 53 pliki, **+5089 / −1036** (`git diff --stat 345cf6e origin/main -- src test`).

### Kacper: potwierdź / popraw
- [ ] Czy kod z `345cf6e` powstał **przed 03.10, 11:00** (prototyp przyniesiony na hackathon), czy częściowo między 11:00 a 13:26? ~4,8 tys. linii w `src/` w 2,5 h jest mało prawdopodobne bez wcześniejszej pracy – **trzeba to jasno napisać**.
- [ ] Jeśli przed: od kiedy i czy z pomocą AI (Claude Code / inne)?
- [ ] Które pliki były gotowe w całości, a które dopisane w dniu hackathonu?

## 2. Co było w imporcie `345cf6e` (pliki w drzewie tego commita)
- **core:** `metrics.ts` (metryki postawy), `scoring.ts` (wynik 0–100, alerty z histerezą), `fatigue.ts` (EAR, PERCLOS, mrugnięcia, ziewanie, wskaźnik zmęczenia), `breakEngine.ts` (20-20-20, mikro-, ruchowe, adaptacyjne), `coach.ts` (8 ćwiczeń, wskazówki), `insights.ts` + `aggregate.ts` (statystyki, mapa godzin), `oneEuro.ts` (wygładzanie).
- **main:** `main.ts` (zasobnik, okna, powiadomienia), `db.ts` (SQLite), `models.ts` (pobieranie modeli), `activity.ts` (tempo klawiatury/myszy), `garmin.ts` (później usunięty, #86).
- **renderer:** `analyzer.ts`, `app.ts`, `draw.ts` (linia kręgosłupa, kółko głowy), `overlays.ts` (okno przerwy, prosta kalibracja jednym krokiem – 5 s), `figures.ts`, widoki `live / stats / exercises / settings`, `widget.ts`.
- **inne:** `test/core.test.ts`, `scripts/seed-demo.mjs` (tryb demo), ikony w `assets/`, `build.mjs`.

## 3. Zbudowane w trakcie hackathonu (PR-y scalone do `main`)
**Pomiar i precyzja (głównie Kacper)**
- #72 Precyzja postawy: prawdziwe ustawienie głowy z macierzy twarzy (`headPose.ts`), pełny model sylwetki, bramka barków (`shoulderGate.ts`), przechyły względem poziomu
- #73 Kalibracja odporna na złą postawę (dwa kroki, kontrola na żywo, dryf wzorca)
- #74 „Bateria” (jedna liczba energii + prognoza, `energy.ts`), prostszy pierwszy ekran
- Pełnoekranowy kalibrator z sylwetką, poziomicami i startem bez klikania (`be090f7`, `calibrator.ts`, `framing.ts`)
- #86 Spokojny ekran główny, dokładniejsze komunikaty, usunięcie Garmina · #89 panel „na jeden rzut oka” · #96 dopracowanie widoku · #100 zmęczenie w jednej linii, losowe ćwiczenia bez powtórzeń · #106 pauza czyści nakładkę · #103 nowa nazwa **Upright**, logo i ikona · #115 krótsze menu w zasobniku

**Oczy i zmęczenie (Marcin, Mateusz)**
- #77 Brak wyniku zmęczenia przy niepewnych oczach; 2+ min poza biurkiem = przerwa
- #97 Mrugnięcia, PERCLOS, ziewanie mierzone uczciwie + diagnostyka oczu (z testu na żywo) · #102 analiza twarzy 30 kl./s
- #104 „Dlaczego X%?” (rozkład zmęczenia) i oznaczony tryb prezentacji (symulacja, nie trafia do statystyk) · #107 podgląd powiadomień tylko w trybie prezentacji

**Ruch i ćwiczenia (Marcin)**
- #99 **Ćwiczenia liczone kamerą** (cofanie brody, unoszenie barków, przechylanie głowy), realna zmiana Baterii po przerwie, animowane figury (`exerciseVerify.ts`)
- #85 Ludzik postawy ze strzałką korekty (uwaga mentora F3)

**Nakładka, widget, przypomnienia, integracja (Mateusz)**
- #71 Naprawa zamrożonej kamery po zmianie zakładki (`frameGate.ts`)
- #78 Nakładka w stylu MediaPipe: kontur powiek i tęczówek, szkielet · #80 płynne 60 fps (`landmarkFollower.ts`)
- #76 Wynik obok ikony w pasku menu, szybkie menu · #79 dwa style widgetu (karta / pigułka)
- #82 Spokojne przypomnienia przy widgecie (20-20-20 z odliczaniem, przerwa Start/odłóż, wskazówka postawy, `nudge.ts`)
- #87 Modele MediaPipe w paczce – start bez internetu

**Statystyki i ustawienia (Marcin)**
- #81 Całkowity wynik w widgecie/zasobniku · #83 przerwy/alerty na wykresie dnia, normy, 7 dni · #88 ikony menu · #94 minimalne Statystyki (Postawa / Zmęczenie) · #98 bez „Godzin formy” i ustawień godzin pracy / tempa · #101 przywrócone statystyki zmęczenia

**Dokumentacja i badania (Mateusz, Marcin)**
- #6 baza wiedzy (zadanie, regulamin, zwycięzcy poprzednich lat) · #11 zakres, plan, ujawnienie AI · #84 notatki z mentorami · #95 badanie oczu (`BADANIE-OCZU.md`) · #93 pomysły do pitchu · #108–#114 lista „na koniec”

## 4. Propozycja tekstu (NIE edytowałem tych plików – do wklejenia po potwierdzeniu przez Kacpra)

### Do `AI_USAGE.md` → zastępuje punkt „Pre-existing work”
```markdown
## Pre-existing work (before 3 Oct 2026, 11:00)
- **Postura prototype by Kacper Smaga**, imported in one commit `345cf6e` (3 Oct, 13:26).
  It already had: posture metrics and the 0–100 score with alert hysteresis, the first fatigue index
  (EAR, PERCLOS, blinks, yawns), the break engine, 8 exercises, stats/heat map, the Electron shell
  (tray, widget, SQLite, model download) and a demo mode. *[Kacper: confirm what was written before 11:00
  and whether AI tools were used for it.]*
- Marcin Pałys' **Rytm** prototype (commits `957cff3`, `60c7748`, tag `backup/rytm-marcin`) was archived;
  we reused ideas, not code.
- Everything after `345cf6e` was built during HackYeah: PRs #6–#115 (`git log 345cf6e..v1.0-submission`).
```

### Do `README.md` → nowa sekcja
```markdown
## Co było przed hackathonem, a co powstało na HackYeah
- **Przed:** prototyp Postury Kacpra Smagi (commit `345cf6e`): podstawowa analiza postawy i zmęczenia, przerwy, aplikacja Electron.
- **Na HackYeah (03–04.10.2026):** ćwiczenia liczone kamerą, kontur powiek i szkielet na żywo (60 fps),
  kalibracja odporna na złą postawę, dokładne ustawienie głowy, poprawki pomiaru oczu po teście na żywo,
  spokojne przypomnienia przy widgecie, „Dlaczego X%?”, modele offline, nowe Statystyki, marka Upright.
  Pełna lista PR-ów: `docs/pitch/WCZESNIEJSZY-KOD.md`.
- Tag `pre-hackathon-baseline` → `345cf6e` pokazuje stan wyjściowy (`git diff pre-hackathon-baseline v1.0-submission`).
```
Opcjonalnie (decyzja zespołu): `git tag pre-hackathon-baseline 345cf6e && git push origin pre-hackathon-baseline`.
