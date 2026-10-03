> **Reference only.** The authoritative plan for the app is the repo's own `CLAUDE.md` + `docs/PLAN.md` + `docs/PODZIAL-PRACY.md` (app name: **Rytm**). This file is the earlier "Bateria" vision: use it for wow ideas, pitch beats, judge Q&A and differentiation, not as the task list.

# ⚡ BATERIA — mission file

> **PL:** „Kamerka mówi ci, ile energii ci zostało — i kiedy padniesz, zanim to poczujesz."
> **EN:** Your webcam tells you how much energy you have left, and when you'll crash, before you feel it.

**HackYeah 2026 · Sport & Healthcare (+ Artificial Intelligence if dual entry is confirmed)**
**Deadline: Sunday 4 Oct, 11:00 (HackTribe). Feature freeze: 07:00. Target submit: 10:00.**
**Owner / integrator: Marcin.** Nobody merges to `main` except Marcin.

---

## 0. Why we win (read this before writing a single line)

| What judges have seen before | What they've never seen |
|---|---|
| **Straighty (won 2024):** posture reminders | **One energy score** fused from eyes, posture and fatigue |
| **Rest & Blink (won 2025):** eye exercises | **Prediction:** "you'll crash in 38 min", *before* you feel it |
| Generic "take a break" timers | **The camera verifies your recovery**, and the battery visibly recharges |
| Webcam apps that upload video | **0 bytes of video leave the device**, proven on screen |
| A demo in a browser tab | **A living widget in the screen corner**, always on top, like an OS feature |

**Scoring:**

| Criterion | Weight | How Bateria takes it |
|---|---|---|
| Idea & Innovation | 30% | Predictive, fused, verified recovery |
| Relation to category | 20% | Covers all **4 pillars** of the brief: sport (verified micro-exercises), physical health (posture and eyes), mental wellbeing (fatigue trend), access to care (weeks-long pattern → NFZ physio or eye doctor) |
| Usability | 20% | Zero setup: a 3-second calibration, then it lives in the corner |
| **Design** | **20%** | Neon HUD, Instagram-grade face mesh. Nobody else will look like this. |
| Completeness | 10% | Desktop app + web demo + AI coach + history, all working |

---

## 1. The end result: what exists on Sunday 10:00

### 1.1 The corner widget (always on top, translucent, draggable)
```
                                              ┌──────────────────────┐
                                              │ ⚡ 73%   ▁▂▃▅▆▇▆▅▄    │
                                              │ ◉ eyes ok  ◢ posture │
                                              │ crash in ~52 min     │
                                              └──────────────────────┘
```
- Breathing glow: green at 70% and above, amber at 40–69%, red below 40%.
- Slouch for 5s and a thin neon line pulses at the widget's edge.
- Click it and it expands into the full HUD.

### 1.2 The full HUD (THE Instagram shot)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  BATERIA                                   ● LIVE   🔒 0 B video sent         │
│ ┌───────────────────────────────┐   ┌──────────────────────────────────────┐ │
│ │   (webcam, darkened 60%)      │   │              ╭────────╮              │ │
│ │      ✦ neon face mesh ✦       │   │              │  73 %  │  ← huge      │ │
│ │   cyan triangles, iris rings  │   │              │ ██████ │    animated  │ │
│ │      ✦ magenta skeleton ✦     │   │              │ ██████ │    battery   │ │
│ │   shoulders–ears angle arc    │   │              ╰────────╯              │ │
│ │   blink → ripple on the eyes  │   │   ⚠ Crash predicted in 38 min        │ │
│ └───────────────────────────────┘   └──────────────────────────────────────┘ │
│  👁 Blinks 9/min ↓   😴 PERCLOS 14% ↑   🥱 Yawns 3   📏 48 cm   🧍 Posture 62 │
│  ─────────── energy today ───────────  ▇▇▇▆▆▅▅▄▄▃  (prediction dotted ⋯⋯ 20%)│
│  🤖 Coach: "Your energy drops every day around 15:00. Take a 2-min break at   │
│            14:40 — yesterday that kept you above 50% until 17:00."            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 The recovery moment (the emotional peak of the demo)
```
  ⚡ 18% — Time to recharge.  [ Start 90-s reset ]
  ① Roll your neck ×5      ✓ (camera saw it)
  ② Squeeze shoulder blades ×10   ▓▓▓▓▓▓░░ 6/10
  ③ 20-20-20: look far for 20 s   👁 eyes away… 14 s
  ───────────────────────────────────────────────
  ⚡ 18% → 41%   ✨ particle burst, battery refills on screen
```

