# Zrzuty ekranu – kandydaci do PDF / wideo

Wygenerowane automatycznie w nocy z 03 na 04.10 (gałąź `mateusz/pitch-materials`, kod z `main` @ `b3aa9a7`; po rebase na `8a85256` zmieniło się tylko menu zasobnika, którego i tak nie ma na tych zrzutach):
`npm run seed-demo` → `npx electron . --demo --data=<kopia demo-data> --view=<widok> --screenshot=<plik>`,
okno 1180 px szerokości (`POSTURA_SHOT_HEIGHT` = 800 lub 1000), ekran Retina → pliki mają 2360 px szerokości.

**Ważne:** tryb demo to syntetyczna sylwetka **bez twarzy i bez obrazu z kamery**. Dlatego na tych zrzutach
nie ma konturu powiek, tęczówek ani prawdziwego wideo, a „Zmęczenie” pokazuje „–” albo 0%. To są zrzuty
interfejsu, nie „moment wow”. Najmocniejsze ujęcia trzeba zrobić rano z prawdziwą kamerą (lista niżej).

## Co jest w tym folderze

| Plik | Co pokazuje | Do którego slajdu |
|---|---|---|
| `live-1000.png` | Widok „Na żywo”: linia kręgosłupa + linia barków, przerywane kółko „gdzie powinna być głowa”, figurka „Siedzisz prosto”, „Przerwa za 20 min” + „Zrób przerwę”, w rogu „Postawa 81/100” | 3 (jak działa) – zapas, jeśli nie będzie zrzutu z kamery |
| `live-slouch-1000.png` | Ten sam widok w chwili garbienia: linia kręgosłupa na żółto z etykietą „Garbienie”, figurka ze strzałką korekty, „Postawa się psuje – Oprzyj plecy i unieś mostek.”, „Postawa 70/100” | 3–4 (problem wykryty → jedna wskazówka) |
| `break-1000.png` | Okno mikroprzerwy: powód („Wynik postawy spada od kwadransa – to typowy znak zmęczenia.”), animowana figurka „Cofanie brody”, kroki, zegar 1:00, licznik „Kamera sprawdza 0/10”, przyciski Start / Zrobione / Odłóż o 5 min | 4–5 (decyzja „przerwa teraz, bo…” + ćwiczenie) |
| `calibrate-1000.png` | Kalibracja: zarys sylwetki, poziomice głowy i barków, lista kontrolna (W kadrze, Głowa prosto, Barki poziomo, Twarz przodem), „Krok 1 z 2” | 3 (personalizacja: porównujemy Cię z Tobą) |
| `exercises-1000.png` | Biblioteka 8 ćwiczeń z figurkami, czasem i „Pomaga przy…”, zdanie „Przy bólu lub drętwieniu skonsultuj się z fizjoterapeutą.” | 5 (ruch) |
| `stats-posture-7d-1000.png` | Statystyki → Postawa, ostatnie 7 dni: 70% dobrej postawy, średni wynik 81, słupki dzienne, „Co poprawić” (głowa wysunięta 46%, garbienie 22%, przechył barków 17%) | 6 (rytm / dane w czasie) |
| `stats-fatigue-7d-1000.png` | Statystyki → Zmęczenie, ostatnie 7 dni: zmęczenie 44%, 108 przerw, 48 h przy biurku, słupki dzienne | 6 |
| `settings-top-800.png` | Ustawienia (góra): kamera, „Skalibruj”, Nie przeszkadzać, powiadomienia, mini-widget, autostart | zapas |
| `settings-data-1000.png` | Ustawienia (dół): „Tryb prezentacji: symulacja zmęczenia” i sekcja „Dane”: „Obraz z kamery nie jest zapisywany ani wysyłany. Baza zawiera tylko liczby…” + „Usuń moje dane” | 8 (prywatność) |

Dane w statystykach to **przykładowe dane z `npm run seed-demo`** (12 dni, bez niedziel), nie nasze pomiary.
Jeśli trafią na slajd, podpisać: „dane przykładowe (tryb demo)”. Dzisiaj jest niedziela, więc słupek „dziś” jest pusty.
Zakres „Ostatnie 7 dni” ustawiono przez `localStorage` w kopii katalogu danych (bez zmian w kodzie).

Usunięte jako słabe/duplikaty: `stats-*` z zakresem „Dziś” (puste – brak danych z niedzieli), wersje 800 px
widoków, które przy 1000 px wyglądają tak samo lub lepiej.

## Do zrobienia rano przez człowieka (prawdziwa kamera)

Ustawić 1920×1080 (lub zrobić zrzut okna na Retinie), czyste tło pulpitu, włączyć „Nie przeszkadzać” w systemie.

1. **Na żywo z nakładką** – prawdziwy obraz z kamery, kontur powiek i tęczówek (zamyka się przy mrugnięciu) + szkielet. Najlepiej 2 ujęcia: siedzę prosto / garbię się (szkielet zmienia kolor, „Postawa się psuje”). To główny „moment wow”.
2. **Ćwiczenie z licznikiem z kamery** – okno przerwy po kliknięciu Start, licznik np. „Kamera sprawdza 5/10” w trakcie cofania brody; potem toast „Ćwiczenie wykonane – kamera to potwierdziła. Bateria X% → Y%.”
3. **Przypomnienie pod widgetem** – mini-widget (karta lub pigułka) i wysuwające się spod niego przypomnienie (20-20-20 z odliczaniem albo mikroprzerwa Start / Za 5 min). Najłatwiej: Ustawienia → włączyć „Tryb prezentacji” → „Podgląd powiadomień” (pojawia się dopiero w trybie prezentacji).
4. **Pasek menu / zasobnik** – liczba wyniku obok kolorowej ikony (macOS) i rozwinięte menu: „Postawa: …”, „Zmęczenie: X%”, „Zrób przerwę teraz”, „Wstrzymaj analizę”, „Mini-widget”.
5. **Kalibracja z sylwetką** – na prawdziwym obrazie: zarys sylwetki nałożony na osobę, lista kontrolna zielona.
6. *(opcjonalnie)* **„Dlaczego X%?”** – rozwinięte wyjaśnienie zmęczenia (6 składowych z wagami i normami), najlepiej w trybie prezentacji (z widocznym oznaczeniem „SYMULACJA”).
