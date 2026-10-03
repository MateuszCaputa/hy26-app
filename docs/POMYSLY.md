# Pomysły do podjęcia (dla kogoś z energią)

> Zebrane z turnieju agentów (gladiatorzy + sędziowie), badań i rozmów, sob. 03.10 wieczorem. **To propozycje, nie ustalenia.** Zanim ktoś zacznie: wpisać zadanie do `docs/PLAN.md` z właścicielem.
> Kierunek z turnieju: **nie dokładać funkcji, tylko jasność + wiarygodność + ścieżka do specjalisty.**

## 1. „Jeden werdykt” (zwycięzca turnieju, sędzia wykonalności)
**Co:** jedna mała funkcja `src/core/verdict.ts` decyduje, **co jest teraz najważniejsze**, i tę samą odpowiedź pokazują wszystkie miejsca: duży nagłówek w panelu „Na żywo”, ludzik, szkielet na kamerze (szary, świeci tylko problematyczna część ciała), kolor ikony w zasobniku / widgetu. Szczegóły pomiaru zostają zwinięte jak dziś.
**Dlaczego:** dziś każde miejsce decyduje samo i potrafią sobie przeczyć (zasobnik zielony 82, a nagłówek „zmęczenie”). Odpowiada na feedback mentora F1, F2 i F3 naraz i usuwa migotanie.
**Kształt:** `{ poziom: ok | uwaga | źle, częśćCiała: szyja | barki | plecy | oczy | brak, zdanie: „Cofnij brodę”, akcja: „Przerwa dla oczu” | brak }`. Priorytet: postawa → oczy → przerwa. Oczy przejmują dopiero po 2–3 min stałego sygnału.
**Moment w pitchu:** ekran szary, „Siedzisz dobrze”. Pochylasz się → świeci tylko szyja, głowa ludzika i kropka w zasobniku, wszędzie „Cofnij brodę”. Prostujesz się → wszystko gaśnie. „Bez liczb, bez wykresów. Jedno zdanie, jedna część ciała.”
**Ile:** ok. 1,25 h rdzeń + testy (Kacper) + ok. 3 h podpięcie (Mateusz). **Warunek:** najpierw poprawione oczy (`docs/BADANIE-OCZU.md`), inaczej werdykt tylko ładniej pokaże złe liczby.

## 2. „24 godziny HackYeah” – raport dla lekarza z naszych danych (zwycięzca, sędzia jury)
**Co:** jedna strona do druku na osobę z zespołu, z 24 h, które naprawdę zmierzyliśmy: krzywa dnia, jeden wyraźny wzorzec („Kacper: głowa wysunięta 41% minut po 02:00, mrugnięcia 17→9/min”) i ramka „do kogo iść”: fizjoterapeuta / okulista / lekarz rodzinny, **TIP NFZ 800 190 590**, bez diagnoz.
**Dlaczego:** wypełnia jedyny pusty filar (dostęp do opieki zdrowotnej), a drużyna-kopia nie ma naszych danych.
**Moment w pitchu:** prezenter trzyma wydrukowaną kartkę: „To Kacper, ostatnia noc. O 02:10 jego mruganie spadło o połowę, głowa przesunęła się o 4 cm do przodu. Postura go nie zdiagnozowała – wskazała, do kogo iść przez NFZ.”
**Ile:** ok. 4–6 h (Marcin: wzorzec + raport + PDF; Bartłomiej: wydruki, slajd). **Warunek:** Postura działa całą noc na wszystkich laptopach.

## 3. „Oczy porządnie” (pakiet, ok. 3,5 h)
- **Prawdziwa odległość od ekranu w cm z tęczówki** (tęczówka ma ok. 11,7 mm u prawie każdego). Kacper już szacuje cm przy kalibracji z rozstawu źrenic – to wersja „hybrydowa”, opcjonalna.
- **Zweryfikowane 20-20-20:** odliczanie idzie tylko, gdy naprawdę patrzysz w dal (kierunek spojrzenia z tęczówki + kąt głowy), na końcu „✓ zweryfikowane”. Nikt tego nie ma.
- **Mrużenie oczu** jako sygnał zmęczenia oczu (`eyeSquint` z blendshapes; sygnał fizjologiczny, nie emocja – zgodne z AI Act).

## 4. Narzędzie testu mrugnięć (do pomiaru, nie dla użytkownika)
Ukryty tryb: przez 60 s naciskasz **Spację** przy każdym mrugnięciu, Postura pokazuje „Ty: 14, aplikacja: 9, zgodność X%” i zapisuje log. Pozwala zmierzyć poprawki Kacpra „przed” i „po” oraz daje liczby na slajd. Ok. 1 h. Alternatywa bez kodu: nagranie slow-motion telefonem (`docs/BADANIE-OCZU.md`).

## 5. Nawodnienie (pomysł mentora, F4)
- **Proste (45 min):** przypomnienie co 45–60 min w dyskretnych podpowiedziach + przycisk „Wypiłem” i licznik.
- **Trudne (3–4 h, po drafcie):** kamera widzi butelkę/kubek przy ustach (MediaPipe ObjectDetector: *bottle*, *cup*) + nadgarstek przy ustach + odchylenie głowy ok. 1 s → łyk. To **szacunek**, kosztuje kl./s.

## 6. Ćwiczenia sprawdzane kamerą („Reset na żywo”, Stage Showman)
Kamera liczy 5 wzruszeń barkami / 5 cofnięć brody, każde powtórzenie zapala segment szkieletu, na końcu karta „Postawa 58 → 93, Bateria +12”. Najlepszy moment sceniczny, **najbardziej ryzykowny technicznie** (przenoszenie `<video>`, klasa błędu MP1). Raczej po zamrożeniu albo wcale.

## 7. Pomiar dokładności na ludziach („Postura Proof”, Contrarian)
Wersja mini: 3–4 osoby (z okularami i bez, różne kształty oczu), 60 s ręcznego liczenia mrugnięć vs aplikacja → jedna tabela na slajd („pilotaż”). Wersja duża (12–20 obcych z hali) – za droga godzinowo.

## 8. Mniejsze
- **„Dlaczego teraz”** przy przypomnieniach: „Przerwa teraz, bo: PERCLOS 18% (norma < 10%), 52 min bez przerwy” (A3).
- **Tryb pokazowy na projektor:** jaśniejsze kolory, większe liczby (C4).
- **Ikona i logo:** podmiana na nowe logo zespołu (potrzebny plik SVG albo PNG ≥ 1024 px; wersja uproszczona do 16 px dla zasobnika).
- **Zapamiętany większy ludzik:** wersja Marcina jest pod tagiem `ui/stickman-big` – do porównania z mniejszym (Kacper) i wyboru.

## Odrzucone przez sędziów (nie zaczynać)
Asystent AI / zgłoszenie do kategorii AI · nowa praca nad Garminem (usunięty) · osobny widok danych zespołu · duże badanie na obcych.