### 1.4 The 3-minute pitch (the end goal that every task below serves)
| Time | Beat |
|---|---|
| 0:00 | Presenter sits at the laptop. Corner widget shows **⚡ 81%**. "Every one of us in this hall is at ~30% right now. Nobody knows it." |
| 0:20 | Click → full HUD explodes onto the projector: **neon mesh on the presenter's face, skeleton on shoulders.** (The wow shot. Pause 2 s.) |
| 0:40 | Presenter slouches and blinks slowly → posture score drops, PERCLOS climbs, battery drains live, **"Crash predicted in 12 min"**. |
| 1:10 | "Straighty fixed posture. Rest & Blink fixed eyes. **Bateria predicts the crash before you feel it.**" |
| 1:30 | 90-second reset → camera verifies the neck roll → **battery refills with a particle burst**. |
| 2:00 | 7-day chart + AI coach: "you crash at 15:00 every day". Suggests NFZ physio after 3 weeks of neck strain → access to care. |
| 2:30 | 🔒 "Zero bytes of video left this laptop." Business slide: Polish BHP requires a 5-min break per hour of monitor work, so employers get an anonymous team energy dashboard. |
| 2:50 | Close: **"Bateria. Know your energy before it's gone."** |

---

## 2. Architecture
```
Electron main ── creates ──► Widget window (frameless, alwaysOnTop, transparent)
     │                       Full HUD window
     │  IPC: metrics, notifications, Claude coach (API key lives ONLY here)
     ▼
Renderer (Vite + React + TS + Tailwind + Framer Motion)
     ├─ engine/   MediaPipe FaceLandmarker + PoseLandmarker (GPU) → raw signals
     ├─ metrics/  signals → Metrics @10 Hz → battery model → crash prediction
     ├─ visuals/  canvas/WebGL neon mesh, battery, particles, HUD
     ├─ app/      calibration, reset flow, history (IndexedDB), coach UI, settings
     └─ shared/contract.ts + shared/mock.ts   ◄── FROZEN, Marcin-only
Same renderer → `vite build --mode web` → Vercel = demo link for the jury
```

### 2.1 The contract (freeze in hour 1; everyone builds against the mock)
```ts
// src/shared/contract.ts
export type Metrics = {
  ts: number;                // ms epoch
  faceDetected: boolean; poseDetected: boolean;
  blinkRate: number;         // blinks/min, rolling 60 s
  perclos: number;           // 0..1, eyes >80% closed, rolling 60 s
  yawnsLast10Min: number;
  headPitchDeg: number;      // + = looking down
  distanceCm: number | null; // from iris diameter
  postureScore: number;      // 0..100 vs calibrated baseline
  postureIssues: ('forward_head' | 'slouch' | 'shoulder_tilt')[];
  battery: number;           // 0..100
  predictedCrashMin: number | null; // minutes until battery < 20
};
export type Landmarks = { face?: {x:number;y:number;z:number}[]; pose?: {x:number;y:number;z:number;visibility?:number}[] };
export type ExerciseId = 'neck_roll' | 'shoulder_squeeze' | 'eyes_far';
export type ExerciseProgress = { id: ExerciseId; reps: number; target: number; done: boolean };
```
`src/shared/mock.ts` gives a fake `useMetrics()` and `useLandmarks()`: a sine-wave battery, random blinks and a recorded landmark clip. **Visuals and App never wait on Engine.**

---

## 3. Team & rules
| Who | Track | Owns |
|---|---|---|
| **Marcin** | **A: App + integration** | repo, `main`, contract, Electron shell, widget, flows, history, coach, web deploy, merges |
| Dev 2 | **E: Engine** | MediaPipe, every metric, battery model, prediction, exercise detection |
| Dev 3 | **V: Visuals** | neon mesh, skeleton, battery, HUD, widget look, particles, demo mode |
| Person 4 | **P: Pitch & ops** | Discord/rules, BHP fact, mentors, video, slides, submission, testing |

