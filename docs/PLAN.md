# PLAN: live task list

> Tick `[x]` when done (definition of done: `docs/ENGINEERING.md` §5). Add `(@name, in progress)` when you start a task.
> IDs map to `docs/SCOPE.md` §5 (M = must, S = should, C = could). Areas map to the ownership table in `CLAUDE.md`.
> **Gates:** 16:00 everyone has a branch running · **19:00 the demo path works end to end with M2 + M3** · 23:00 all MUSTs merged · 03:00 polish only · **07:00 FEATURE FREEZE** · 10:00 submitted.

## Area A: Core engine & measurement (owner: Kacper, the Postura author)
- [ ] A1 (M7) Bundle the MediaPipe models + WASM in the app (`resources/`), load them locally, keep the download only as a fallback. Test with wifi OFF.
- [ ] A2 (M1) Measure FPS on the demo laptop with the overlay ON; keep it at 24+ (pose every 2nd frame if needed).
- [ ] A3 (M3) `core/explain.ts`: for each alert/break, produce `{reason, evidence[]}` from the current metrics ("PERCLOS 18% (norm < 10%)", "52 min without a break"). Unit tests.
- [ ] A4 (M4) `core/exerciseVerify.ts`: rep detection for chin tuck (nose–shoulder distance) and shoulder-blade squeeze (shoulder width); min duration and refractory period. Unit tests with recorded landmark fixtures.
- [ ] A5 (M4) A score recovery bonus after a verified exercise (visible in the score/fatigue trend).
- [ ] A6 (S1) `core/energy.ts`: one fused 0–100 "energy/battery" from fatigue + posture + time since break + Garmin Body Battery if present; plus a linear prediction "minutes until < 30". Tests.
- [ ] A7 (M5) `core/carePattern.ts`: detect a persistent pattern (e.g. 10 of the last 14 days with a dominant issue above threshold, or high eye strain) and produce the input for the doctor report.
- [ ] A8 Record 2–3 landmark fixture clips (good posture, slouch, tired) for tests + demo mode.
- [ ] A9 Document every formula in the README's "Jak liczona jest ocena" (how the score is computed), updated for A3–A7.

## Area B: Health data, decisions & care (owner: Marcin, author of Rytm's decisions, doctor report and NFZ path)
- [ ] B1 (M5) **Doctor report screen** (Polish): 14-day summary, dominant issues, fatigue trend, sleep (Garmin), what the user already tried, "questions for your doctor". Print to PDF.
- [ ] B2 (M5) **NFZ path card:** when to see a GP vs a physio vs an eye doctor; the TIP 800 190 590 info line; red flags → 112. Wording reviewed against ENGINEERING §4 (no diagnoses). Port from `docs/archive-rytm/`.
- [ ] B3 (M3) Show "why now" (A3 output) in notifications and the break screen.
- [ ] B4 (S2) AI coach (optional, opt-in): main-process call to the Claude API with **numbers only**; daily summary + one action; a canned fallback offline. Key from `.env`, never in the renderer.
- [ ] B5 (S3) Team view: an anonymous aggregate of our 4 people's hackathon data (export/import JSON); powers the pitch hook.
- [ ] B6 (S4) Phone health import (Apple Health / Samsung export) into steps/sleep, only if cheap. Port from Rytm.
- [ ] B7 (C) A "what if" screen (e.g. "if you took breaks every 50 min, your afternoon energy would be X"). Port from Rytm.

## Area C: UI, wow visuals & design (owner: Mateusz)
- [ ] C1 (M2) **Neon face mesh** in the live view: `FaceLandmarker.FACE_LANDMARKS_TESSELATION` thin cyan lines + bright contours/irises with a glow; video darkened behind it. Toggle in settings.
- [ ] C2 (M2) **Neon skeleton:** shoulders/neck/head in magenta, the ear–shoulder angle arc, a dotted "calibrated posture" ghost.
- [ ] C3 (M2) Blink ripple on the eyes; the colour shifts green → amber → red with the score.
- [ ] C4 (M6) **Demo-mode intensity** (hotkey): brighter glow, bigger numbers for the projector.
- [ ] C5 (S1) The energy / battery widget: a big animated number + a sparkline + the prediction badge, in the live view and the tray widget.
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
