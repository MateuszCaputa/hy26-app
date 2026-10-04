# PLAN: live task list

> **Order of work = `docs/ROADMAP.md`** (phases + gates). This file is the full backlog.
> Tick `[x]` when done (definition of done: `docs/ENGINEERING.md` §5). Add `(@name, in progress)` when you start a task.
> IDs map to `docs/SCOPE.md` §5 (M = must, S = should, C = could). Areas map to the ownership table in `CLAUDE.md`.
> **Gates:** 16:00 everyone has a branch running · **19:00 the demo path works end to end with M2 + M3** · 23:00 all MUSTs merged · 03:00 polish only · **07:00 FEATURE FREEZE** · 10:00 submitted.

## Area A: Core engine & measurement (owner: Kacper, the Postura author)
- [x] **A26 Eye metrics fixes** (@Mateusz, PR #97): gaze-down gate (adaptive 20 s pitch baseline), per-person eyeBlink baseline, self-correcting open-eye reference, per-person blink threshold, 1-frame blinks, talking excluded, 3-min blink window + low rate = eye strain, nods out of score, yawn 1.5–6 s, flutter ≠ long blink; hidden eye diagnostics (key D). Live-tested by Mateusz with and without glasses.
- [x] A1 (M7) Models bundled in `assets/models/` (face + pose full + lite, 19 MB, shipped via extraResources); loaded first, the userData download is only a fallback; `modelsReady` accepts full OR lite (fixes N1). Tested with an empty data dir: no download screen, "Modele wczytane (GPU)". (@Mateusz, PR #87)
- [ ] A2 (M1) Measure FPS on the demo laptop with the overlay ON; keep it at 24+ (pose every 2nd frame if needed).
- [ ] A3 (M3) `core/explain.ts`: for each alert/break, produce `{reason, evidence[]}` from the current metrics ("PERCLOS 18% (norm < 10%)", "52 min without a break"). Unit tests.
- [x] A4 (M4) `core/exerciseVerify.ts`: camera-verified reps from the existing posture metrics, start position = median of the first 1 s after Start, hysteresis + min hold + refractory. Chin tuck (face shrinks vs shoulders, so leaning back does not count), shoulder raises (shoulder line up), neck side stretch (seconds of head roll per side). Other exercises keep the manual „Zrobione”. Tests with synthetic clips. (@Marcin; taken over from Kacper)
- [x] A5 (M4) Recovery after a verified exercise: the break is credited automatically (resets time-since-break and the fatigue trend), and the toast shows the real Bateria change „Bateria 52% → 61%” (no artificial bonus). (@Marcin)
- [x] A6 (S1) `core/energy.ts`: one fused 0–100 "energy/battery" from fatigue + posture + time since break + Garmin Body Battery if present; plus a linear prediction "minutes until < 30". Tests. (@Kacper, branch `kacper/energy-simple-ui`: `core/energy.ts` + tests; Garmin Body Battery used when today's entry exists)
- [ ] A7 (M5) `core/carePattern.ts`: detect a persistent pattern (e.g. 10 of the last 14 days with a dominant issue above threshold, or high eye strain) and produce the input for the doctor report.
- [ ] A8 Record 2–3 landmark fixture clips (good posture, slouch, tired) for tests + demo mode.
- [x] A10 Posture precision: nose/eyes from the face mesh instead of the pose model, `core/shoulderGate.ts` rejects guessed shoulders (visibility, width/tilt jumps, holds the last good ones), shoulder/head tilt judged vs level (calibration can shift zero by ≤ 3°). (@Kacper, branch `kacper/posture-precision`)
- [x] A12 Simpler first screen (usability): the live view leads with Bateria + one tip + next break, measurements under "Szczegóły pomiaru"; settings split into basic + "Zaawansowane"; keyboard tracking off by default (macOS Accessibility prompt confused new users). (@Kacper, branch `kacper/energy-simple-ui`; touches `views/live.ts`, `views/settings.ts`, `styles.css` (C) and `DEFAULT_SETTINGS` (shared) — Mateusz please review)
- [x] A17 Calibrator UX: full-screen camera with a silhouette to step into, framing hints first (`core/framing.ts`: too close/far, left/right, head cut, camera too low, too dark), spirit levels on shoulders and eyes, a checklist that ticks, hands-free start (3-2-1), step 2 with an animated figure, result with "Prosto vs Zwykle" sketches (points only, no images) + summary. (@Kacper, branch `kacper/calibrator-ui`; new `renderer/calibrator.ts`, `overlays.ts` delegates to it (C))
- [x] A11 Calibration that survives bad posture: live checks during calibration, two-step (tall + usual slouch) with a personal range, a "you sat straighter than your calibration" hint. (@Kacper, branch `kacper/calibration-guard`; touches `overlays.ts` calibration dialog (C) and one toast in `app.ts`)
- [x] A13 No fatigue score when eye data is unreliable (face < 70% of frames, < 12 fps, or no blink/PERCLOS yet): show "za mało danych z oczu" instead of a number built from posture + time only; smoothing resets. (@Marcin; touches `core/fatigue.ts`, `views/live.ts`)
- [x] A14 2+ min away from the desk counts as a real break: logged as `break-done` (stats), resets the Bateria trend, stillness and fatigue, "Witaj z powrotem" toast. (@Marcin; touches `core/breakEngine.ts`, `analyzer.ts`, one callback in `app.ts`)
- [x] A15 Posture score is always a whole number: during a brief pose loss (< 3 s) the tracker returned the raw smoothed value, so the widget/tray showed e.g. `89.18971503778276`. (@Marcin; `core/scoring.ts` + test)
- [x] A18 Calm, neutral home screen (usability + design): neutral grey palette (light + dark), camera overlay always dimmed and neutral; only the problem segment lights up amber/red (neck + arrow to the calibrated head ring for head forward/slouch/too close, shoulders + level for tilt/twist, eye line + level for head tilt) (FEEDBACK F2), no coloured frame around the camera, one plain-language label on the video only when something is off (instead of „szyja −19%”, „barki 4°”); panel answers 3 questions in words: „Twoja postawa” (state + what to do + „Ocena 76/100 – do poprawy”), „Bateria – ile masz siły na pracę” (% + „Dużo energii / Energia spada / Mało energii” + what it means), „Przerwy”; details explain each measure. (@Kacper, branch `kacper/calm-home`; touches C files `styles.css`, `draw.ts`, `landmarks.ts`, `views/live.ts`: Mateusz please review; overrides ENGINEERING §8 neon accents) Also: sideways lean no longer reads as head forward (`neckRatio`/`earRatio` = distance from shoulder midpoint, not vertical gap; test). New issues `headBack` (chin up, from head pitch) and `shrug` (shoulders raised: neck shortening split by what moved in frame vs calibration, which now stores `noseY`/`shoulderY`); up to 2 issues at once, one per body part (overlay + panel tips).
- [x] A19 Remove Garmin Connect (team decision: not shipping it): `main/garmin.ts`, the `garmin-connect` package, IPC, Settings card, Stats "Sen i regeneracja", sleep insight, Body Battery input to Bateria, seed data; old DBs drop `garmin_daily` and the stored login on start. (@Kacper, branch `kacper/remove-garmin`; touches shared `package.json`/lockfile, `src/shared/*`, `main.ts`, `preload.ts`, `build.mjs`, B/C views)
- [x] A20 Live panel, one glance: small C16 posture figure next to the state sentence + tip, calmer (pose eases in ~1 s, view/arrow change only after the issue holds 2 s, no pulsing); "Zmęczenie" % instead of "Energia do pracy"; breaks as one line ("Przerwa za X min" + button); details only eye counts (blinks/min, yawns) and posture deviations with hover help per row. (@Kacper, branch `kacper/fatigue-panel`; touches `views/live.ts`, `styles.css` (C), `renderer/postureFigure.ts` (B): Marcin/Mateusz FYI)
- [x] A21 Sidebar button back to „Wstrzymaj” / „Wznów analizę” (pause/resume the camera analysis) instead of C17's „Kalibruj”; calibration stays in „Szczegóły pomiaru”. (@Kacper, branch `kacper/all-prs`; touches `renderer/app.ts` (C/integration))
- [ ] ~~A25~~ (reverted: Marcin's bar charts are correct; `stats.ts` restored to `9665e32`) Stats → Zmęczenie: one thin line (0–100, dashed 40% "tired" line, hover crosshair + value) instead of the bar chart, and „Godziny formy” as one sentence („Najlepiej 9–11 · spadek ok. 14:00”) instead of a second chart. Postawa tab unchanged. (@Kacper, branch `kacper/fatigue-viz`; touches `views/stats.ts`, `styles.css` (B/C): Marcin/Mateusz FYI)
- [x] A23 Settings → „Podgląd powiadomień”: buttons that show every notification on demand (corner nudge: 20-20-20 / micro / move / posture; system notification: posture / break; in-app toast; break screen), bypassing cooldown, DND and work hours. (@Kacper, branch `kacper/fatigue-viz`; adds IPC `test-notify` in shared `api.ts`/`preload.ts`/`main.ts`, `views/settings.ts`: Mateusz FYI)
- [x] A24 Notification routing: mini-widget on → reminders only in a smaller nudge that slides out centred under the widget (no in-app toast, no system notification); widget off → system notifications (toggle „Powiadomienia systemowe” replaces the corner/system select). Break nudges pick a random exercise; „Start” opens exactly that exercise. (@Kacper, branch `kacper/fatigue-viz`; touches shared `types.ts` (`systemNotifications` replaces `nudges`, `Nudge.exerciseId/from`), `api.ts`, `preload.ts`, `main.ts`, `nudge.ts`, `styles.css`, `app.ts`, `settings.ts`, `core/breakEngine.ts`: Mateusz FYI)
- [x] A26 Rebrand to **Upright**: logo from the team (white spine + arrow) cut out to a transparent PNG (`assets/logo-mark.png`), app icon = rounded square in the logo teal `#2d6878` (`assets/icon.png`), sidebar mark as a CSS mask in `--brand`; visible strings „Postura” → „Upright” (window, tray, HTML titles, copy), `productName`; user data stays in the old `Postura` folder. Code identifiers (`PosturaApi`, `postura.db`) unchanged. (@Kacper, branch `kacper/upright-brand`; touches `package.json`, `main.ts`, `app.ts`, `styles.css`, static HTML: all FYI; README/pitch rename left to D)
- [x] A27 Pause leaves no traces: when the camera stops (pause, busy, no permission, missing) the live view drops the last frame (overlay lines, stage hint), hides the calibrate CTA and the ring legend, and the figure goes grey; all come back on resume. (@Kacper, branch `kacper/pause-clear`; `views/live.ts`, `styles.css` (C))
- [x] A28 Shorter tray menu: status (posture, fatigue), „Zrób przerwę teraz”, „Wstrzymaj / Wznów analizę”, „Otwórz Upright”, „Kalibracja”, „Mini-widget”, „Zakończ”. Removed: „Statystyki”, „Wstrzymaj na 30 min”, „Pokaż przypomnienie (test)” (now in Settings), energy and minutes-since-break lines. (@Kacper, branch `kacper/tray-menu`; `main.ts`: Mateusz FYI)
- [x] A29 macOS: app stays out of the Dock and Cmd+Tab (activation policy „accessory” at start; the nudge window used `setVisibleOnAllWorkspaces` without `skipTransformProcessType`, which turned the app into a foreground „Electron” app). Name „Upright” via `app.setName`; `npm start` runs `scripts/dev-brand.mjs`, which renames the local dev Electron.app to „Upright” with our icon (node_modules only, re-signed ad-hoc). (@Kacper, branch `kacper/no-alt-tab`; `main.ts`, `package.json` (prestart): Mateusz FYI)
- [ ] A9 Document every formula in the README's "Jak liczona jest ocena" (how the score is computed), updated for A3–A7.

## Area MP: MediaPipe & camera (bugs first, then precision, then wow). One task at a time, in this order.
> Investigated 2026-10-03 against `src/renderer/{analyzer,app,draw}.ts` and `views/live.ts`. Root causes below are from the code plus the HTML media spec. **Reproduce first** (`/start`), then fix.

- [x] **MP1 (BUG, A, highest priority) Camera freezes after switching tabs (Na żywo → Statystyki → Na żywo).** (@Mateusz, PR #71, verified with real camera)
  - **Root cause:** `LiveView.detach()` removes `root` from the DOM, and the shared `<video>` (`analyzer.video`) lives inside it. Per the HTML spec, a media element removed from the document is **paused**. `LiveView.mount()` re-inserts it but **never calls `video.play()`**, so the picture stays frozen.
  - **Worse:** the analyzer loop keeps running `detectForVideo()` on the paused video, i.e. the **same stale frame** (`readyState` stays ≥ 2). Posture score, alerts and minute samples are computed on a frozen image. That's data corruption, not just a visual glitch.
  - **Fix:**
    - (a) Keep the `<video>` always attached: a hidden host element outside `#view`; LiveView only shows it, e.g. by moving it with `stage.prepend(video)` and calling `video.play()`. Or call `play()` on every mount **and** re-`play()` on the `pause` event while `analyzer.isRunning`.
    - (b) In `Analyzer.tick()`, skip detection when there's no new frame: `video.paused`, or `video.currentTime === lastVideoTime`. Better: drive the loop with `video.requestVideoFrameCallback`.
  - **Done when:** after 10× switching views the preview is live; no frames are analysed while the video is paused (log or test); score updates only from fresh frames.
- [ ] **MP2 (BUG, A) Freeze after Wstrzymaj → Wznów (pause/resume).** (@Mateusz, in progress: logging added in PR #71; verify there)
  - Likely the same root cause as MP1 when pause/resume happens while another view is mounted. Plus `await this.video.play().catch(() => undefined)` in `Analyzer.start()` **swallows the play error**, so we're blind.
  - **Steps:**
    1. Log `play()` rejections, plus `video.paused` and `readyState` after start.
    2. Reproduce: pause on Live, resume on Live; pause on Live, switch to Stats, resume, return.
    3. Verify the MP1 fix covers it; otherwise fix the actual cause.
  - **Done when:** pause/resume in any view order brings back a live preview within 2 s.
- [x] **MP3 (precision, A) True head pose.** (@Kacper, branch `kacper/posture-precision`: `core/headPose.ts`, pitch → head-forward, yaw gates distance/twist; roll verified on a 14°-rotated real photo)
  - Enable `outputFacialTransformationMatrixes: true` in FaceLandmarker and decompose the matrix into **pitch/yaw/roll in degrees**.
  - Use pitch for forward head and nodding (today it's an indirect nose-to-shoulder proxy), and yaw for "turned away / looking at a second screen".
  - Unit-test the decomposition with a known matrix.
- [ ] **MP4 (precision, A) Higher camera resolution:** 1280×720 instead of 640×480 (eyes get ~2× the pixels, which helps blinks and glasses). Measure FPS on the M2 and keep the 25 fps face loop; fall back to 640 if slower.
- [x] **MP5 (precision, A) Better pose model:** `pose_landmarker_full` instead of `lite` (more stable shoulders and ears). (@Kacper, branch `kacper/posture-precision`; pose rate kept at 8 Hz until A2 FPS is measured on the demo laptop)
  - Bundle it per A1.
  - Tune `minPoseDetectionConfidence`, `minPosePresenceConfidence` and `minTrackingConfidence` (0.6).
  - If FPS allows, raise the pose rate from 8 Hz (`POSE_INTERVAL_MS = 125`) to ~15 Hz.
  - **Done when:** the score jitter while sitting still is lower than before (measure the std-dev over 30 s).
- [ ] **MP6 (glasses, A) Blink/PERCLOS that works with glasses.**
  - Today `EyeAnalyzer` takes `max(EAR-based closure, blendshape eyeBlink)`, with closed = `0.35 × open reference`. Glasses glare corrupts the EAR landmarks.
  - **Steps:**
    1. Record 2 people with glasses + 2 without, 60 s each, counting blinks by hand.
    2. Compare the EAR-only and blendshape-only counts.
    3. Add **glasses mode**: auto-detected when EAR is noisy or barely bimodal, or set as a checkbox in settings. It weights blendshapes higher and uses an adaptive threshold from rolling percentiles.
    4. Add "blink 5 times" to calibration to learn each user's blink amplitude.
  - **Done when:** the blink count is within ±20% of the manual count for every tester, glasses included (Rytm A1 criterion).
- [x] **MP7 (wow, C) MediaPipe-style overlay** (@Mateusz, PR #78, approved by mentors): violet eyelid contours + dots and irises that visibly close on blinks + live blink rate label; subtle face oval/brows/lips; glowing lime upper-body skeleton with pink joints; overlay frames at face rate (25 Hz, `analyzer.ts`). Also: Windows tray icon shows the live posture score.
  - `FaceLandmarker.FACE_LANDMARKS_TESSELATION` in thin cyan at ~0.35 alpha.
  - `FACE_LANDMARKS_FACE_OVAL`, `_LIPS`, `_LEFT_EYE`, `_RIGHT_EYE`, `_LEFT_IRIS`, `_RIGHT_IRIS` bright, with glow (`shadowBlur`).
  - Video darkened behind it; a blink ripple on the eyes.
  - Toggle plus a "demo intensity" setting. Keep ≥ 24 fps.
- [ ] **MP8 (wow, C) Colourful body strands, like Google's hand-tracking demo.** (DROPPED by Mateusz: the 33-point pose has only ~11 face points, so face strands looked like a moustache; the face web is MP7 / FaceLandmarker tessellation. Kacper is on visuals. Code kept on local branch `mateusz/mp8-color-strands`.)
  - Use the upper-body `PoseLandmarker.POSE_CONNECTIONS` (face, shoulders, arms, torso): each chain gets its own colour (e.g. face cyan, left arm magenta, right arm lime, torso violet), with gradient strokes, glowing joint dots, and thickness by depth (z).
  - Fewer strands than the hand demo, but vivid.
  - The posture-state colour still drives the spine line. Keep the existing angle labels and the ideal-head ring.
- [x] **MP9 (wow + feel, C) Smooth overlay.** (@Mateusz, PR #80: overlay drawn on rAF at display rate; skeleton follows pose via `core/landmarkFollower.ts`, tau 70 ms; eyes unsmoothed)
  - Today the overlay redraws only on pose ticks (8 Hz), so it looks choppy.
  - Draw on `requestAnimationFrame`, interpolating between the last two landmark sets (or One-Euro smoothing per point, see `core/oneEuro.ts`), so strands move fluidly at 60 fps while detection stays at 8–15 Hz.
- [ ] MP10 (WON'T unless time) Hand landmarker (e.g. phone in hand or hand on face). It costs FPS and isn't in the pitch story.

## Area B: Health data, decisions & care (owner: Marcin, author of Rytm's decisions, doctor report and NFZ path)
- [ ] B1 (M5) **Doctor report screen** (Polish): 14-day summary, dominant issues, fatigue trend, what the user already tried, "questions for your doctor". Print to PDF.
- [ ] B2 (M5) **NFZ path card:** when to see a GP vs a physio vs an eye doctor; the TIP 800 190 590 info line; red flags → 112. Wording reviewed against ENGINEERING §4 (no diagnoses). Port from `docs/archive-rytm/`. (@Marcin, in progress)
- [ ] B3 (M3) Show "why now" (A3 output) in notifications and the break screen.
- [x] B9 (M3) „Dlaczego X%?” under Zmęczenie on the live view (for the jury): the 6 fatigue components with weight, current value, norm and a penalty bar (green/amber/red), collapsed by default. `FatigueSnapshot` gains `components`, `postureAvg15`, `minutesSinceBreak` (additive, test). (@Marcin; new `renderer/fatigueWhy.ts`, 3 lines in `views/live.ts`, `core/fatigue.ts` + `shared/types.ts` additive, `styles.css`)
- [x] B10 Presentation mode (Ustawienia → Prezentacja, session only): simulated fatigue ramps up over ~45 s (blinks → 3/min, PERCLOS → 20%, long blinks → 2.5/min, +3 yawns; posture and time stay real), 8 s smoothing instead of 60 s, „SYMULACJA” badge + „(symulacja)” in „Dlaczego?”, simulated fatigue is never saved to the DB. `core/fatigue.ts` `simulateTired` + test. (@Marcin; `analyzer.ts` (A), `views/settings.ts`, `views/live.ts`, `fatigueWhy.ts`)
- [x] B11 Settings: „Podgląd powiadomień” (Kacper's preview buttons) is hidden and appears right under „Tryb prezentacji” only while presentation mode is on. (@Marcin; `views/settings.ts`, 1 line in `styles.css`)
- [ ] B4 (S2) AI coach (optional, opt-in): main-process call to the Claude API with **numbers only**; daily summary + one action; a canned fallback offline. Key from `.env`, never in the renderer.
- [ ] B5 (S3) Team view: an anonymous aggregate of our 4 people's hackathon data (export/import JSON); powers the pitch hook.
- [ ] ~~B6~~ CUT (ROADMAP §1). B6 (S4) Phone health import (Apple Health / Samsung export) into steps/sleep, only if cheap. Port from Rytm.
- [ ] ~~B7~~ CUT (ROADMAP §1). B7 (C) A "what if" screen (e.g. "if you took breaks every 50 min, your afternoon energy would be X"). Port from Rytm.

## Area C: UI, wow visuals & design (owner: Mateusz)
- [ ] C1 (M2) → **merged into MP7** (same task, do it there). **Neon face mesh** in the live view: `FaceLandmarker.FACE_LANDMARKS_TESSELATION` thin cyan lines + bright contours/irises with a glow; video darkened behind it. Toggle in settings.
- [ ] C2 (M2) **Neon skeleton:** shoulders/neck/head in magenta, the ear–shoulder angle arc, a dotted "calibrated posture" ghost.
- [ ] C3 (M2) Blink ripple on the eyes; the colour shifts green → amber → red with the score.
- [ ] C4 (M6) **Demo-mode intensity** (hotkey): brighter glow, bigger numbers for the projector.
- [ ] C5 (S1) → **live-view part in Kacper's PR #74**; remaining: tray widget + prediction badge. The energy / battery widget: a big animated number + a sparkline + the prediction badge, in the live view and the tray widget.
- [x] C6 (M4) Break screen: „Kamera sprawdza” counter next to the timer (reps or seconds per side, progress bar, cue, „Nie widzę Cię”), ✓ animation, auto-credit 1.4 s later. No video preview (shared <video>, FEEDBACK „Not now”). (@Marcin; `overlays.ts`, `styles.css` (C))
- [x] C23 Animated exercise figures: all 8 stick figures show the movement in a loop (CSS keyframes; moving body part in accent colour, dashed ghost = start position). Always playing on the break screen, on hover/focus in the Ćwiczenia list; off with „reduce motion”. (@Marcin; `figures.ts`, `styles.css` (C))
- [ ] C7 Visual pass on all views (live, stats, exercises, settings) against ENGINEERING §8: one palette, typography, the projector test.
- [ ] C8 A calm empty/error state for every view (no face, camera busy, no data yet).
- [x] C10 Quick glance (@Mateusz): live posture score next to the tray icon (macOS), tray quick menu (state, Bateria + forecast, fatigue, time since break; break now, pause 30 min), widget remembers its position, dev auto-reload. **Next:** widget nudges (20-20-20 countdown, stretch [Start]/[Za 5 min], „Cofnij brodę”).
- [x] C11 Two mini-widget styles (@Mateusz): **Karta** (score, state, fatigue) or **Pigułka** (dot + number, theme colours, fades when posture is good); chosen in Settings or tray → Mini-widget; click opens Postura, drag moves it (position remembered). Windows check pending (Marcin).
- [x] C13 Calm nudges (@Mateusz): break and posture reminders as a small panel next to the widget (or top-right): 20-20-20 with a 20 s countdown (counts as an eye break), micro/move break with [Start] / [Za 5 min], posture tip that hides once posture is good; thin timeline instead of blinking, small „×”; doesn't steal focus. Settings: corner vs system notifications. Dev/demo tray trigger „Pokaż przypomnienie (test)”.
- [x] C16 Posture figure in the live panel (mentor F3, part of F1): an animated SVG figure under Bateria mirrors the top issue (slouch → rounded back, head forward/down → head down and forward, too close → leaning to the screen; front view for head tilt, shoulder tilt, twist) with one correction arrow; colour = state; one tip sentence. Break block reduced to one line; "od ostatniej przerwy" moved to Szczegóły. (@Marcin; new `renderer/postureFigure.ts`, `views/live.ts`, `styles.css`)
- [x] C12 Card widget: long state/fatigue text ends with an ellipsis instead of overflowing. (@Marcin; 2 lines in `styles.css`)
- [x] C17 Side menu: camera icon for „Na żywo”, gear icon for „Ustawienia” (svgrepo.com); the rail button „Wstrzymaj” becomes „Kalibruj” (opens calibration, resumes analysis if paused; pause stays in the tray menu). (@Marcin; `renderer/app.ts`)
- [x] C18 Live „Szczegóły pomiaru”: „Oczy” as label/value rows like the deviation list; „Skalibruj ponownie” in its own footer (divider, full width) instead of hanging under the last bar; chevron moved right so the title and content share one left edge, smaller sub-headings with their rows indented under them, tighter gap under the title. (`views/live.ts`, `styles.css`)
- [x] C21 Stats: remove the „Godziny formy” chart from the Zmęczenie tab (user decision; best hours stay in the core). (@Marcin; `views/stats.ts`, `styles.css`)
- [x] C22 Settings: remove „Powiadamiaj tylko w godzinach pracy”, „Początek/Koniec pracy” and „Tempo pracy z klawiatury i myszy”; both options are forced off at start so a previously enabled one cannot keep working without a switch (end-of-day summary keeps the default 17:00). (@Marcin; `views/settings.ts`, 1 line in `main.ts`)
- [x] C19 Live details polish: deviations without „−0”/„-0°” (one typographic minus), button says „Skalibruj” until the first calibration (stays full width), no auto-scroll on opening (it cut off the top of the panel), footer pinned to the panel bottom so the button is never cut off, chevron drawn with CSS borders (not read by screen readers). (`views/live.ts`, `styles.css`)
- [x] C20 Minimal Stats, bars only, two tabs: **Postawa** (good posture %, average score, alerts; top 3 issues) and **Zmęczenie** (fatigue %, breaks vs BHP minimum, time at desk). A range select replaces the „Dziś” heading: Dziś (bars by hour, ↑/↓ vs yesterday) / Ostatnie 3 dni / 7 dni / Ostatni miesiąc (one bar per day). Bar colour = good (green) / needs work (amber), details on hover. Core: `buildStats` adds `last30` (day averages + breaks/alerts per day, test), `main.ts` passes 30 days of samples and break/alert times. (@Marcin; `views/stats.ts`, stats part of `styles.css` (C), `core/insights.ts` (A), `shared/types.ts` + `main.ts` (integration))
- [x] C14 Stats "Dziś": breaks (dashed line + dot) and posture alerts (▲) on the day chart, 70% fatigue line, legend; norms and "vs wczoraj" under every figure; caption explains fatigue gaps (no eye data). (@Marcin; `views/stats.ts`, `core/insights.ts` yesterday averages, `db.eventTimes`, 3 lines in `main.ts`, `types.ts`)
- [x] C15 Stats "Ostatnie 7 dni": two column charts (average fatigue, time in good posture), today highlighted, hover/focus tooltip, screen-reader table, "Najwyższe zmęczenie: …" insight. (@Marcin; `views/stats.ts`, `core/insights.ts` `last7`)
- [ ] C9 Screenshot pack at 1920×1080 for the slides + a 10 s clip of the neon overlay for the video intro.

## Area D: Pitch, video, submission & ops (owner: Bartłomiej, plus everyone for testing)
- [ ] D1 **NOW:** Discord: confirm the **deadline** (11:00 vs 23:00), **dual entry** (Sport & Healthcare + AI), and **AI allowed in the REENTRY CTF**. Post the answers in team chat + update CLAUDE.md.
- [ ] D2 Visit the Sport & Healthcare mentors with a 30 s pitch; write down what they react to; repeat at about 20:00 with the live demo.
- [ ] D3 Verify the BHP screen-work regulation (5-min break per hour, employer duties) for the business slide; note the exact source.
- [ ] D4 2–3 credible stats with sources (back/neck pain among office workers, eye strain, screen time in Poland).
- [ ] D5 The 3-min pitch script, Polish + English (beats in SCOPE §4), timed.
- [ ] D6 Slides, at most 10: Problem → Insight → Wow shot → How it works → 4 pillars → Care path → Privacy → vs Straighty/Rest & Blink → Business → Team.
- [ ] D7 The 3-min video: storyboard → screen recordings (demo mode) → voice-over → edit → unlisted YouTube; test the link in incognito. **Done by 08:30.**
- [ ] D8 The HackTribe description (PL + EN, 150–300 words) + `AI_USAGE.md` (with Mateusz).
- [ ] D9 User tests at 18:00, 23:00 and 06:00: try it cold, note 5 confusing things, put them in this file.
- [ ] D10 Submit by 10:00: PDF, repo, video, screenshots (+ the AI task if allowed). Screenshot the confirmation.
- [ ] D11 Rehearse the pitch 3× + the Q&A from `research/BATERIA-vision.md` §7.

## Integration (owner: Mateusz, the repo owner)
- [ ] I1 Merge the PRs at least every 90 min; run `npm start` + `npm run demo` after every merge; revert broken merges within 5 min.
- [ ] I2 (M6) Extend `npm run demo` into a scripted 3-minute story (slouch → alert with "why" → exercise → recovery → stats → doctor report).
- [ ] I3 Package the macOS `.dmg` (+ the Windows exe if a Windows machine is available); test on a clean user account.
- [ ] I4 README: one-command run, the demo command, screenshots, the privacy statement, the pre-existing vs hackathon work.
- [ ] I5 Tag `v1.0-submission`.

## Found issues / notes (anyone can add)
- A4 thresholds (chin tuck 3.5% face-vs-shoulder change, shoulder raise 6% of shoulder width, neck tilt 12°) are set from geometry and synthetic tests, **not yet tuned on real people**: try each verified exercise with 2 people (one with glasses) and adjust `VERIFY_SPECS` in `core/exerciseVerify.ts`.
-