**Rules:**
1. Branch per track (`track/engine`, `track/visuals`, `track/app`), one git worktree each.
2. **Run `pnpm install` once by Marcin before branching.** New dependency? Ask Marcin in chat first; he adds it on `main` and everyone rebases.
3. `src/shared/*` is changed only by Marcin.
4. **Merge every ~90 min.** After every merge Marcin runs the app; if it's broken, it's reverted within 5 min.
5. Every Claude session starts with: *"Read BATERIA.md and CLAUDE.md. You are on track X. Do the next unchecked step."*
6. Check a box `[x]` the moment a step works. **Commit after every 2–3 steps** with the step IDs in the message (`E14 E15: blink rate rolling window`).
7. Stuck for more than 20 min → tell the team and take the fallback written next to the step.

---

## 4. Gates (non-negotiable)
| Time | Gate | If it fails |
|---|---|---|
| **15:30** | Mock app runs in Electron; widget + HUD windows open; contract frozen | Marcin drops everything else |
| **19:00** | **End-to-end:** real camera → real metrics → battery drains → neon overlay → widget updates | Cut: particles, yawn, nod, 7-day chart |
| **23:00** | Prediction + verified reset + coach + web build deployed | Coach → canned text; web → video only |
| **03:00** | Everything polished; demo mode; full dry run recorded as backup | Stop features, polish only |
| **07:00** | **FEATURE FREEZE** | No exceptions |
| **10:00** | Submitted on HackTribe | — |

**Never cut:** neon face mesh, battery, calibration, corner widget, the recovery-refill moment.
**Cut first (in order):** particles → 7-day chart → yawn/nod → AI coach (canned) → web build (video instead) → exercise #3.

---

## 5. Micro-steps

### S: Setup (Marcin, 14:00–15:00), everyone waits for S10
- [ ] S1 Create repo `bateria` (or reuse the posture repo; decide in 5 min after looking at it)
- [ ] S2 `pnpm create @quick-start/electron` (electron-vite, React + TS template)
- [ ] S3 Add Tailwind, Framer Motion, `@mediapipe/tasks-vision`, `zustand`, `idb-keyval`, `@anthropic-ai/sdk` (main process only)
- [ ] S4 `pnpm install`; commit the lockfile
- [ ] S5 Folder skeleton: `src/renderer/{engine,metrics,visuals,app}`, `src/shared`
- [ ] S6 Write `src/shared/contract.ts` (section 2.1)
- [ ] S7 Write `src/shared/mock.ts` (fake `useMetrics` + `useLandmarks`; record a 20 s landmark clip later in E10)
- [ ] S8 Write `CLAUDE.md`: stack, folder ownership, contract rules, "never cut" list, commit style, a link to this file
- [ ] S9 Copy MediaPipe model files (`face_landmarker.task`, `pose_landmarker_lite.task`) into `resources/models/` (offline-safe, no CDN on stage)
- [ ] S10 Push `main`; each dev runs `git worktree add ../bateria-<track> -b track/<track>`
- [ ] S11 Everyone runs `pnpm dev` and sees the template window
- [ ] S12 Add `.env.example` with `ANTHROPIC_API_KEY=`; real `.env` gitignored
- [ ] S13 Add the scripts `dev`, `build`, `build:web`, `lint`
- [ ] S14 If the friend's posture code exists, move its useful logic into `engine/legacy/` for Dev 2 to mine
- [ ] S15 Post the "Gate 15:30" checklist in team chat

### E: Engine (Dev 2)
**Camera & models**
- [ ] E1 `engine/camera.ts`: getUserMedia 1280×720 @30, front camera, hidden `<video>`
- [ ] E2 Permission-denied screen + retry button
- [ ] E3 Load FaceLandmarker (GPU delegate, `outputFaceBlendshapes: true`, `outputFacialTransformationMatrixes: true`, numFaces 1)
- [ ] E4 Load PoseLandmarker lite (GPU, numPoses 1)
- [ ] E5 A single rAF loop running both detectors with `detectForVideo`; skip the frame if the previous one is still running
- [ ] E6 Measure FPS; target ≥24 on the M2; if lower, run pose every 2nd frame
- [ ] E7 Expose `useLandmarks()` in the exact `Landmarks` shape (replaces the mock)
- [ ] E8 Face-lost / pose-lost flags, with 1 s hysteresis
- [ ] E9 Low-light warning (mean frame luminance < threshold)
- [ ] E10 Record a 20 s landmark JSON clip → give it to Marcin for `mock.ts` (realistic mock for V)

