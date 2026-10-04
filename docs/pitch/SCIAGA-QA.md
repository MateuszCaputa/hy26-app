# Ściąga: umiemy wyjaśnić każdy moduł

> Do przeczytania w 10 minut przed pitchem. Wszystko sprawdzone w kodzie na `main` (04.10, ok. 02:00).
> Właściciel modułu = kto go pisał/zmieniał najwięcej (`git log --format='%an' -- <plik>`). Uwaga: „kacper.smaga” = pierwszy import Postury (`345cf6e`), więc przy wielu plikach oznacza „było w prototypie Kacpra”.
> Zasada przy pytaniach: **mówimy tylko to, co jest w kodzie i co zmierzyliśmy.** Jak nie wiemy – „nie mierzyliśmy tego, to następny krok”.

## Jak to działa w jednym akapicie
Kamera → **MediaPipe** (na laptopie, GPU, w razie problemu CPU) daje 33 punkty sylwetki (~8×/s) i 478 punktów twarzy (każda klatka, do 30/s) → z punktów liczymy **liczby** (proporcje szyi, kąty, otwarcie oka) → porównujemy je z **Twoją kalibracją** → wynik postawy, wskaźnik zmęczenia, decyzja o przerwie → do bazy SQLite trafiają **tylko liczby z każdej minuty**. Obraz nigdy nie jest zapisywany ani wysyłany.

---

## src/core – pomiar i logika (czysty TypeScript, bez Electrona, z testami)

### metrics.ts – metryki postawy · Kacper
- Zamienia punkty z jednej klatki na kilka liczb: „długość szyi” (nos–barki) i „wysokość uszu” względem szerokości barków, przechył barków i głowy, rozstaw oczu (odległość od ekranu), skręt tułowia.
- **Idea:** `neckRatio = odległość(nos, środek barków) / szerokość barków` – dzielimy przez szerokość barków, więc wynik nie zależy od tego, jak daleko siedzisz.
- **Decyzja:** nos i oczy bierzemy z siatki twarzy (478 punktów), nie z modelu sylwetki – są dokładniejsze; rozstaw oczu korygujemy o obrót głowy (`/cos(yaw)`), żeby spojrzenie na drugi monitor nie udawało „odsunięcia się”.

### headPose.ts – ustawienie głowy · Kacper
- MediaPipe zwraca macierz 4×4 przenoszącą model twarzy do układu kamery; wyciągamy z niej pochylenie, obrót i przechył głowy w stopniach.
- **Idea:** kąty z dwóch wektorów twarzy („przód” = 3. kolumna, „góra” = 2. kolumna), np. `pitch = atan2(−fy, √(fx²+fz²))`.
- **Decyzja:** wektory zamiast rozkładu Eulera – wynik nie zależy od kolejności obrotów i nie ma „gimbal lock” w praktycznym zakresie.

### shoulderGate.ts – bramka barków · Kacper
- Odrzuca klatki, w których model „zgaduje” barki (zasłania je krzesło, bluza, ręka) i przez max 2 s trzyma ostatnie dobre.
- **Idea:** klatka zła, gdy widoczność < 0,65 albo szerokość barków (względem rozstawu oczu) skacze > 18% od mediany z 3 s, albo linia barków przekrzywia się > 10°.
- **Decyzja:** jeśli „nowe” barki są stabilne 1,5 s, uznajemy to za prawdziwą zmianę pozycji – bramka nie może zablokować się na zawsze.

### scoring.ts – wynik postawy 0–100 i alerty · Kacper
- 8 problemów (głowa do przodu / do tyłu, garbienie, uniesione barki, przechył barków, za blisko, przechył głowy, skręt) liczonych jako odchylenie od kalibracji; z wag powstaje wynik 0–100.
- **Idea:** kara problemu = `clamp((odchylenie − 0,5·próg) / próg)`, wynik = `100·(1 − Σ waga·kara / 0,6)`; ≥ 80 dobrze, 60–79 uwaga, < 60 źle.
- **Decyzja – histereza:** alert dopiero po 30 s złej postawy (domyślnie), wynik wygładzony (~12 s), „wyłączenie” alertu dopiero po 5 s powyżej 75, max 1 alert na 5 min. Sięgnięcie po kubek nie wywoła powiadomienia. Przechyły oceniamy względem **poziomu**, nie kalibracji (krzywa kalibracja nie może stać się normą).

