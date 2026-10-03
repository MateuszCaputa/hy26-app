# ARCHITECTURE — one page

> Module map for anyone who has to explain the app (mentors, judges, a teammate taking over). Verified against the code on `main` (Oct 4). If this file and the code disagree, the code wins — fix this file.

## 1. Data flow

```
webcam (getUserMedia, renderer)
  → MediaPipe tasks-vision, on-device (models from app://local/models/…)
      face landmarker: 30 fps (15 on battery, 8 with face analysis off)   ── analyzer.ts
      pose landmarker: every 125 ms ≈ 8 fps                             ── POSE_INTERVAL_MS
  → core/frameGate (only new frames) → core/oneEuro, core/shoulderGate (clean landmarks)
  → core/metrics + core/headPose (posture numbers)  → core/scoring (score 0–100, issues, alerts)
  → core/fatigue (EAR, blinks, PERCLOS, yawns, head droop → fatigue %)
  → core/energy ("Bateria" 0–100 + minutes until < 30%)
  → core/breakEngine (when to suggest which break)
  → core/aggregate MinuteAggregator (one MinuteSample per minute)
  → IPC `minute` → main/db.ts (SQLite `minutes` table: numbers only)
  → core/insights buildStats (main) → IPC `get-stats` → views/stats.ts
```

Alerts and break suggestions are decided in the renderer (`analyzer.ts` → callbacks in `app.ts`) and sent to main as `notify` / `event`; main shows the system notification or the corner nudge window, and logs events to the `events` table.

## 2. Processes

| Process | Files | Does |
|---|---|---|
| **main** | `src/main/main.ts`, `db.ts`, `models.ts`, `activity.ts` | tray + menu, windows (main, widget, nudge), IPC handlers, SQLite store, notifications, end-of-day summary, `app://` protocol serving the UI, wasm and models |
| **preload** | `src/preload.ts` | exposes `window.postura` (contract: `src/shared/api.ts` `PosturaApi`) |
| **renderer** | `src/renderer/` | `analyzer.ts` (camera + MediaPipe loop), `calibrator.ts`, `views/` (live, stats, exercises, settings), `draw.ts`/`overlays.ts`/`figures.ts`/`postureFigure.ts` (canvas), `widget.ts`, `nudge.ts`, `trayBadge.ts` |
| **shared** | `src/shared/types.ts`, `api.ts` | data shapes and the IPC contract (hot file) |

## 3. `src/core/` — pure logic, no Electron, unit-tested in `test/`

Owner of `src/core/` is area A (Kacper), see CLAUDE.md "Team & ownership".

| Module | What it decides |
|---|---|
| `frameGate` | is this a new camera frame (frozen video must not be scored) |
| `oneEuro` | One Euro filter: smooths landmark jitter, less lag on fast moves |
| `landmarkFollower` | smooth ~60 fps overlay between ~8 fps pose results |
| `shoulderGate` | reject frames where the pose model guesses the shoulders |
| `headPose` | head pitch / yaw / roll in degrees from the face transformation matrix |
| `metrics` | posture metrics from 33 pose points (front view) |
| `calibration` | is the calibration pose acceptable; personal thresholds; baseline drift |
| `framing` | one framing hint before calibration ("Odsuń się", "Za ciemno"…) |
| `scoring` | posture score 0–100, issues, states, alert hysteresis |
| `fatigue` | blinks, PERCLOS, yawns, head droop → fatigue indicator 0–100 % |
| `energy` | "Bateria" 0–100 and the forecast of crossing 30 % |
| `breakEngine` | 20-20-20, micro, movement and adaptive breaks |
| `exerciseVerify` | was the exercise actually done (range, hold, return), counted by camera |
| `coach` | texts: issue labels/tips, exercises, break titles and reasons |
| `aggregate` | per-minute samples, posture trend |
| `insights` | stats payload for the Stats view and the end-of-day summary |

## 4. Privacy boundary

- Pixels exist only in the renderer: the `<video>` element, MediaPipe input (on the CPU path an `OffscreenCanvas` `getImageData` in `analyzer.ts`), and a 32×24 brightness sample in `calibrator.ts`. They are never written to disk or sent anywhere.
- What crosses IPC and lands in SQLite are numbers (`MinuteSample`, events, settings, calibration).
- Network: the main window CSP has `connect-src 'self'`. The only outgoing request is `net.fetch` in `src/main/models.ts`, and only when a model is missing from both `assets/models/` (bundled) and the user data folder.
- Dev-only exception: `--screenshot=<file>` captures the main window (on the live view that includes the camera preview). Not used by the app itself.

## 5. Naming

The product shown in the UI is **Upright** (window titles, sidebar brand, tray). The internal id stays **`postura`**: `window.postura` / `PosturaApi`, `POSTURA_*` env vars, npm name, appId `pl.postura.app`, user data folder `Postura`, DB file `postura.db`. Kept on purpose: changing appId / userData would lose existing users' calibration and history.