**Eyes**
- [ ] E11 Blink detection from blendshapes `eyeBlinkLeft/Right` > 0.5, with a refractory period of 150 ms
- [ ] E12 Fallback: EAR (eye aspect ratio) from landmarks 33/160/158/133/153/144 and 362/385/387/263/373/380
- [ ] E13 Blink event stream (timestamps)
- [ ] E14 `blinkRate` = blinks in the rolling 60 s window
- [ ] E15 PERCLOS: per frame, eyes closed > 80% → rolling 60 s fraction
- [ ] E16 Per-user eye-openness baseline captured during calibration (normalises E15)
- [ ] E17 Screen distance: iris diameter (landmarks 468–477) in px → cm via 11.7 mm, using the camera FOV; calibrate the constant once with a tape measure
- [ ] E18 Smooth the distance with an EMA; emit `null` if no iris

**Face / head**
- [ ] E19 Yawn: `jawOpen` > 0.6 for > 1.2 s → yawn event; count over 10 min
- [ ] E20 Head pitch from the transformation matrix; EMA
- [ ] E21 Nod detection (pitch drops > 15° then recovers within 2 s) → a fatigue signal

**Posture**
- [ ] E22 Pose points: ears (7, 8), shoulders (11, 12), nose (0); skip if visibility < 0.5
- [ ] E23 Forward-head angle: ear–shoulder vector vs vertical
- [ ] E24 Shoulder tilt: the angle of the shoulder line
- [ ] E25 Slouch proxy: shoulder-to-nose vertical distance relative to baseline (shrinks when slouching)
- [ ] E26 Calibration API: `startCalibration()` records 3 s of "sit straight" → stores the baseline (posture + eye openness + distance)
- [ ] E27 `postureScore` 0–100 = weighted deviation from baseline; plus the `postureIssues` list
- [ ] E28 Debounce issues: only flag if they persist for > 5 s

**Battery & prediction**
- [ ] E29 `metrics/battery.ts`: start at 100 (or the stored value for today)
- [ ] E30 Base drain 0.08 per minute of screen time
- [ ] E31 Penalties per minute: blinkRate < 10 (+0.15), perclos > 0.15 (+0.3), a yawn (+1 each), postureScore < 60 (+0.2), distance < 45 cm (+0.1), a nod (+1.5)
- [ ] E32 Recovery: a verified exercise adds a +8 to +15 bonus; no face for > 3 min (an away break) adds +0.5 per minute, capped
- [ ] E33 Clamp 0–100; EMA for display smoothness
- [ ] E34 **Demo multiplier** (×20 drain) behind a flag, so the stage shows change in seconds
- [ ] E35 Prediction: a linear fit over the last 15 min (or last 60 s in demo mode) → minutes until 20%; `null` if rising
- [ ] E36 Assemble the `Metrics` object at 10 Hz; `useMetrics()` replaces the mock
- [ ] E37 Unit tests (vitest) for blinkRate, PERCLOS, battery clamp, prediction maths

**Exercise verification**
- [ ] E38 `neck_roll`: head yaw/pitch completes a circle (4 quadrants visited) = 1 rep
- [ ] E39 `shoulder_squeeze`: the shoulder distance narrows > 8% vs baseline and returns = 1 rep
- [ ] E40 `eyes_far`: face present + gaze/iris shows eyes away from the screen for 20 s (or the face turned > 30°); show the countdown
- [ ] E41 `useExercise(id)` → `ExerciseProgress` stream
- [ ] E42 A false-positive guard: a rep needs a minimum duration of 600 ms
- [ ] E43 Tune all thresholds live with 2 different team members (glasses / no glasses)
- [ ] E44 Performance pass: no GC spikes; reuse arrays; detector call < 30 ms
- [ ] E45 Hand Marcin a `metrics-debug` overlay (raw numbers) for the judges' Q&A
- [ ] E46 Document every formula in `docs/metrics.md` (judges WILL ask "how do you compute fatigue?")

