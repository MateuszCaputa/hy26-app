# PLAN: live task list

> **Order of work = `docs/ROADMAP.md`** (phases + gates). This file is the full backlog.
> Tick `[x]` when done (definition of done: `docs/ENGINEERING.md` §5). Add `(@name, in progress)` when you start a task.
> IDs map to `docs/SCOPE.md` §5 (M = must, S = should, C = could). Areas map to the ownership table in `CLAUDE.md`.
> **Gates:** 16:00 everyone has a branch running · **19:00 the demo path works end to end with M2 + M3** · 23:00 all MUSTs merged · 03:00 polish only · **07:00 FEATURE FREEZE** · 10:00 submitted.

## Area A: Core engine & measurement (owner: Kacper, the Postura author)
- [ ] A1 (M7) Bundle the MediaPipe models + WASM in the app (`resources/`), load them locally, keep the download only as a fallback. Test with wifi OFF.
- [ ] A2 (M1) Measure FPS on the demo laptop with the overlay ON; keep it at 24+ (pose every 2nd frame if needed).
- [ ] A3 (M3) `core/explain.ts`: for each alert/break, produce `{reason, evidence[]}` from the current metrics ("PERCLOS 18% (norm < 10%)", "52 min without a break"). Unit tests.
- [ ] A4 (M4) `core/exerciseVerify.ts`: rep detection for chin tuck (nose–shoulder distance) and shoulder-blade squeeze (shoulder width); min duration and refractory period. Unit tests with recorded landmark fixtures.
- [ ] A5 (M4) A score recovery bonus after a verified exercise (visible in the score/fatigue trend).
- [x] A6 (S1) `core/energy.ts`: one fused 0–100 "energy/battery" from fatigue + posture + time since break + Garmin Body Battery if present; plus a linear prediction "minutes until < 30". Tests. (@Kacper, branch `kacper/energy-simple-ui`: `core/energy.ts` + tests; Garmin Body Battery used when today's entry exists)
- [ ] A7 (M5) `core/carePattern.ts`: detect a persistent pattern (e.g. 10 of the last 14 days with a dominant issue above threshold, or high eye strain) and produce the input for the doctor report.
- [ ] A8 Record 2–3 landmark fixture clips (good posture, slouch, tired) for tests + demo mode.
- [x] A10 Posture precision: nose/eyes from the face mesh instead of the pose model, `core/shoulderGate.ts` rejects guessed shoulders (visibility, width/tilt jumps, holds the last good ones), shoulder/head tilt judged vs level (calibration can shift zero by ≤ 3°). (@Kacper, branch `kacper/posture-precision`)
- [x] A12 Simpler first screen (usability): the live view leads with Bateria + one tip + next break, measurements under "Szczegóły pomiaru"; settings split into basic + "Zaawansowane"; keyboard tracking off by default (macOS Accessibility prompt confused new users). (@Kacper, branch `kacper/energy-simple-ui`; touches `views/live.ts`, `views/settings.ts`, `styles.css` (C) and `DEFAULT_SETTINGS` (shared) — Mateusz please review)
- [x] A11 Calibration that survives bad posture: live checks during calibration, two-step (tall + usual slouch) with a personal range, a "you sat straighter than your calibration" hint. (@Kacper, branch `kacper/calibration-guard`; touches `overlays.ts` calibration dialog (C) and one toast in `app.ts`)
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
- [ ] **MP7 (wow, C) Neon face mesh.**
  - `FaceLandmarker.FACE_LANDMARKS_TESSELATION` in thin cyan at ~0.35 alpha.
  - `FACE_LANDMARKS_FACE_OVAL`, `_LIPS`, `_LEFT_EYE`, `_RIGHT_EYE`, `_LEFT_IRIS`, `_RIGHT_IRIS` bright, with glow (`shadowBlur`).
  - Video darkened behind it; a blink ripple on the eyes.
  - Toggle plus a "demo intensity" setting. Keep ≥ 24 fps.
- [ ] **MP8 (wow, C) Colourful body strands, like Google's hand-tracking demo.** (DROPPED by Mateusz: the 33-point pose has only ~11 face points, so face strands looked like a moustache; the face web is MP7 / FaceLandmarker tessellation. Kacper is on visuals. Code kept on local branch `mateusz/mp8-color-strands`.)
  - Use the upper-body `PoseLandmarker.POSE_CONNECTIONS` (face, shoulders, arms, torso): each chain gets its own colour (e.g. face cyan, left arm magenta, right arm lime, torso violet), with gradient strokes, glowing joint dots, and thickness by depth (z).
  - Fewer strands than the hand demo, but vivid.
  - The posture-state colour still drives the spine line. Keep the existing angle labels and the ideal-head ring.
- [ ] **MP9 (wow + feel, C) Smooth overlay.**
  - Today the overlay redraws only on pose ticks (8 Hz), so it looks choppy.
  - Draw on `requestAnimationFrame`, interpolating between the last two landmark sets (or One-Euro smoothing per point, see `core/oneEuro.ts`), so strands move fluidly at 60 fps while detection stays at 8–15 Hz.
- [ ] MP10 (WON'T unless time) Hand landmarker (e.g. phone in hand or hand on face). It costs FPS and isn't in the pitch story.

## Area B: Health data, decisions & care (owner: Marcin, author of Rytm's decisions, doctor report and NFZ path)
- [ ] B1 (M5) **Doctor report screen** (Polish): 14-day summary, dominant issues, fatigue trend, sleep (Garmin), what the user already tried, "questions for your doctor". Print to PDF.
- [ ] B2 (M5) **NFZ path card:** when to see a GP vs a physio vs an eye doctor; the TIP 800 190 590 info line; red flags → 112. Wording reviewed against ENGINEERING §4 (no diagnoses). Port from `docs/archive-rytm/`. (@Marcin, in progress)
- [ ] B3 (M3) Show "why now" (A3 output) in notifications and the break screen.
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
- [ ] C6 (M4) Exercise screen: a guide figure, a rep counter driven by A4, a ✓ animation, the recovery moment.
- [ ] C7 Visual pass on all views (live, stats, exercises, settings) against ENGINEERING §8: one palette, typography, the projector test.
- [ ] C8 A calm empty/error state for every view (no face, camera busy, no data yet).
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
-