### calibration.ts – osobista kalibracja · Kacper
- Dwa kroki: „najprościej jak umiesz” i „tak jak zwykle siedzisz”. Różnica to Twój osobisty zakres.
- **Idea:** próg ostrzeżenia = `40% drogi od prostej do zwykłej pozycji`, w granicach 8–20%.
- **Decyzja:** zanim zapamiętamy „prostą” pozycję, sprawdzamy rzeczy z prawdą bezwzględną (głowa nie opuszczona > 12°, barki poziomo ±5°, twarz przodem). Jeśli w ciągu dnia siedzisz wyraźnie prościej niż przy kalibracji, aplikacja sama proponuje nową.

### framing.ts – kadr przed kalibracją · Kacper
- Jedna wskazówka naraz: „Odsuń się”, „Barki muszą być w kadrze”, „Za ciemno”, „Kamera patrzy od dołu”.
- **Idea:** progi na rozstaw oczu względem szerokości obrazu (6–16%), położenie twarzy (±15% od środka), jasność obrazu (min. 55/255).
- **Decyzja:** „lewo/prawo” liczone z perspektywy użytkownika (uwzględnia lustrzany podgląd).

### fatigue.ts – oczy i wskaźnik zmęczenia · Marcin (+ poprawki Mateusza z testu na żywo, PR #97)
- Z punktów powiek liczy mrugnięcia, PERCLOS, długie mrugnięcia i ziewnięcia; z nich (oraz postawy z 15 min i czasu od przerwy) wskaźnik zmęczenia 0–100%.
- **Idea – EAR:** `EAR = (|p2−p6| + |p3−p5|) / (2·|p1−p4|)` (wysokość oka / szerokość). **PERCLOS** = udział czasu z okiem zamkniętym ≥ 80% w ostatnich 60 s. Wagi: PERCLOS 30%, mruganie 20%, długie 15%, postawa 15%, ziewanie 10%, czas 10%.
- **Decyzje:** (1) wzorzec „oko otwarte” = 90. percentyl EAR z ostatnich 30 s – **porównujemy Cię z Tobą**, nie ze średnią twarzą; (2) próg mrugnięcia dopasowany do osoby (połowa drogi między okiem otwartym a typowym mrugnięciem); (3) gdy patrzysz w dół (klawiatura) albo mówisz – nie liczymy; (4) gdy dane są niepewne (mało klatek, brak twarzy) – **nie pokazujemy liczby zamiast zgadywać**; (5) mruganie z 3 min, bo zmienia się 4–5× zależnie od czynności.

### energy.ts – „Bateria” i prognoza · Kacper
- Jedna liczba 0–100: 100 − ważone koszty (zmęczenie 50%, postawa 25%, czas od przerwy 15%) + prognoza „za ile minut spadnie poniżej 30%”.
- **Idea:** regresja liniowa z ostatnich 30 min; prognoza tylko, gdy jest ≥ 10 min danych i wynik < 3 h.
- **Decyzja:** brak składowej = jej waga przechodzi na pozostałe (bez kamery twarzy nadal działa). Dziś Bateria jest widoczna w podpowiedzi widgetu i po przerwie („Bateria 52% → 61%”); główny ekran pokazuje „Zmęczenie” (prostszy przekaz po uwagach mentorów).

### breakEngine.ts – kiedy przerwa · Kacper (+ Marcin)
- Reguły: 20-20-20 dla oczu co 20 min, mikroprzerwa co 30 min, ruchowa co 55 min; wcześniej, gdy zmęczenie ≥ 55–70%, wynik postawy spada od kwadransa albo były 3 alerty w 15 min.
- **Idea:** każda propozycja ma **powód** (`timer` / `fatigue` / `posture-trend` / `alerts`), który widać na ekranie przerwy („Wynik postawy spada od kwadransa…”); przypomnienie przy widgecie podaje nazwę ćwiczenia.
- **Decyzja:** odejście od biurka na ≥ 2 min liczy się jako przerwa ruchowa, 20 s – 2 min jako przerwa dla oczu – nie każemy robić przerwy komuś, kto właśnie wrócił z kuchni.