### V: Visuals (Dev 3)
**Design system**
- [ ] V1 Palette: background `#05060A`, cyan `#00E5FF`, magenta `#FF2BD6`, lime `#B6FF3B`, amber `#FFB020`, red `#FF3B5C`; font Inter + JetBrains Mono for numbers
- [ ] V2 Tailwind theme tokens + a glow utility (`drop-shadow` stacks)
- [ ] V3 Base HUD layout (section 1.2) with static mock numbers
- [ ] V4 Subtle animated grid / scanline background (CSS, cheap)

**Neon face mesh (the Instagram shot)**
- [ ] V5 A `<canvas>` overlay matched to the video size; mirror horizontally
- [ ] V6 Darken the video to 40% brightness + slight blur behind the mesh
- [ ] V7 Draw the face tessellation with `FaceLandmarker.FACE_LANDMARKS_TESSELATION` in thin cyan lines, alpha 0.35
- [ ] V8 Draw the contours (lips, eyes, face oval) brighter, alpha 0.9, with `shadowBlur` 12 for the glow
- [ ] V9 Iris rings (468–477): circles with a pulsing glow
- [ ] V10 On a blink event: a ripple ring expands from each eye (300 ms)
- [ ] V11 Depth shading: line alpha by landmark z (closer = brighter)
- [ ] V12 Optional WebGL upgrade (PixiJS / Three.js additive blending) only if canvas looks flat; timebox 45 min

**Skeleton**
- [ ] V13 Pose connections (shoulders, neck to nose, arms) in magenta, thicker
- [ ] V14 Ear–shoulder angle arc with a degree label; green if ok, red if forward-head
- [ ] V15 A "ghost" baseline posture (dotted), so the slouch is visible against it
- [ ] V16 Keypoint dots with a glow; hide those with low visibility

**Battery**
- [ ] V17 Big battery component: SVG body, fill height = battery %
- [ ] V18 Liquid fill animation (a sine wave on top, Framer Motion)
- [ ] V19 Colour interpolation green → amber → red
- [ ] V20 Number counter animates (spring)
- [ ] V21 Low-battery heartbeat pulse below 25%
- [ ] V22 Prediction badge: "⚠ Crash in 38 min" slides in when `predictedCrashMin` < 60

**Metric chips & charts**
- [ ] V23 Five metric chips (blinks, PERCLOS, yawns, distance, posture) with trend arrows
- [ ] V24 A chip flashes red when it crosses a threshold
- [ ] V25 Today energy sparkline + dotted prediction line to 20% (lightweight SVG, no chart lib)
- [ ] V26 7-day chart (bars per hour with a heat colour); cut first if late

**Widget**
- [ ] V27 Widget layout (section 1.1), 280×90, glassmorphism (`backdrop-filter` blur + 1 px neon border)
- [ ] V28 Breathing glow animation, its colour tied to the battery
- [ ] V29 Mini sparkline in the widget
- [ ] V30 Edge pulse when a posture issue persists
- [ ] V31 Hover → shows "click to expand"

**Recovery flow visuals**
- [ ] V32 The reset modal (section 1.3) with a step list
- [ ] V33 Rep progress bar per exercise; a ✓ tick animation
- [ ] V34 An animated guide figure / icon for each exercise (Lottie or simple SVG loop)
- [ ] V35 **Refill moment:** the battery fills from X to Y with a particle burst (canvas particles, 1.2 s)
- [ ] V36 Confetti-lite for completing all 3 exercises

**Polish**
- [ ] V37 Onboarding / calibration screen: a silhouette outline "sit straight… 3, 2, 1" with a scanning line
- [ ] V38 Privacy badge "🔒 0 B video sent" with a live counter that stays 0 (real: count network bytes of frames = 0)
- [ ] V39 Empty / face-lost state: the mesh fades, "Where did you go? 👀"
- [ ] V40 **Demo mode** toggle (hotkey `D`): brighter glow, thicker lines, larger battery
- [ ] V41 Micro-interactions: hover states, focus rings (keyboard accessible)
- [ ] V42 App icon + window title + a splash animation (1 s, logo spark)
- [ ] V43 Screenshot pack for slides: HUD, widget, reset, chart (1920×1080, demo mode)
- [ ] V44 Record a 10 s screen capture of the mesh for the video intro (the Instagram clip)

