# Upright

> Wcześniej „Postura” – wewnętrzne identyfikatory (`postura`, katalog danych, `window.postura`) zostały bez zmian, żeby nie gubić danych użytkowników.

Aplikacja desktopowa (Windows i macOS) analizująca postawę siedzącą, zmęczenie i rytm przerw na podstawie obrazu z kamery. Wszystko liczy się lokalnie: obraz nie jest zapisywany ani wysyłany, baza zawiera tylko liczby.

## Co robi

- **Postawa na żywo.** MediaPipe Pose (33 punkty ciała) → kąty i proporcje głowy, szyi i barków → wynik 0–100 względem Twojej kalibracji. Na podglądzie rysuje szkielet tułowia, kontur powiek i tęczówek (widać każde mrugnięcie), linię kręgosłupa oraz przerywane kółko pokazujące, gdzie powinna być głowa.
- **Co poprawić.** Jedna konkretna wskazówka „na teraz” (np. „Cofnij brodę…”) i paski odchyleń dla każdego problemu: głowa wysunięta do przodu, garbienie, przechył głowy, przechył barków, za blisko ekranu, skręt tułowia, długi bezruch.
- **Alerty bez nękania.** Powiadomienie dopiero po 30 s złej postawy, histereza (alert znika, gdy wynik > 75 przez 5 s), najwyżej jedno na 5 min. Chwilowe sięgnięcie po kubek nie wywołuje alertu.
- **Przerwy.** Reguła 20-20-20 co 20 min, mikroprzerwa co 30 min (lub po 3 alertach w 15 min), przerwa ruchowa co 55 min. Przerwa adaptacyjna przy rosnącym zmęczeniu lub spadającym wyniku postawy. Wyjście z kadru > 2 min liczy się jako przerwa.
- **Ćwiczenia.** 8 ćwiczeń (cofanie brody, ściąganie łopatek, krążenia barków, rozciąganie szyi, skręt tułowia, otwarcie klatki, 20-20-20, spacer) losowanych bez powtórzeń, z licznikiem czasu; przy części ćwiczeń kamera liczy powtórzenia.
- **Mrugnięcia i zmęczenie.** MediaPipe Face Landmarker (478 punktów + współczynniki mrugnięcia): częstość mrugnięć, długie mrugnięcia, PERCLOS, ziewanie → wskaźnik zmęczenia 0–100% (orientacyjny, nie diagnoza).
- **Do kogo iść?** Gdy problem z szyją, plecami albo oczami wraca w co najmniej 7 z ostatnich 14 dni, Statystyki pokazują kartę z drogą do specjalisty przez NFZ (Telefoniczna Informacja Pacjenta 800 190 590) i objawami, przy których trzeba działać pilnie. Ta sama karta jest zawsze dostępna pod linkiem „Kiedy iść do specjalisty?”. Upright nie stawia diagnoz.
- **Zasobnik systemowy** z kolorem stanu i wynikiem postawy (na macOS liczba obok ikony w pasku menu, na Windows w ikonie), mini-widget na wierzchu (karta albo mała pigułka), spokojne przypomnienia obok widgetu, podsumowanie dnia, tryb „Nie przeszkadzać”, autostart.
- **Język:** polski i angielski (Ustawienia → Język / Language).

## Uruchomienie

Wymagania: Node.js 22.13 lub nowszy, kamera internetowa.

```bash
npm install
npm start
```

Modele MediaPipe są dołączone do aplikacji (`assets/models/`), więc działa bez internetu; pobieranie zostaje tylko jako zapas. Po uruchomieniu aplikacja prosi o kalibrację prostej postawy. Okno zamyka się do zasobnika – analiza działa dalej. „Zakończ” jest w menu ikony w zasobniku.

### Instalator

```bash
npm run dist:win   # instalator .exe (uruchom na Windows)
npm run dist:mac   # obraz .dmg (uruchom na macOS)
```

Gotowe pliki trafiają do `release/`.

### Podgląd bez kamery

```bash
npm run demo          # syntetyczna sylwetka, która co jakiś czas się garbi
npm run seed-demo     # 12 dni przykładowych danych w ./demo-data
npm run demo:stats    # statystyki na tych danych
```

Dane demo trafiają do osobnego katalogu `demo-data` i nie mieszają się z Twoimi.

## Uprawnienia

- **Kamera** – system zapyta przy pierwszym uruchomieniu.
- **Powiadomienia** – natywne powiadomienia systemu, domyślnie bez dźwięku.

## Jak liczona jest ocena

