> **Reference only.** The authoritative plan for the app is the repo's own `CLAUDE.md` + `docs/PLAN.md` + `docs/PODZIAL-PRACY.md` (app name: **Rytm**). This file is the earlier "Bateria" vision: use it for wow ideas, pitch beats, judge Q&A and differentiation, not as the task list.

# Bateria: build plan (draft, to be moved into the repo as CLAUDE.md + docs once the friend's code is pushed)

## One-liner
**PL:** „Bateria — kamerka mówi ci, ile energii ci zostało i kiedy padniesz, zanim to poczujesz."
**EN:** Your webcam tells you how much energy you have left, and when you'll crash, before you feel it.

## Target
- **HackYeah 2026 Sport & Healthcare** (open task, 8,000 PLN, 1 winner).
- Plus **Artificial Intelligence** if Discord confirms dual entry.
- **Scoring:**

| Criterion | Weight |
|---|---|
| Idea & Innovation | 30% |
| Relation to Category | 20% |
| Usability | 20% |
| **Design** | **20%** |
| Completeness | 10% |

- Phase 1 is a paper review (PDF of up to 10 slides, description, repo, demo link, video). **You need at least 50% to reach the pitch.**
- **Deadline: Sunday 11:00 on HackTribe. Feature freeze 07:00.**

## Differentiation (say it on stage)
- **Straighty (2024 winner):** posture only, reminders, yoga, stats.
- **Rest & Blink (2025 winner):** eye exercises with look-away verification.
- **Bateria fuses eyes, posture and fatigue into ONE predictive energy score.** It **predicts** the crash instead of reacting to it, and **verifies recovery** with the camera.
- It covers all four pillars of the brief:
  - sport: micro-exercises verified by the camera
  - physical health: posture and eyes
  - mental wellbeing: fatigue trend
  - access to care: a weeks-long pattern suggests an NFZ physio or eye doctor
- **Privacy:** video never leaves the device. Only numbers go to the AI.

## Stack
- **Electron + Vite + React + TypeScript** (electron-vite). The same renderer is deployable as a **web build** (Vercel) for the jury demo link.
- **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision`):
  - FaceLandmarker (478 points including the iris, plus blendshapes for blink and jaw-open)
  - PoseLandmarker (33 points)
  - runs on the GPU delegate in the renderer
- Visuals: Canvas 2D or WebGL (Three.js / PixiJS) for the glowing mesh, Framer Motion for UI, Tailwind.
- Storage: local (IndexedDB / electron-store). No backend needed.
- AI coach: the Claude API with numbers only (Haiku 4.5 for cheap, frequent calls). The key is kept in the Electron main process, **never in the renderer or the web build**. The web build uses a tiny serverless proxy or canned answers.

## Metrics engine (Dev 1)
| Signal | Method | Notes |
|---|---|---|
| Blink rate | Blendshapes `eyeBlinkLeft/Right` > threshold, or EAR from landmarks | Normal is about 15–20 per minute; it drops when staring at a screen |
| **PERCLOS** | Fraction of time with eyes over 80% closed, in a rolling 60s window | The standard drowsiness metric |
| Yawn | `jawOpen` blendshape held for more than 1.5s | |
| Head nod / droop | Head pitch from the face transform matrix | |
| Screen distance | Iris diameter in pixels to cm (iris is about 11.7 mm) | "Too close" warning |
| Posture | Pose: ear–shoulder angle (forward head), shoulder tilt, torso lean, compared with a calibrated baseline | **Calibration step** at start ("sit up straight for 3s") |
| **Battery 0–100** | Weighted decay model: base drain per minute, plus penalties (low blinks, PERCLOS, yawns, slouch, too close), plus recovery bonus (verified break or exercise) | Simple and explainable. Tune the weights live. |
| **Crash prediction** | Linear or exponential fit on the last 15 min of the battery, giving "below 20% in N min" | The wow line |

**Contract:** `type Metrics = { ts, blinkRate, perclos, yawns, headPitch, distanceCm, postureScore, battery, predictedCrashMin }`, emitted by `useMetrics()` at about 10 Hz. **Freeze this contract first**, so Dev 2 and Dev 3 can build against a mock.

## Wow visuals (Dev 2)
- A neon **face mesh plus pose skeleton** overlay (glow, gradient lines, a pulse on blink) on a dark sci-fi HUD.
- **A big animated battery** in the centre. Colour shifts green → amber → red.
- Particle burst on recovery.
- **Corner widget mode:** a frameless, always-on-top, translucent Electron window showing the mini battery plus a posture line. Click to expand into the full HUD.
- A "demo mode" toggle that exaggerates the effects for the stage.

## App around it (Dev 3 = repo owner/integrator)
- Onboarding plus posture calibration.
- **Break and exercise flow:**
  - at a low battery or a predicted crash, a 1–2 minute exercise is proposed (neck rolls, shoulder blades, 20-20-20 eyes)
  - **the camera verifies it was done**, then the battery recharges
- Day timeline and a 7-day chart, with the hour when the battery usually crashes.
- **AI coach** (Claude, numbers only): a daily summary and one concrete action. If the pattern lasts weeks, suggest a professional (NFZ physio or eye doctor link).
- System notifications (Electron).
- Settings, and a privacy screen ("0 bytes of video leave your device").
- Web build deployed for the jury link.

## Person 4 (non-dev)
1. **NOW:**
   - Discord: can one project enter **Sport & Healthcare plus AI**?
   - Discord: is **AI allowed in REENTRY CTF**?
   - Is the deadline 11:00?
2. Verify the Polish **BHP rule: a 5-minute break per hour of monitor work** (the screen-work regulation). It's the B2B slide: an anonymous team dashboard for employers.
3. Slides (up to 10), the **3-minute video**, the HackTribe submission text, screenshots.
4. User-tester every 2–3h. Rehearse the pitch.

## Timeline (Saturday about 14:00 → Sunday 11:00)
| Time | Milestone |
|---|---|
| 14:00–15:00 | Repo set up: electron-vite scaffold, deps installed once, CLAUDE.md, `Metrics` contract plus mock, 3 worktrees |
| 15:00–19:00 | Dev 1: face and pose metrics live. Dev 2: neon overlay plus battery. Dev 3: shell, widget window, calibration, storage. |
| **19:00** | **GATE: end-to-end demo works** (camera → metrics → battery → overlay → widget). If not, cut extras. |
| 19:00–01:00 | Prediction, exercise verification, AI coach, history, web build deployed, polish |
| 01:00–06:00 | Sleep in shifts. Polish and bugfixes. |
| **07:00** | **Feature freeze.** Then video, slides, README, demo rehearsal. |
| 10:00 | Submit (target). **11:00 hard deadline.** |

## Cut list (in order, if behind)
Particles → 7-day chart → AI coach (use canned text) → yawn/nod → web build (use video instead). **Never cut:** the neon overlay, the battery, calibration, the corner widget.

## Parallel Claude workflow
- One repo. `main` is protected by convention; only the integrator merges.
- Worktrees: `wt/engine`, `wt/visuals`, `wt/app`.
- **Run `pnpm install` once before branching**, to avoid lockfile conflicts. Nobody adds dependencies without telling the integrator.
- Shared files: `src/shared/contract.ts` (Metrics type) and `src/shared/mock.ts` (fake metrics stream). Changes go only through the integrator.
- Each dev's Claude session gets CLAUDE.md, which contains the scoring, scope, contract and "never cut" list.
- Merge every 1.5–2h. Run the app after every merge.