### A: App + integration (Marcin)
**Electron shell**
- [ ] A1 Main window = full HUD (1280×800, dark, hidden title bar)
- [ ] A2 Widget window: `frame:false, transparent:true, alwaysOnTop:'screen-saver', skipTaskbar, resizable:false`, positioned bottom-right
- [ ] A3 Widget draggable (`-webkit-app-region: drag`) and remembers its position
- [ ] A4 Tray icon: show HUD / show widget / pause / quit
- [ ] A5 Global hotkey `Ctrl+Shift+B` toggles the HUD
- [ ] A6 Camera runs in ONE window only (the HUD, hidden when collapsed); metrics are broadcast to the widget via IPC at 4 Hz
- [ ] A7 `contextIsolation` + a preload exposing a typed API (`window.bateria.*`)
- [ ] A8 macOS camera permission entitlement; test a packaged build early (`electron-builder --mac --dir`)

**State & flows**
- [ ] A9 Zustand store: metrics, calibration, settings, session, exercises
- [ ] A10 First-run onboarding: welcome → privacy promise → camera permission → calibration (calls E26) → done
- [ ] A11 Settings: notification intensity, demo mode, reset today's battery, re-calibrate
- [ ] A12 Pause button (camera off, battery frozen) + auto-pause when the screen locks (powerMonitor)
- [ ] A13 Trigger reset suggestions at battery < 30% or predicted crash < 15 min, with a cooldown of 20 min
- [ ] A14 Reset flow controller: sequence the 3 exercises → call `useExercise` → apply the battery bonus on completion
- [ ] A15 Native notifications (Electron `Notification`) with action "Start reset"
- [ ] A16 Posture nudge: a gentle widget pulse first, a notification only if it persists for > 2 min

