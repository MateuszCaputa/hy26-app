# Rytm

Asystent zdrowia przy biurku: kamerka ocenia postawę i oznaki zmęczenia, a Rytm podpowiada, kiedy zrobić przerwę. Projekt na HackYeah 2026, kategoria Sport & Healthcare.

Obraz z kamery jest analizowany w przeglądarce (MediaPipe) i nigdzie nie jest zapisywany ani wysyłany. Zapisujemy tylko agregaty minutowe w IndexedDB.

## Uruchomienie

```bash
npm install
npm run dev
```

Otwórz http://localhost:5173 w Chrome, wpisz imię, zaznacz zgodę i przejdź 10-sekundową kalibrację.

## Pomiar zespołu w czasie hackathonu

1. Każda osoba uruchamia Rytm na swoim laptopie i zostawia kartę otwartą.
2. Co kilka godzin: **Dane zespołu → Eksportuj dane do pliku**.
3. Na komputerze do pitchu: **Wczytaj pliki od zespołu** (można wybrać kilka naraz).

## Testy

- `node scripts/smoke.mjs`: przejście przez ekran Start w Chrome z wirtualną kamerą (serwer dev musi działać).
- `node scripts/fps.mjs`: pomiar faktycznej liczby klatek na sekundę.

## Wersja desktopowa (Electron)

- `npm run desktop`: buduje frontend i uruchamia aplikację.
- `npm run desktop:dev`: aplikacja ładuje serwer `npm run dev` (szybkie zmiany w kodzie).
- `npm run dist:win`: tworzy przenośny plik `release/Rytm-<wersja>.exe` do przekazania zespołowi.

Zamknięcie okna chowa Rytm do zasobnika systemowego, a pomiar trwa. Pomiar zatrzymuje tylko „Zakończ” w menu ikony w zasobniku.
Test: `node scripts/desktop-smoke.mjs` (po `npx vite build`) i `node scripts/packaged-smoke.mjs` (po `npm run dist:win`).

### macOS

Na Macu (Node.js 20+): `npm install`, potem `npm run desktop`. Plik `.dmg` buduje się tylko na Macu: `npm run dist:mac`.
Aplikacja nie jest podpisana, więc przy pierwszym uruchomieniu: prawy klik na Rytm → Otwórz. Przy pierwszym starcie macOS zapyta o dostęp do kamery.