### exerciseVerify.ts – ćwiczenia liczone kamerą · Marcin
- Liczy powtórzenia cofania brody i unoszenia barków oraz sekundy przechylania głowy na każdą stronę – z tych samych metryk co postawa.
- **Idea:** pozycja wyjściowa = mediana z 1. sekundy po „Start”; powtórzenie = sygnał ≥ `enter` przez min. czas, potem powrót < `exit` (histereza). Cofanie brody = twarz maleje bardziej niż barki (odchylenie całym ciałem się znosi).
- **Decyzja:** nie oceniamy techniki jak fizjoterapeuta – tylko zakres ruchu, czas utrzymania i powrót. Ćwiczenia, których kamera z przodu nie rozpozna pewnie, zalicza się przyciskiem „Zrobione”.

### oneEuro.ts – wygładzanie punktów · Kacper (prototyp)
- Filtr One Euro (Casiez i in., CHI 2012) na każdym punkcie x/y.
- **Idea:** dolnoprzepustowy filtr, którego częstotliwość odcięcia rośnie z prędkością: `cutoff = minCutoff + β·|prędkość|` – w bezruchu mocno tłumi drgania, przy szybkim ruchu prawie nie opóźnia.
- **Decyzja:** zamiast zwykłej średniej kroczącej, bo ta albo drga, albo się spóźnia.

### landmarkFollower.ts – płynna nakładka 60 fps · Mateusz
- Sylwetka liczy się ~8×/s, ekran odświeża 60×/s; punkty na rysunku „podążają” za ostatnim pomiarem.
- **Idea:** `x += (cel − x)·(1 − e^(−dt/τ))`, τ = 70 ms.
- **Decyzja:** wygładzanie tylko na rysunku – do oceny postawy idą prawdziwe pomiary, a nakładka nie skacze. Bez alokacji w pętli (wydajność).

### insights.ts (+ aggregate.ts) – statystyki · Marcin (+ Kacper)
- Agreguje minuty (postawa, zmęczenie, obecność) w statystyki dnia/7/30 dni i listę „Co poprawić” (udział czasu z danym problemem).
- **Idea:** jedna próbka na minutę; „wskaźnik formy” = 45% brak zmęczenia + 35% postawa (+20% tempo pracy, gdy włączone).
- **Decyzja:** po uwagach mentorów Statystyki uprościliśmy do dwóch zakładek (Postawa / Zmęczenie) i samych słupków; mapa „Godziny formy” jest liczona w kodzie, ale nie jest już pokazywana.

