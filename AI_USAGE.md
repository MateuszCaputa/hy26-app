# AI usage & provenance (HackYeah 2026 disclosure)

## Pre-existing work
- **None.** The team states the project was started from scratch at the beginning of HackYeah (3 Oct 2026, 11:00); the repository's first commit is from 10:57 that day (empty repo: team docs only). Early in the event two prototypes were built in parallel (Marcin's „Rytm”, archived under tag `backup/rytm-marcin`, and Kacper's „Postura”, commit `345cf6e`); the team continued with Postura, renamed **Upright**.

## Built during HackYeah
- Camera freeze fix: analyse only fresh frames, resume preview after view switch (MP1) → PR #71
- Quick glance: live posture score next to the tray icon, tray quick menu with actions, dev auto-reload, FEATURES.md (C10) → PR #76
- MediaPipe-style overlay (eyelid/iris contours showing blinks, glowing skeleton) + Windows tray score (MP7) → PR #78
- Two mini-widget styles (card / pill), click to open, drag to move (C11) → PR #79
- Smooth 60 fps overlay: rAF drawing + landmark following between pose measurements (MP9) → PR #80
- Calm nudges next to the widget: 20-20-20 countdown, break Start/snooze, posture tip (C13) → PR #82
- Models bundled for offline start (A1) → PR #87
- Eye metrics measured honestly (blinks, PERCLOS, yawns) + eye diagnostics, found via live testing (A26) → PR #97
- No fatigue score on unreliable eye data; 2+ min away from the desk counts as a break (A13, A14) → PR #77
- Whole-number posture score in widget/tray; widget text ellipsis (A15, C12) → PR #81
- Stats: breaks/alerts on the day chart, norms and vs-yesterday under figures, 7-day bar charts for fatigue and good posture (C14, C15) → PR #83
- Posture figure in the live panel that mirrors the top issue with a correction arrow (C16, mentor feedback F3) → PR #85
- Side menu: camera/gear icons, „Kalibruj” button in place of „Wstrzymaj” (C17) → PR #88
- Minimal Stats: Postawa / Zmęczenie tabs, range select (today, 3/7/30 days), bar charts only (C20) → PR #94
- Simpler Stats and Settings: no „Godziny formy” chart, no work-hours / keyboard-tempo options (C21, C22) → PR #98
- Camera-verified exercises (chin tuck, shoulder raises, neck side stretch) with a rep counter on the break screen, real Bateria change after a break, animated exercise figures (A4, A5, C6, C23) → PR #99
- Fatigue breakdown „Dlaczego X%?” (6 components with weights and norms) and a labelled presentation mode that simulates fatigue on stage without saving it (B9, B10) → PR #104
- Notification preview in Settings shown only in presentation mode (B11) → PR #107
- PL / EN language switch for the whole app (A30) → PR #121
- „Do kogo iść?” card: when a neck/back or eye problem persists 7 of 14 days, suggests the right specialist via NFZ (TIP 800 190 590, red flags → 112), never diagnoses; chin-tuck counting fixed after live test → PR #120

## AI tools used
- **Claude Code** (Anthropic): used by all developers for planning, implementation, tests, docs and review. Every module is understood and can be explained by the team.
- **MediaPipe Tasks Vision** (Google): on-device face and pose landmark models; video frames never leave the device.

## How AI output was validated
- Unit tests for all core logic (`npm test`), typecheck, manual verification with a real camera, scripted demo runs.

## Models and data
- **Models shipped with the app** (`assets/models/`, run fully on-device): MediaPipe `face_landmarker.task`, `pose_landmarker_full.task` (+ `pose_landmarker_lite.task` fallback). Library `@mediapipe/tasks-vision` (Apache-2.0). Model cards: [Face Mesh V2](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf), [BlazePose GHUM 3D](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf), [Blendshape V2](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf).
- **No training and no external datasets.** Thresholds come from published research (cited in `docs/BADANIE-OCZU.md`) and from each user's own calibration.
- No cloud AI/LLM calls in the app; no video leaves the device.
