# Badanie: czy mrugnięcia, zmęczenie i ziewanie działają poprawnie?

> Sob. 03.10, ok. 21:30. Źródła: przegląd literatury + przegląd kodu (`src/core/fatigue.ts`, `analyzer.ts`, karty modeli MediaPipe).
> Wnioski z kodu i literatury. **Testów na ludziach jeszcze nie było** – protokół niżej.

## TL;DR
- **Postawa** jest naszym solidnym rdzeniem: wszystko liczone względem osobistej kalibracji.
- **Wskaźnik zmęczenia** ma sensowną konstrukcję, ale progi mierzą głównie **co robisz** (czytasz, mówisz, patrzysz na klawiaturę), a nie **czy jesteś zmęczony**. Stąd „losowe” liczby.
- Poprawki w kodzie to ok. 3–4 h (obszar Kacpra), potem 45 min testu. Dopiero wtedy cytujemy liczby.
- **Inne pochodzenie / kształt oczu:** mały problem dla wygranej. Jedna realna przyczyna w kodzie (surowy wynik `eyeBlink`) – do poprawienia. W pitchu: jedno zdanie + odpowiedź na pytanie jury.

## Jak dziś liczymy zmęczenie (`fatigue.ts`)
Średnia ważona 6 składowych (0 = OK, 1 = źle), wygładzona ok. 60 s; brak danych z oczu → brak wyniku.

| Składowa | Waga | Kiedy „źle” |
|---|---|---|
| PERCLOS (udział czasu z zamkniętymi oczami, 60 s) | 30% | od 5% → max przy 20% |
| Mrugnięcia na minutę | 20% | < 10/min albo > 25/min |
| Długie mrugnięcia (0,4–3 s) | 15% | max przy 3/min |
| Ziewnięcia + skinienia głową (10 min) | 10% | max przy 3 zdarzeniach |
| Postawa (15 min) | 15% | poniżej 80 pkt |
| Czas od przerwy | 10% | od 20 min |

## Co mówi nauka
- **PERCLOS** – najlepiej zbadany wskaźnik senności z kamery (Dinges 1998; przegląd *Sleep Advances* 2023), ale badany głównie na kierowcach i niewyspanych.
- **Długie / wolne mrugnięcia** – lepszy sygnał senności niż liczba mrugnięć (Schleicher 2008).
- **Liczba mrugnięć zależy od czynności:** ok. 17/min w spoczynku, **26/min przy mówieniu**, 4,5/min przy czytaniu (Bentivoglio 1997); **praca przy ekranie: ok. 7/min zamiast 22** (Tsubota, NEJM 1993). Mało mrugnięć przy ekranie to **zmęczenie oczu / suche oko**, nie senność.
- **Ziewanie** – słaby, rzadki sygnał, tylko pomocniczy (Zilli 2008).
- **Stały próg otwarcia oka (EAR) zawodzi u różnych osób** – osobisty próg naprawia większość (PeerJ CS 2022).

## Co jest nie tak w naszym kodzie (od najważniejszego)
1. **Spojrzenie na klawiaturę = „zamknięte oczy”.** Bierzemy `max(EAR, eyeBlink z MediaPipe)`, a surowy `eyeBlink` u części osób ma 0,3–0,7 **przy otwartych oczach**. To psuje osobisty próg EAR i zawyża PERCLOS i długie mrugnięcia. To też **główne źródło uprzedzenia względem kształtu oczu** (powieki opadające, wąskie oczy, okulary).
2. **„Skinienia głową” to prawie zawsze zerknięcia na klawiaturę/telefon** (nos opada < 75% i wraca w 0,3–2,5 s, próbkowane 8×/s). 3 zerknięcia w 10 min = maksimum składowej.
3. **Skupiona praca = „zmęczony”**: 7/min przy ekranie to norma, a próg to < 10/min.
4. **Mówienie = „zmęczony”**: ok. 26/min przy rozmowie (też w trakcie pitchu!), a próg to > 25/min.
5. **Szybkie mrugnięcia są gubione**: `BLINK_MIN = 0,05 s`, a przy 25 kl./s mrugnięcie widziane w jednej klatce trwa 0,04 s.
6. **Okno 60 s** na liczbę mrugnięć – za krótkie i za głośne; literatura: 1–5 min + osobista norma.
7. **Okulary**: odblask psuje punkty powiek (u Mateusza widzieliśmy 0 mrugnięć/min), a twarz jest wykrywana, więc bramka „dane niepewne” tego nie łapie.
8. **Postawa i czas od przerwy liczone podwójnie** (w zmęczeniu i drugi raz w Baterii).

