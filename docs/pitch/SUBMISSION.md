# Zgłoszenie na HackTribe – SZKIC

> Szkic przygotowany w nocy (04.10) na podstawie kodu z `main` (`8a85256`). **Do przepisania własnymi słowami przed wysłaniem.**
> Wymagane pola (regulamin zadania SPORT & HEALTHCARE, pkt 5): tytuł, nazwa zespołu, członkowie (1–6), opis, PDF maks. 10 slajdów. Język: PL lub EN.
> Każde zdanie poniżej sprawdzone w `src/`. Czego NIE wolno dopisywać, dopóki nie trafi do `main`: raport dla lekarza, karta NFZ, widok zespołu, „najlepsze godziny” (wykres usunięty w #98), „diagnozuje / wykrywa choroby”.

## Pola formularza

| Pole | Wartość |
|---|---|
| Tytuł projektu | **Upright** (nazwa w interfejsie, `productName` w `package.json`, okno i zasobnik). Uwaga: `NA-KONIEC.md` §4 ma jeszcze starą nazwę „Postura” – do poprawienia. |
| Podtytuł (jeśli jest pole) | PL: *Postawa, zmęczenie i przerwy z kamery – w pełni na Twoim komputerze* / EN: *Posture, fatigue and breaks from your webcam – fully on your laptop* |
| Nazwa zespołu | ___ |
| Członkowie | Mateusz Caputa, Kacper Smaga, Marcin Pałys, Bartłomiej ___ |
| Repozytorium | ___ (publiczne? – decyzja; sprawdzić w trybie incognito) |
| Wideo / demo | ___ |
| PDF | ___ (maks. 10 slajdów, konspekt niżej) |

## Opis – PL (ok. 200 słów)

Ludzie pracujący przy komputerze zauważają ból szyi i zmęczone oczy dopiero wtedy, gdy już bolą. Upright to aplikacja na Windows i macOS, która patrzy przez zwykłą kamerę i pomaga zareagować wcześniej.

Po krótkiej, dwuetapowej kalibracji Upright ocenia postawę w skali 0–100 względem Ciebie, a nie „średniego człowieka”. Rozpoznaje m.in. wysuniętą głowę, garbienie, przechył barków i zbyt małą odległość od ekranu, i podaje jedną wskazówkę na teraz. Z mrugania, przymykania oczu (PERCLOS) i ziewania liczy wskaźnik zmęczenia, a pod hasłem „Dlaczego X%?” pokazuje, z czego wynika.

Zamiast samych liczb aplikacja podpowiada decyzje: spokojne przypomnienie dopiero po 30 s złej postawy, przerwy 20-20-20, mikroprzerwy i przerwy ruchowe – wcześniej, gdy rośnie zmęczenie – zawsze z powodem („wynik postawy spada od kwadransa”).

Cztery filary: **ruch** – krótkie ćwiczenia, a przy trzech z nich kamera sama liczy powtórzenia; **zdrowie fizyczne** – postawa i odległość od ekranu; **dobrostan psychiczny** – rytm zmęczenia i energii, która po zaliczonym ćwiczeniu realnie rośnie; **dostęp do opieki zdrowotnej** – kierunek rozwoju: podsumowanie dla lekarza lub fizjoterapeuty i ścieżka NFZ, gdy problem się utrzymuje.

Prywatność: modele MediaPipe działają na urządzeniu, obraz nie jest zapisywany ani wysyłany, w bazie są tylko liczby. Wynik to wskaźnik orientacyjny, nie diagnoza.

## Description – EN (approx. 237 words)

People who work at a computer notice neck pain and tired eyes only once they already hurt. Upright is a Windows and macOS app that watches through an ordinary webcam and helps you react earlier.

After a short two-step calibration, Upright scores your posture from 0 to 100 against you, not against an "average person". It recognises a forward head, slouching, tilted shoulders and sitting too close to the screen, and gives one tip for right now. From blinking, eye closure (PERCLOS) and yawns it computes a fatigue index, and a "Why X%?" panel shows what it is made of.

Instead of bare numbers the app suggests decisions: a calm reminder only after 30 s of poor posture, 20-20-20 eye breaks, micro-breaks and movement breaks – earlier when fatigue rises – always with a reason ("your posture score has been dropping for 15 minutes").

Four pillars: **sport and movement** – short exercises, and for three of them the camera counts your reps; **physical health** – posture and screen distance; **mental wellbeing** – your fatigue and energy rhythm, with energy that visibly recovers after a completed exercise; **access to healthcare** – our next step: a summary for a GP or physiotherapist and a path to public care when a problem persists.

Privacy: MediaPipe models run on the device, frames are never saved or sent, and only numbers are stored. The score is an indicative measure, not a diagnosis.

### Źródła w kodzie (dla sprawdzającego)
- Wynik 0–100 względem kalibracji, 7 problemów: `src/core/scoring.ts`, `src/core/metrics.ts`; kalibracja 2-krokowa: `src/core/calibration.ts`, `src/renderer/calibrator.ts`.
- Zmęczenie (mrugnięcia, PERCLOS, długie mrugnięcia, ziewanie, postawa, czas od przerwy): `src/core/fatigue.ts`; „Dlaczego X%?”: `src/renderer/fatigueWhy.ts`.
- Alert po 30 s, maks. 1 na 5 min: `src/shared/types.ts` (`alertDelaySec: 30`, `alertCooldownMin: 5`).
- Przerwy 20-20-20 / mikro / ruchowe / adaptacyjne + powód: `src/core/breakEngine.ts`, `src/core/coach.ts` (`BREAK_REASON`).
- Liczenie powtórzeń kamerą (cofanie brody, unoszenie barków, boczne rozciąganie szyi): `src/core/exerciseVerify.ts`, `src/renderer/overlays.ts`.
- Energia („Bateria”): `src/core/energy.ts`; widoczna w toaście po ćwiczeniu („Bateria X% → Y%”, `src/renderer/overlays.ts`) i w podpowiedzi mini-widgetu („Energia do pracy X%”, `src/renderer/widget.ts`). Prognoza spadku (`minutesUntilLow`) jest liczona, ale po skróceniu menu zasobnika (#115) **nigdzie nie jest już wyświetlana** – nie obiecywać „prognozy” na slajdach.
- Zasobnik: wynik obok ikony na macOS (`tray.setTitle`), w menu „Postawa: …”, „Zmęczenie: X%”, „Zrób przerwę teraz”, „Wstrzymaj analizę” (`src/main/main.ts`).
- Prywatność: `src/main/db.ts` (tylko liczby), tekst w Ustawieniach → Dane (`src/renderer/views/settings.ts`); modele w paczce: `assets/models/`, `src/main/models.ts`.
- Dostęp do opieki: w aplikacji jest dziś tylko zdanie „Przy bólu lub drętwieniu skonsultuj się z fizjoterapeutą” (`src/renderer/views/exercises.ts`) – dlatego w opisie jest to **kierunek rozwoju**. Jeśli przed terminem wejdzie karta NFZ / raport (NA-KONIEC §3a), przepisać to zdanie.

## Konspekt PDF – 10 slajdów (kolejność wg NA-KONIEC §1)

Zrzuty: `docs/pitch/screenshots/` (README tam opisuje każdy plik). ⏳ = zrzut do zrobienia rano z prawdziwą kamerą.

| # | Slajd (jedna linia) | Zrzut |
|---|---|---|
| 1 | **Upright** – tytuł, jedno zdanie obietnicy („Postawa, zmęczenie i przerwy z kamery – w pełni na Twoim komputerze”), nazwa zespołu, logo | – (logo: `assets/icon.png`) |
| 2 | **Problem**: ból szyi i zmęczone oczy przy pracy przy komputerze – zauważamy je za późno; 1–2 liczby ze źródłami z `research/` | – |
| 3 | **My w trakcie hackathonu** + jak to działa: kamera → MediaPipe na urządzeniu → kalibracja „porównujemy Cię z Tobą” | `calibrate-1000.png` (⏳ lepiej: kalibracja z sylwetką na prawdziwym obrazie) |
| 4 | **Moment „wow”**: kontur powiek zamyka się przy mrugnięciu, szkielet zmienia kolor przy garbieniu, jedna wskazówka na teraz | ⏳ Na żywo z kamerą; zapas: `live-slouch-1000.png` |
| 5 | **Decyzja**: „Przerwa teraz, bo…” → ćwiczenie, kamera liczy powtórzenia → energia rośnie | `break-1000.png` (⏳ lepiej: licznik w trakcie, np. 5/10) |
| 6 | **Na co dzień, bez nękania**: mini-widget, przypomnienie pod widgetem, wynik postawy obok ikony w pasku menu | ⏳ widget + przypomnienie, ⏳ menu zasobnika |
| 7 | **Rytm w czasie**: statystyki postawy i zmęczenia z 7 dni, „Co poprawić” (podpis: dane przykładowe) | `stats-posture-7d-1000.png`, `stats-fatigue-7d-1000.png` |
| 8 | **4 filary + prywatność**: ruch / zdrowie fizyczne / dobrostan (zmęczenie i energia) / dostęp do opieki (kierunek); obraz nie opuszcza komputera, tylko liczby; „wskaźnik orientacyjny, nie diagnoza” | `settings-data-1000.png` (sekcja „Dane”) |
| 9 | **Co dalej – implikacje na przyszłość** (obowiązkowe): ścieżka do specjalisty / NFZ, pracodawcy (BHP), szkoły, telemedycyna i fizjoterapia – punkty z `docs/pitch/IDEAS.md` | – |
| 10 | **Zespół + linki**: 4 osoby i role, repozytorium, wideo, kod QR; jedno zdanie o użyciu AI (`AI_USAGE.md`) | – |

Uwagi:
- Pokazać 3–4 rzeczy dobrze (uwaga mentora), reszta na pytania – lista w `docs/FEATURES.md`.
- Liczby z pomiaru mrugnięć (np. „X/20 wykrytych”) wpisać tylko prawdziwe, po teście z `NA-KONIEC.md` §3.
