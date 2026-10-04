# AI usage & provenance (HackYeah 2026 disclosure)

## Pre-existing work (before 3 Oct 2026, 11:00)
- `Postura` prototype by Kacper Smaga: the core posture/fatigue analysis and Electron shell (imported in commit `345cf6e`). *Kacper: describe exactly what existed before the event.*
- Ideas ported from Marcin Pałys' `Rytm` prototype (tag `backup/rytm-marcin`).

## Built during HackYeah
- *(fill in as PRs merge: feature → PR #)*
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

## AI tools used
- **Claude Code** (Anthropic): used by all developers for planning, implementation, tests, docs and review. Every module is understood and can be explained by the team.
- **MediaPipe Tasks Vision** (Google): on-device face and pose landmark models; video frames never leave the device.
- ~~**Claude API** (AI coach)~~: **not shipped.** The app calls no LLM / cloud AI; `src/` contains no Anthropic/Claude API client (checked with grep on 4 Oct). The "AI coach summary" stayed a plan (PLAN B4).

## Pre-trained models shipped in the app
All inference runs on the user's device through **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision` 1.0.1, licence **Apache-2.0** per its `package.json`; its WASM runtime is copied into `dist/renderer/wasm` by `build.mjs`). The model files are Google's published `.task` bundles, unmodified, bundled in `assets/models/` so the app starts offline (A1, PR #87); `src/main/models.ts` keeps the Google Storage URLs only as a fallback download.

| File in `assets/models/` | Used for | Google model card |
|---|---|---|
| `face_landmarker.task` | 478 face landmarks (eyelids, irises) + blendshapes → blinks, PERCLOS, yawns, head pose | [Face Mesh V2](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf), [Blendshape V2](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf) |
| `pose_landmarker_full.task` | 33 body landmarks → posture metrics (default) | [BlazePose GHUM 3D](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf) |
| `pose_landmarker_lite.task` | same, fallback if the full model is missing | [BlazePose GHUM 3D](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf) |

- Model weights: published by Google with the model cards above; the npm package is Apache-2.0. *To verify* that the model files carry the same licence (check the MediaPipe repo / model page).
- **No training or fine-tuning by us; no external datasets used.** Thresholds and norms (blink rate, PERCLOS, 20-20-20, etc.) come from published literature, cited in `docs/BADANIE-OCZU.md`.
- Camera frames are processed in memory and discarded; the local SQLite database stores numbers only (`src/main/db.ts`).

## Icons and graphics
- Side-menu icons "camera" (Na żywo) and "gear" (Ustawienia): from **svgrepo.com** (source comments in `src/renderer/app.ts`). Licence: *to verify* – svgrepo licences differ per icon; find the exact icon pages and note the licence (or redraw them).
- Side-menu icons "Statystyki" and "Ćwiczenia", exercise figures (`src/renderer/figures.ts`) and the posture figure (`src/renderer/postureFigure.ts`): simple inline SVG paths in the repo, no source credited. *To verify* by their authors.
- App icon and spine-arrow logo (`assets/icon.png`, `assets/logo-mark.png`, PR #103) and tray icons (`assets/tray-*.png`): origin not recorded in the repo – *to verify* (who made them, and whether an AI image tool was used).

## How AI output was validated
- Unit tests for all core logic (`npm test`), typecheck, manual verification with a real camera, scripted demo runs.