## Poprawki (obszar Kacpra, `src/core/fatigue.ts` + `analyzer.ts`)
| # | Zmiana | Czas | Efekt |
|---|---|---|---|
| 1 | Głowa pochylona w dół (pitch z macierzy twarzy) → **nie liczymy** zamknięć, PERCLOS ani długich mrugnięć | 1 h | koniec fałszywego zmęczenia przy pisaniu; bezpieczne demo przy notatkach |
| 2 | **`eyeBlink` względem osobistej normy** (krocząca p10 przy otwartych oczach / zapis przy kalibracji) przed `max()` | 0,75–1,5 h | główna poprawka sprawiedliwości (kształt oczu) i pomoc przy okularach |
| 3 | `BLINK_MIN` 0,05 → 0,02 | 0,2 h | szybkie mrugnięcia przestają ginąć |
| 4 | Skinienia **poza wynikiem** (`yawn = clamp01(yawns10m/2)`) | 0,3 h | zerknięcia przestają zawyżać |
| 5 | Mrugnięcia z **3 min**; **mało mrugnięć = zmęczenie oczu → przerwa 20-20-20**, nie senność; dużo tylko względem własnej normy i nie przy mówieniu | 1 h | koniec „skupiony = zmęczony” |
| 6 | Wykrywanie mówienia (zmienność `jawOpen`) → pomijamy te odcinki | 0,75 h | rozmowy/pitch nie zawyżają |
| 7 | Okulary: duży „szum” EAR / brak dwóch wyraźnych poziomów → oczy niepewne + komunikat zamiast 0/min | 2 h | uczciwy wynik dla okularników (MP6) |
| 8 | Za ciemno → komunikat „Zapal lampę przed sobą” zamiast cichego braku wyniku | 0,5 h | pomaga też przy ciemniejszej karnacji w słabym świetle |
| 9 | Zmęczenie tylko z oczu/twarzy; postawę i czas dodaje wyłącznie Bateria | 0,5 h | czystsza historia, bez podwójnego liczenia |
| 10 | Nazwa w aplikacji: „Zmęczenie oczu (szacunek)”, „rozgrzewka ok. 3 min” na starcie | 0,5 h | uczciwość wobec jury |

## Inne pochodzenie, karnacja, rysy twarzy
- **Face Mesh v2 (model twarzy):** różnica błędu między karnacjami ok. 2,5–2,9%, najgorzej wypada **najjaśniejsza** karnacja; między 17 regionami świata 1,2%; płeć 0,01% – w granicach progu Google ([karta modelu](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf)).
- **BlazePose full (model sylwetki):** większa różnica – 85,9–92,9% poprawnych punktów między karnacjami ([karta](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf)). U nas łagodzi to kalibracja względem siebie.
- **Model `blendshapes` (eyeBlink, jawOpen):** testowany tylko na karnacji i płci, przeznaczony do AR, „nie do decyzji krytycznych” ([karta](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf)) – dlatego poprawka #2.
- **Realne ryzyko przy ciemniejszej karnacji:** niedoświetlenie przez kamerę w słabym świetle – poprawka #8.
- **Hidżab, długie włosy, słuchawki na uszach:** postawa przechodzi na wysokość oczu, gdy nie widać uszu; jeśli źródło zmieni się w trakcie, możliwy fałszywy alert „garbienie” (zapamiętać źródło przy kalibracji, 0,75 h).
- **Werdykt:** mały problem dla wygranej. Jedno zdanie na slajdzie + przygotowana odpowiedź. Prawdziwe ryzyka dla wszystkich (i dla demo): **okulary, światło, surowy `eyeBlink`**.

## Protokół testu (ok. 45 min, 2–3 osoby, w tym okularnik)
Telefon w trybie slow-motion obok kamery = „prawda”; liczymy klatka po klatce.
- **A. Mrugnięcia:** 3 × 60 s: patrzenie na ekran, czytanie artykułu, mówienie. Porównaj z liczbą w aplikacji (Szczegóły pomiaru). Oczekiwany wzór: ok. 15–20 / ok. 5 / ok. 25 na minutę. Cel: błąd ≤ 10–15%.
- **B. Patrzenie w dół:** 60 s pisania z zerknięciem na klawiaturę co ok. 5 s + 30 s czytania telefonu. Cel: 0 długich mrugnięć, 0 skinień, PERCLOS < 5%.
- **C. Ziewanie:** 5 ziewnięć (mogą być udawane), 5 głośnych śmiechów, 60 s mówienia, 3 łyki z butelki. Cel: 5/5 wykrytych, 0 fałszywych.
- **D. Senność udawana:** 60 s wolnych, ciężkich mrugnięć z przymkniętymi oczami vs 60 s czujności. PERCLOS > 15%, poziom „zmęczony”.
- **E.** Powtórz A w słabym świetle i w okularach.
Wyniki: jedna tabela → slajd + README. **Najpierw test (stan „przed”), potem poprawki, potem test (stan „po”).**

## Co mówić jury (gotowe zdania)
> „Postawa to nasz zmierzony rdzeń. Zmęczenie to **wskaźnik, nie diagnoza**. Używamy miar z najmocniejszymi badaniami – PERCLOS i długie mrugnięcia – i porównujemy Cię **tylko z Tobą**, nie ze »średnią twarzą«. Wiemy, że czytanie przy ekranie zmniejsza mruganie z ok. 22 do 7 na minutę (NEJM 1993), więc małą liczbę mrugnięć pokazujemy jako **zmęczenie oczu i powód do przerwy 20-20-20**. Gdy patrzysz na klawiaturę albo kamera nie widzi Cię dobrze, **nie pokazujemy liczby zamiast zgadywać**. Model twarzy Google był testowany w 17 regionach świata i 5 grupach karnacji.”
> Po teście dopisać: „Sprawdziliśmy liczenie mrugnięć z nagraniem slow-motion: **X% zgodności w N próbach**.” – tylko zmierzone liczby.

**Nie mówić:** że wskaźnik jest klinicznie zweryfikowany; że działa jednakowo u wszystkich; nic o dokładności ziewania; „wykrywa wypalenie”.