### frameGate.ts – tylko nowe klatki · Mateusz
- Analizujemy klatkę tylko wtedy, gdy czas wideo się zmienił. Naprawiło „zamrożoną” ocenę po zmianie zakładki (PR #71).

---

## src/renderer – to, co widać

### analyzer.ts – serce pętli · Kacper / Mateusz / Marcin
- Kamera → twarz (każda klatka, 30/s; 15/s na baterii) → sylwetka (co 125 ms) → metryki → wynik, zmęczenie, przerwy → co minutę próbka do bazy.
- **Idea:** dwa modele o różnej częstotliwości: mrugnięcie trwa 100–400 ms, więc twarz musi być częściej niż sylwetka.
- **Decyzja:** podnieśliśmy twarz z 25 do 30 kl./s (PR #102), bo przy 25 najgłębszy moment szybkiego mrugnięcia często wypadał między klatkami. Modele ładują się z paczki aplikacji (offline, PR #87), GPU z zapasem na CPU.

### landmarks.ts + draw.ts – nakładka (kontur powiek + szkielet) · Mateusz
- Rysuje na podglądzie kontury powiek, tęczówek, brwi, ust i owal twarzy oraz białe linie szkieletu górnej części ciała; linia kręgosłupa i kółko „gdzie powinna być głowa”.
- **Idea:** kontur powiek zamyka się przy mrugnięciu – **widać, że licznik naprawdę widzi oczy**.
- **Decyzja:** neutralne, białe barwy zamiast neonu: nakładka ma pokazywać, co widzi kamera, a nie konkurować z twarzą (uwaga mentora: świeci tylko to, co jest problemem).

### calibrator.ts – pełnoekranowa kalibracja · Kacper
- „Duch” sylwetki do dopasowania, poziomice na barkach i głowie, lista, która sama się odhacza, start bez klikania (odliczanie, gdy wszystko OK).
- **Decyzja:** cała logika w `core/` (framing, calibration), tu tylko rysowanie – logika jest testowana bez kamery.

### nudge.ts – spokojne przypomnienia · Mateusz
- Małe okienko obok widgetu: 20-20-20 z odliczaniem 20 s, przerwa z [Start] / [Za 5 min], wskazówka postawy, która znika, gdy się poprawisz.
- **Decyzja:** okno nie kradnie fokusu (`focusable: false`), samo znika (przerwa 30 s, postawa 15 s), zawsze jest „×”. Zamiast migania – cienki pasek czasu. Cel: nie przeszkadzać w pracy.

### widget.ts – mini-widget · Mateusz
- Zawsze na wierzchu, dwie wersje: „karta” (wynik, stan, zmęczenie) i „pigułka” (liczba + kropka w kolorze stanu). Klik otwiera aplikację, przeciągnięcie przesuwa.
- **Decyzja:** przeciąganie obsłużone w kodzie (próg 3 px), bo systemowy „drag region” zjadałby kliknięcia.

### fatigueWhy.ts – „Dlaczego X%?” · Marcin
- Rozkłada wskaźnik zmęczenia na 6 składowych z wagą, bieżącą wartością i normą. Wynik nie jest czarną skrzynką.

---

## src/main – proces główny Electrona

### main.ts – zasobnik, okna, IPC · Mateusz / Kacper / Marcin
- Ikona w zasobniku zmienia kolor z postawą, wynik obok ikony, krótkie menu; okna: główne, widget, przypomnienie; zamknięcie okna nie wyłącza analizy. Blokada ekranu = pauza (`powerMonitor`).
- **Idea:** renderer liczy, main tylko zapisuje i pokazuje – komunikacja przez IPC (`minute`, `status`, `notify`, `save-calibration`…). Uprawnienia sesji: tylko kamera i powiadomienia.
- **Decyzja:** powiadomienia najpierw jako spokojne okienko przy widgecie, systemowe tylko jako zapas; tryb „Nie przeszkadzać” wycisza, analiza działa dalej.

### db.ts – lokalna baza · Kacper (prototyp)
- SQLite z wbudowanego `node:sqlite` (bez natywnych zależności): tabele `minutes` (liczby z każdej minuty), `events`, `kv` (ustawienia, kalibracja). „Usuń moje dane” czyści wszystko.
- **Decyzja:** nie ma kolumny na obraz – prywatność wynika ze schematu, nie z obietnicy.

### models.ts – modele MediaPipe · Kacper / Mateusz
- Najpierw modele dołączone do aplikacji (`assets/models`), potem wcześniej pobrane, pobieranie tylko w ostateczności.
- **Decyzja:** `pose_landmarker_full` zamiast `lite` – stabilniejsze barki i uszy (lite zostaje jako zapas). Dzięki dołączeniu modeli aplikacja startuje bez internetu.

---

## 15 pytań jury / mentorów – krótkie, uczciwe odpowiedzi

1. **Czym różnicie się od Straighty (2024) i Rest & Blink (2025)?** Straighty to postawa i przypomnienia, Rest & Blink – ćwiczenia oczu. My łączymy postawę, oczy i zmęczenie w **jedną decyzję w danej chwili** („przerwa teraz, bo…”), porównujemy Cię tylko z Tobą (kalibracja), a ćwiczenia **liczy kamera**. Wszystko na urządzeniu.
2. **Czy to wyrób medyczny?** Nie. To narzędzie do nawyków, nie diagnozuje. Zmęczenie to **wskaźnik, nie diagnoza**. Przy bólu odsyłamy do fizjoterapeuty (zdanie w „Ćwiczeniach”).
3. **Jak dokładne są mrugnięcia?** Uczciwie: test był jakościowy. 03.10 (22:50–23:40) Mateusz testował na żywo w okularach i bez; znaleźliśmy i naprawiliśmy 5 błędów (m.in. licznik stał na 0 przez zawyżony wzorzec oka, „patrzysz w dół” gubił co ~8. mrugnięcie). Po poprawkach liczy „w miarę dobrze”. **Liczby procentowej nie podajemy, dopóki nie zmierzymy** (protokół w `docs/BADANIE-OCZU.md`).
4. **A zmęczenie?** Składamy je z miar z najmocniejszymi badaniami: PERCLOS (Dinges 1998) i długie mrugnięcia (Schleicher 2008). Wiemy, że przy ekranie mruga się ok. 7/min zamiast ok. 22 (Tsubota, NEJM 1993), więc rzadkie mruganie traktujemy jak **zmęczenie oczu i powód do 20-20-20**, nie senność. Nie jest klinicznie zweryfikowane.
5. **Okulary?** Odblask psuje punkty powiek. Dlatego próg mrugnięcia jest dopasowany do osoby i nie pokazujemy liczby, gdy dane są niepewne. W teście w okularach po poprawkach działa, ale bez zmierzonej dokładności.
6. **Inna karnacja, kształt twarzy?** Model twarzy (Face Mesh v2): różnica błędu między karnacjami ok. 2,5–2,9%, między 17 regionami świata 1,2% (karta modelu Google). Model sylwetki ma większe różnice (85,9–92,9% poprawnych punktów) – łagodzi to osobista kalibracja. Surowy `eyeBlink` odnosimy do Twojej normy, bo u osób z wąskimi oczami / opadającymi powiekami bywał wysoki przy otwartych oczach. Realne ryzyko: słabe światło – wtedy podpowiadamy „Za ciemno”.
7. **RODO, AI Act?** Obraz przetwarzany tylko w pamięci, nigdy nie zapisywany ani wysyłany; w bazie są liczby z minut. Bez kont, bez chmury, „Usuń moje dane”. **Nie rozpoznajemy emocji** (AI Act art. 5 zakazuje tego w miejscu pracy) – mierzymy geometrię: kąty i otwarcie oka.
8. **Działa offline?** Tak – modele MediaPipe są dołączone do aplikacji (PR #87). Internet nie jest potrzebny ani do startu, ani do analizy.
9. **Dlaczego desktop, a nie web?** Aplikacja ma działać w tle cały dzień: zasobnik, widget na wierzchu, przypomnienia, pauza przy blokadzie ekranu, lokalna baza. Przeglądarka usypia karty w tle i nie da widgetu ani zasobnika.
10. **Model biznesowy?** B2B jako benefit pracowniczy – przepisy BHP o pracy przy monitorze wymagają przerw, my pomagamy je robić we właściwym momencie. Pracodawca dostawałby co najwyżej anonimowy widok zespołu, nigdy dane osoby (to plan, nie ma tego w aplikacji). Cen i liczb rynku **nie podajemy** – nie liczyliśmy ich.
11. **Co zbudowaliście na hackathonie, a co było wcześniej?** Prototyp Postury Kacpra (analiza postawy, podstawy zmęczenia, przerwy, Electron) wszedł jednym commitem `345cf6e` o 13:26 03.10. Na hackathonie: ćwiczenia liczone kamerą, nakładka z konturem powiek, płynne 60 fps, kalibracja odporna na złą postawę, dokładne ustawienie głowy, bramka barków, przypomnienia przy widgecie, poprawki oczu z testu na żywo, modele offline, nowe Statystyki, rebranding. Szczegóły: `docs/pitch/WCZESNIEJSZY-KOD.md`. *(Kacper potwierdza, co dokładnie było przed 11:00.)*
12. **Jakich narzędzi AI użyliście?** Claude Code do planowania, kodu, testów i dokumentacji – każdy PR przejrzany przez człowieka, logika w `core/` ma testy jednostkowe. W aplikacji: modele MediaPipe Google (na urządzeniu). Żadnego LLM w aplikacji, żadne dane nie idą do chmury.
13. **Skąd wiecie, że wynik postawy jest dobry?** Liczymy go względem Twojej kalibracji, nie „idealnej” postawy; testy jednostkowe sprawdzają metryki i alerty; po uwagach mentorów pokazujemy najpierw zdanie („Siedzisz prosto” / „Cofnij brodę”), a liczby są o klik dalej. Badania walidacyjnego z fizjoterapeutą nie mamy – to następny krok.
14. **Czy to nie będzie irytować?** Alert dopiero po 30 s złej postawy, max raz na 5 min, histereza; przypomnienia same znikają i nie kradną fokusu; pauza jednym kliknięciem.
15. **Co dalej?** Ścieżka do specjalisty (podsumowanie z 14 dni dla lekarza/fizjoterapeuty, ścieżka NFZ – dziś tego nie ma w aplikacji), wersja angielska, zmierzona dokładność mrugnięć, pilotaż w firmie, telemedycyna/fizjoterapia między wizytami. Lista: `docs/pitch/IDEAS.md`.

**Nie mówić:** „diagnozuje”, „wykrywa wypalenie”, „klinicznie zweryfikowane”, „działa tak samo u wszystkich”, żadnych procentów dokładności, których nie zmierzyliśmy.
