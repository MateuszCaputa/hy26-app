# SCOPE: what we're building, for whom, and what wins

> Read this first. The questions it answers: **what are we shipping, what is already done, what is missing to win, and what we are NOT doing.**
> Task list: `docs/PLAN.md` · Quality bar: `docs/ENGINEERING.md` · Workflow: `docs/TEAM.md` · Background research: `research/`

## 1. Product in one breath
**Postura**: a desktop app for people who work at a computer. The webcam, analysed **fully on-device** with MediaPipe, watches posture, blinking/PERCLOS, yawns and head droop. Keyboard/mouse tempo and Garmin sleep/stress add context. Together they become **decisions in the moment**: "fix this now", "take this break now, because…". It also finds your best and worst hours. Nothing visual ever leaves the machine.

**Codebase:** Kacper's Postura (current `main`). It absorbs the best ideas of Marcin's Rytm (tag `backup/rytm-marcin`, archived plan in `docs/archive-rytm/`).

## 2. Who judges us and how
- **Task:** HackYeah 2026 **Sport & Healthcare** (open task, 8,000 PLN, **one winner**). Also **Artificial Intelligence** if Discord confirms dual entry.
- **Brief, in their words:** "combine **sport, physical health, mental wellbeing and access to healthcare**… not only monitor the body's parameters, but **help users make better decisions** about their health and lifestyle."
- **Scoring:**

| Criterion | Weight | What it means for us |
|---|---|---|
| Idea & Innovation | 30% | Must be visibly NEW vs Straighty (2024 posture winner) and Rest & Blink (2025 eye winner) |
| Relation to category | 20% | Hit **all 4 pillars** explicitly, on screen and on a slide |
| Usability | 20% | Zero-friction onboarding, calm alerts, Polish UI |
| **Design (visual)** | **20%** | The wow shot. It has to look like nothing else in the hall. |
| Completeness | 10% | Everything shown actually works, plus an installer, a demo mode and tests |

- **Phase 1** is a paper review by 3+ mentors (description + PDF of up to 10 slides + repo + video/demo). **You need at least 50% to reach the pitch.** **Phase 2** is a live pitch to the jury.
- **Deadline:** ⚠️ unconfirmed. **Plan for Sunday 11:00.** Feature freeze 07:00.

## 3. The four pillars: where Postura stands
| Pillar | Already in Postura ✅ | Missing to win ❌ |
|---|---|---|
| **Sport / movement** | 8 exercises picked for your top issue, break engine (20-20-20, micro, movement, adaptive) | **Camera-verified exercises** (the rep counter sees you do it, then your score recovers) |
| **Physical health** | Posture score 0–100 vs calibration, 7 issues, alerts with hysteresis, distance to screen | The **visible wow overlay** (neon face mesh + skeleton), see §5 |
| **Mental wellbeing** | Fatigue index (PERCLOS, blinks, long blinks, yawns, head droop, time since break), best hours, Garmin sleep/stress/Body Battery/HRV | **Prediction:** "your energy will drop in ~40 min", plus one fused "battery" number people instantly get |
| **Access to healthcare** | – | **"Report for the doctor" + NFZ path:** after a persistent pattern (e.g. 14 days of neck strain or eye strain), a 1-page summary to show a GP/physio, with links to NFZ / TIP 800 190 590. Red flags → 112. **No diagnoses.** (From Rytm.) |
| *Decisions (the brief's core verb)* | "One tip right now", ergonomic tip of the week | **"Why now" explanations** on every nudge ("break now: blinks −40%, PERCLOS 18%, 52 min without a break"), plus an optional **AI coach** summary (numbers only) |

## 4. What wins the room (the 3-minute story)
1. **Hook:** "We measured our own team for the 24 hours of this hackathon." Show real team data. (Rytm idea: our data is the proof.)
2. **Wow shot:** the presenter sits down, and a **neon face mesh + skeleton** lights up on the projector. Then a slouch: the score drops, the fatigue rises, the widget turns amber.
3. **Decision:** "Break now, because…" → a 60 s exercise the **camera verifies** → the score visibly recovers.
4. **Prediction & rhythm:** the heat map of best hours. "You crash at 14:00 every day", plus the Garmin sleep effect.
5. **Access to care:** the 14-day pattern → the doctor report PDF + NFZ path. "We don't diagnose; we get you to the right person sooner."
6. **Privacy:** "0 bytes of video left this laptop." Plus the business case: the Polish BHP rules on screen-work breaks give a B2B, anonymous team view.
7. **Close:** one line on why we're different from posture apps and eye apps.

Full pitch beats, judge Q&A and the wow visual spec: `research/BATERIA-vision.md` §1, §7.

## 5. Scope: Must / Should / Could / Won't
**MUST (demo breaks without these):**
- M1 Live camera analysis (✅ done). Keep it rock-solid at 24+ FPS on the demo laptop.
- M2 **Neon visual overlay**: face tessellation + skeleton with glow, in the live view and as a demo-mode intensity. *(Design 20%)*
- M3 **"Why now" explanations** on alerts and breaks.
- M4 **Camera-verified exercise** for at least 2 exercises (chin tuck, shoulder blades), with the score recovery shown.
- M5 **Doctor report + NFZ path** (one screen + PDF/print), triggered by a persistent pattern (seeded demo data allowed, clearly labelled).
- M6 **Demo mode** that drives the whole story in 3 minutes (`npm run demo` exists; extend it). Must work **offline**.
- M7 **Models bundled locally** (today they download on first run, which is a stage risk without wifi).
- M8 Pitch package: PDF of up to 10 slides, a 3-min video, the HackTribe description, screenshots.

**SHOULD:**
- S1 One fused **"Bateria / energy" number** + a short-term **prediction** line.
- S2 **AI coach** (Claude, numbers only, opt-in), a daily/weekly summary. Needed if we enter the AI category.
- S3 Team view (anonymous aggregate of our 4 people), which powers the hook and the B2B slide.
- S4 Phone health import (Apple Health / Samsung export file). From Rytm. Only if cheap.

**COULD:** a "what if" screen (Rytm), particles/celebration on recovery, a web build for the jury link (Electron-only is acceptable if the video is great).

**WON'T (explicitly):** emotion recognition (EU AI Act art. 5), diagnoses, cloud video, accounts/login, mobile app, a rewrite of the core, new frameworks.

## 6. Definition of "ready to submit"
- [ ] Fresh clone → `npm install && npm start` works on macOS (and the Windows exe if possible)
- [ ] Demo mode runs the full 3-minute story offline, twice in a row, without a crash
- [ ] All MUST items checked in `docs/PLAN.md`
- [ ] `npm test` and `npm run typecheck` are green
- [ ] Video uploaded, PDF exported, HackTribe form filled, links tested in incognito
- [ ] `AI_USAGE.md` lists the AI tools used and what was pre-existing (Kacper's prototype) vs built at HackYeah