Kamera stoi zwykle na monitorze, więc widzi Cię z przodu. Pochylenia do przodu nie da się wtedy zmierzyć wprost, dlatego aplikacja mierzy jego skutki względem Twojej kalibracji:

| Metryka | Jak liczona | Próg ostrzeżenia |
| --- | --- | --- |
| Głowa wysunięta / opadanie szyi | pionowa odległość nos–linia barków ÷ szerokość barków | spadek > 15% |
| Garbienie | wysokość linii uszu nad barkami ÷ szerokość barków | spadek > 10% |
| Przechył barków | kąt linii barków | > 5° |
| Za blisko ekranu | rozstaw oczu w pikselach | twarz większa o > 15% |
| Przechył głowy | kąt linii oczu | > 10° |
| Skręt tułowia | szerokość barków ÷ rozstaw oczu | spadek > 15% |
| Długi bezruch | ruch głowy w oknie 5 min | prawie zero przez > 30 min |

Kara dla metryki rośnie od połowy progu do 1,5 progu; wynik = 100 × (1 − ważona suma kar ÷ 0,6), wygładzony ok. 12 s. Wagi: głowa 30%, garbienie 25%, barki 15%, odległość 15%, przechył głowy 10%, skręt 5%. Suwak „Czułość oceny” mnoży wszystkie progi (0,7–1,4).

Wskaźnik zmęczenia = ważona suma składowych 0–1 (PERCLOS 30%, bardzo rzadkie (< 4/min) lub bardzo częste (> 28/min) mruganie 20%, długie mrugnięcia 15%, ziewanie 10%, spadek postawy 15%, czas od przerwy 10%), wygładzona ok. 60 s. Gdy dane z oczu są niewiarygodne (słabe światło, < 12 klatek/s), wskaźnik nie jest pokazywany. Mruganie liczymy z 3 minut, bez chwil, gdy mówisz; mało mrugnięć przy ekranie (ok. 7/min) to zmęczenie oczu, nie senność. Zamknięcia oczu przy głowie pochylonej w dół (klawiatura) i dłuższe niż 3 s nie są liczone. Progi oka są dopasowane do osoby. Szczegóły, źródła i wyniki testu: `docs/BADANIE-OCZU.md`. Wskaźnik orientacyjny, nie diagnoza medyczna.

Wszystkie progi to wartości startowe do strojenia, a wynik jest narzędziem nawykowym, nie diagnozą medyczną.

## Prywatność

- Klatki z kamery są analizowane w pamięci i od razu odrzucane.
- Baza SQLite (`postura.db` w katalogu danych aplikacji) zawiera: wyniki co minutę, zdarzenia (alerty, przerwy), kalibrację i ustawienia.
- „Wstrzymaj” wyłącza kamerę. Gdy kamerę zajmie inna aplikacja (Teams, Zoom), analiza wstrzymuje się sama i wraca, gdy kamera się zwolni.
- „Usuń moje dane” w ustawieniach czyści historię i kalibrację.

## Rozwój

```bash
npm test           # testy rdzenia analizy (metryki, alerty, mrugnięcia, przerwy, statystyki)
npm run typecheck
npm run dev        # przebudowa przy zmianach (okno uruchom osobno: npx electron .)
```

Struktura:

```
src/core/       czysta logika (bez Electrona, w pełni testowana)
  metrics.ts      punkty MediaPipe → metryki postawy
  scoring.ts      wynik 0–100, problemy, histereza alertów, bezruch
  fatigue.ts      EAR, mrugnięcia, PERCLOS, ziewanie, wskaźnik zmęczenia
  breakEngine.ts  przerwy: 20-20-20, mikro, ruchowe, adaptacyjne
  coach.ts        komunikaty, ćwiczenia, porady ergonomiczne
  aggregate.ts    próbki minutowe, trend postawy
  insights.ts     wskaźnik formy, mapa godzin, wpływ snu
src/main/       proces główny: okno, zasobnik, SQLite (node:sqlite), modele
src/renderer/   interfejs i analizator (kamera + MediaPipe)
test/           testy jednostkowe
```

## Znane ograniczenia

- Z kamery z przodu pochylenie głowy jest szacowane pośrednio; najlepiej działa, gdy kamera stoi na środku monitora na wysokości oczu.
- Analiza twarzy działa w tempie kamery (do 30 klatek/s); na baterii aplikacja schodzi do 15 klatek/s.
- Przy zmianie krzesła, biurka lub położenia kamery zrób ponowną kalibrację (aplikacja sama to zaproponuje, gdy wzorzec długo nie pasuje).