**History**
- [ ] A17 Persist a minute-level summary to IndexedDB (`idb-keyval`): battery, posture, blinks, perclos
- [ ] A18 Today timeline query
- [ ] A19 7-day aggregation: average battery per hour → "usual crash hour"
- [ ] A20 **Seed script** generating 7 realistic past days (so the demo chart isn't empty); flag it as demo data in the UI

**AI coach (Claude)**
- [ ] A21 Main-process IPC handler `coach:summary` (the key lives only in main)
- [ ] A22 Prompt: system role = friendly Polish/English energy coach; input = JSON of today + 7-day aggregates (numbers only); output = structured `{headline, insight, action, when}`
- [ ] A23 Model: `claude-haiku-4-5`; `max_tokens` ~400; timeout 8 s
- [ ] A24 Cache the response per hour; offline/failed → a canned fallback from rules
- [ ] A25 "Access to care" rule: if posture issue minutes > X/day for 14+ days in the data → a card suggesting a physio / eye exam (an NFZ info link), worded as **"consider"**, never a diagnosis
- [ ] A26 Language toggle PL/EN for the coach + UI strings (simple dictionary)

**Web build (jury demo link)**
- [ ] A27 `build:web`: the renderer only, the Electron APIs shimmed (`window.bateria` mock)
- [ ] A28 Web coach → a tiny Vercel serverless function holding the key, **or** canned answers (decide at 23:00)
- [ ] A29 Deploy to Vercel; test on a second laptop + Chrome; HTTPS camera permission works
- [ ] A30 README: one-command run, a download for the macOS `.dmg` (if packaged), the web link

**Integration & quality**
- [ ] A31 Merge track/engine + track/visuals every ~90 min; run the full app after each merge
- [ ] A32 Swap mock → real `useMetrics` / `useLandmarks` behind one flag (`USE_MOCK`)
- [ ] A33 An error boundary per panel (one crash never blanks the HUD)
- [ ] A34 Performance: the HUD stays ≥24 FPS with the visuals + engine combined
- [ ] A35 **Stage-safe mode:** works with no internet (models local, coach canned)
- [ ] A36 Package the macOS app (`electron-builder`); sign ad-hoc; test it launches on a clean user account
- [ ] A37 `docs/architecture.md` + a diagram (copy section 2)
- [ ] A38 `AI_USAGE.md`: models used (Claude Code to build, Claude Haiku in the coach, MediaPipe on device), what was AI-assisted, how we validated (required disclosure)
- [ ] A39 Clearly mark pre-existing code (the friend's posture prototype) vs code built during HackYeah in the README
- [ ] A40 Tag `v1.0-submission` at 10:00

### P: Pitch & ops (Person 4)
**Right now (14:00–15:00)**
- [ ] P1 Join HackYeah Discord; ask **"Can one project be submitted to Sport & Healthcare AND Artificial Intelligence?"** → post the answer in team chat
- [ ] P2 Ask: **"Is the final deadline 11:00 Sunday on HackTribe?"**
- [ ] P3 Ask the REENTRY CTF organisers: **"Are AI tools allowed?"** (only then may someone run the CTF on the side)
- [ ] P4 Find who the Sport & Healthcare mentors are; visit them at 16:00 with a 30 s pitch; write down what they react to
- [ ] P5 Verify the Polish BHP rule (5-min break per hour of monitor work; employer-funded glasses): find the exact regulation name + paragraph for the business slide

**Story & material**
- [ ] P6 Write the 3-minute script from section 1.4 in Polish and English; time it
- [ ] P7 Find 2–3 credible stats (screen time of Polish office workers, back/neck pain prevalence, eye strain); note the sources
- [ ] P8 Competitor slide: Straighty, Rest & Blink, generic timers → the Bateria difference (section 0)
- [ ] P9 Business slide: B2C freemium + B2B anonymous team dashboard (BHP compliance) + an insurer/employer wellness angle
- [ ] P10 Slide deck ≤10 slides: Problem → Insight → Demo shot → How it works → 4 pillars → Privacy → Differentiation → Business → Roadmap → Team
- [ ] P11 Get the screenshot pack from V43 into the slides
- [ ] P12 The project description text for HackTribe (PL + EN), 150–300 words, mentioning AI use honestly

**Testing (every 2–3 h)**
- [ ] P13 18:00 test: fresh eyes, try it cold; write down 5 confusing things
- [ ] P14 23:00 test: run the full demo script; time it
- [ ] P15 06:00 test: final run on the stage laptop + projector resolution (1920×1080)

**Video (must be done by 08:30)**
- [ ] P16 Storyboard the 3-min video = the pitch beats
- [ ] P17 Record the Instagram-shot intro (V44) + a live demo screen recording (OBS / QuickTime)
- [ ] P18 Voice-over in English (or Polish + subtitles)
- [ ] P19 Edit (CapCut / DaVinci): punchy cuts, captions, the battery-refill moment in slow-mo
- [ ] P20 Upload unlisted on YouTube; test the link in incognito

**Submission (09:00–10:00)**
- [ ] P21 Fill HackTribe: title, team name, members, description
- [ ] P22 Attach the PDF (≤10 slides), repo link, web demo link, video link, screenshots
- [ ] P23 If dual entry is allowed → submit to the AI task too (adapt the description to "AI that predicts")
- [ ] P24 Screenshot the confirmation; post it in team chat
- [ ] P25 Rehearse the pitch 3× with a timer; prepare answers to: "how is fatigue computed?", "is it a medical device?" (no: a wellbeing tool, no diagnosis), "privacy?", "why not just a timer?", "business?"

---

## 6. Demo-day checklist (07:00–11:00)
- [ ] Laptop on power, Do Not Disturb ON, notifications from other apps OFF
- [ ] Good front light on the presenter's face (the mesh needs it); test at the stage spot if possible
- [ ] App launched in **demo mode**; the battery set to 81% via settings
- [ ] Backup: the recorded full demo video open in another window
- [ ] Web link tested on a phone hotspot (venue wifi can die)
- [ ] Glasses-on test done (reflections can break the blink detection; a fallback threshold preset is ready)

---

## 7. Judge Q&A cheat sheet
- **"How do you compute fatigue?"** Blink rate drop + PERCLOS (the standard drowsiness measure used in driver monitoring) + yawns + head nods, weighted into a drain model. Formulas are in `docs/metrics.md`.
- **"Is it medical?"** No. It's a wellbeing tool. It never diagnoses; it suggests seeing a professional when a pattern persists.
- **"Privacy?"** On-device MediaPipe; video never leaves the machine; only aggregated numbers go to the AI coach, and that is opt-in.
- **"Why not a timer?"** A timer doesn't know you're crashing. We measure it and predict it, and we verify you actually recovered.
- **"What did AI build?"** We used Claude Code to accelerate development and Claude Haiku inside the coach. We can explain every module; see `AI_USAGE.md`.
- **"Business?"** Free for individuals. B2B: employers must give monitor workers breaks under BHP rules; Bateria gives an anonymous team energy view + compliance.
