# Cleanup + compliance review (2026-10-03, branch `mateusz/cleanup`)

Audit of `main` @ `5e412c2`. **No code changed yet** — this file is the proposal. Items marked **SAFE NOW** are what the `mateusz/cleanup` branch would do after approval; everything else is "report only", "after freeze (Sun 07:00)" or "deferred (file is hot)".

## 0. Baseline

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ clean |
| `npm test` | ✅ 112 / 112 pass |
| `node build.mjs` | ✅ |
| Screenshots (`--demo --view=…`) | ✅ `/tmp/base-{live,stats,exercises,settings}.png` |

### Deferred — touched < 2 h ago or by an open PR (not edited by this branch)

`src/core/{breakEngine,coach,exerciseVerify,fatigue}.ts`, `src/main/main.ts`, `src/renderer/{analyzer,app,calibrator,fatigueWhy,figures,nudge,overlays}.ts`, `src/renderer/views/{live,settings,stats}.ts`, `src/renderer/static/*` (incl. `styles.css`), `src/shared/{api,types}.ts`, `src/preload.ts`, `package.json`, `AI_USAGE.md`, `docs/PLAN.md`, `test/{core,eyeMetrics,exerciseVerify}.test.ts`, `assets/logo-mark.png`. Open PR #105 touches `src/core/fatigue.ts`, `test/eyeMetrics.test.ts`.

---

## A. Code cleanliness

Risk: **L** low / **M** medium / **H** high. When: **now** = safe in this branch, **post** = after freeze, **owner** = file is hot, hand to owner.

### A1. Dead code / leftovers of removed features

| # | Where | Finding | Fix | Risk | When |
|---|---|---|---|---|---|
| 1 | `src/main/db.ts:56-63` | `getSecret`/`setSecret` never called (stored the Garmin login) | delete | L | **now** |
| 2 | `test/statsYesterday.test.ts:19` | fixture still passes `garmin: [], garminConnected: false` | drop the 2 keys | L | **now** |
| 3 | `src/main/db.ts:25-27` | migration dropping `garmin_daily` | **keep** (old DBs need it) | – | – |
| 4 | `src/core/coach.ts:158,164` | `FATIGUE_LABEL`, `fatigueAdvice` exported, used nowhere | delete | L | owner (A, 44 min) |
| 5 | `src/renderer/app.ts:291` | `currentView` unused export | delete | L | owner (C/A) |
| 6 | `src/renderer/dom.ts:51` | `plural` unused | delete (or use it) | L | **now** |
| 7 | `src/shared/api.ts:28,30` + `preload.ts:20,22` + `main.ts:512-516` | IPC `activity-status` and `open-external` exposed, never invoked by renderer (links already go via `setWindowOpenHandler`, main.ts:249) | delete 3 layers | L | post (shared hot files) |
| 8 | `src/core/insights.ts:23-86,182-201` → `StatsPayload.heatmap/bestHours/dipText/weekTopIssue/last7/avgBlinkRate` | Built for the removed "Godziny formy" chart (C21); no renderer reads them, only tests | remove fields + fns + tests — **or keep `bestHoursText` if B wants "best hours" back for the pillar story** | M | post, owner B |
| 9 | `src/shared/types.ts` `onlyWorkHours`, `workStart` | forced `false` at `main.ts:538`; `withinWorkHours()` (main.ts:338) can never fire | remove key + check + fn | L | post |
| 10 | `activityTracking` → `src/main/activity.ts`, `main.ts:324-326,475`, `uiohook-napi` dep, `asarUnpack`, `build.mjs:22`, `MinuteSample.kb/mouse`, `seed-demo.mjs:12` | forced `false`, no UI since C22 → native dep shipped for nothing | remove all (smaller installer, less native-build risk on Windows) | M | post (touches package.json/lockfile — needs whole-team OK) |
| 11 | `workEnd` | not user-settable any more, fixed 17:00, still drives `maybeEndOfDay` | make it a named constant | M | post |
| 12 | `styles.css:127-133,214-215,223-225,231-234,317,359-362` | 19 unused selectors (`.score-block .score-line .energy-num .state-line .score-small .energy-word .score-num .score-of .fat-line .fat-num .fat-word .meter-tick .t40 .t70 .advice .cal-run .cal-status .cal-checks .sr-only`) — verified 0 refs in `src/**/*.{ts,html}` | delete | L | owner (C, file is hot) |
| 13 | `assets/logo-mark.png` (22 KB) | unreferenced; UI uses `src/renderer/static/logo-mark.png`; shipped via `extraResources` | move to `docs/design/` | L | owner (just added) |
| 14 | `assets/models/pose_landmarker_lite.task` (5.6 MB) | only a `catch` fallback (analyzer.ts:140); full model is always bundled | keep for stage safety; revisit post-event | – | – |
| 15 | `db.ts` `minutes.long_blinks`, `events.detail` | written, never read | keep (history/debug); add a 1-line comment | L | **now** |

### A2. Duplication → one place in `src/core/`

| # | Helper | Locations | Proposal | Risk |
|---|---|---|---|---|
| 1 | `median` | `metrics.ts:153` (canonical), `shoulderGate.ts:41` (`med`), `exerciseVerify.ts:73`, **`fatigue.ts:80` (different! returns upper-middle on even length)** | `shoulderGate` → import `median` from metrics (**now**, identical body); fatigue one = **report**, changing it alters PERCLOS output | L / H |
| 2 | linear slope | `aggregate.ts:128-135`, `energy.ts:51-60` | `core/stats.ts` `linearSlope` | L, post |
| 3 | mean / percentile / clamp / round | insights, fatigue, aggregate, energy, scoring, metrics, calibration, `postureFigure.ts:33`, `stats.ts:140` | `core/stats.ts` | L, post |
| 4 | eye distance / hypot / angle | `framing.ts:49` = `calibrator.ts:467`, `metrics.ts:37,43`, `shoulderGate.ts:49-56`, `draw.ts` | `core/geometry.ts` | L, post |
| 5 | cover-fit + mirror projection | `draw.ts:17-35` ≈ `calibrator.ts:323-344`; 640×480 fallback ×5 | pure `coverTransform` in core | M, post |
| 6 | day keys | `insights.ts:7 localDate` vs `analyzer.ts:533,546 toDateString()`; yesterday-start trick in `main.ts:422,432` + `insights.ts:131` | `core/time.ts` | L, post |
| 7 | formatting | `dom.ts fmtMin`, `overlays.ts:87-90`, `stats.ts:215 fmtDesk`, `exercises.ts:18` | `core/format.ts` + tests | L, post |

### A3. Structure (line counts: analyzer 636, main 565, styles.css 556, fatigue 555, calibrator 502, live 356, stats 347)

All splits are **post-freeze** (every one of these files is hot right now):
- `main/main.ts` → `tray.ts`, `windows.ts` (main/widget/nudge), `ipc.ts`, `dayReport.ts`, `devtools.ts` (screenshot/reload).
- `renderer/analyzer.ts` → `models.ts`, `camera.ts`, `pipeline.ts` (tick), `demo.ts`; calibration median aggregation → `core/calibration.ts aggregateCalibration()`.
- `views/live.ts` → `drawEyeDebug` → `renderer/debugDraw.ts`.
- `views/stats.ts` → SVG bar charts → `renderer/charts.ts`; `weighted` + hour buckets → `core/insights.ts`.
- `styles.css` already has section headers; split per screen only if build copies multiple CSS files.

### A4. Consistency

- **Magic numbers** (keep values, name + WHY): cross-file bands are duplicated — score 80/60 (`scoring.ts:117` + `stats.ts:19`), fatigue 70/40 (`fatigue.ts:467` + `stats.ts:20`), low blink rate 8 (`fatigue.ts:381` + `coach.ts:165`), time ramp 20/70 min (`fatigue.ts:449` + `energy.ts:25` + text in `fatigueWhy.ts:16`), "<30%" literal in `main.ts:148` instead of `ENERGY_LOW`. Proposal: `core/thresholds.ts` (post). **Now:** name constants in the cold core files `energy.ts`, `scoring.ts`, `calibration.ts`, `metrics.ts`, `aggregate.ts`, `framing.ts`, values unchanged.
- **`!` assertions:** ~46, none with `// HACK:`. Most are `getContext('2d')!` / `getElementById()!` (fine at boot). Worth narrowing: `calibrator.ts:200-251` (13×), `insights.ts` (7×), `live.ts:270,297-301`. Post.
- **No** `any`, TODO/FIXME, or commented-out code. ✅
- **console:** legit `warn/error`; `console.info` in `app.ts:65,190-197` gated by `?autocal`. OK.
- **Error handling in loops:**
  - ✅ `analyzer.ts:310-318` tick is try/caught and always reschedules. But one try covers the whole tick, so a throwing callback drops that frame's minute sample. Report.
  - ❌ `calibrator.ts:256-307` RAF loop has **no try/catch** (one throw freezes calibration). **Report (bug).**
  - ❌ `main.ts:556` `setInterval(maybeEndOfDay)` has no try (DB/notification error becomes an uncaught exception in main). **Report.**
  - ⚠️ Silent catches worth a `console.warn`: `stats.ts:46`, `analyzer.ts:113`.
- **Naming:** identifiers EN, comments/UI PL ✅. Product name split: `Upright` (UI) vs `postura` (`window.postura`, `PosturaApi`, `POSTURA_*` env, appId, userData dir). Keep the internal IDs (changing appId/userData loses users' data); document it in ARCHITECTURE.

### A5. Tests

- `src/core/oneEuro.ts` has **no tests** → add `test/oneEuro.test.ts` (**now**, test count grows).
- Indirect-only: `aggregate.postureAvg/topIssueOf`, `metrics.median`, `scoring.stateFromScore`, `fatigue.fatigueLevel`. Add direct tests post.
- Duplicated helpers: pose builders (`core.test.ts:16`, `precision.test.ts:78`, `framing.test.ts:7`), calibration builders (`calFrom`/`calOf`), eye feeders ×3, MinuteSample builders. Proposal: `test/helpers/fixtures.ts`, post (core.test is hot).

### A6. Repo hygiene

| # | Where | Finding | Fix | When |
|---|---|---|---|---|
| 1 | `.gitignore` | no `.DS_Store`, `.env*` | add `.DS_Store`, `.env*`, `!.env.example` | **now** |
| 2 | `docs/` | no index; FEATURES/SCOPE/PLAN/ROADMAP overlap; POMYSLY ≈ pitch/IDEAS | add `docs/README.md` index (below) | **now** |
| 3 | `docs/ARCHITECTURE.md` | missing (needed for "team can explain every module") | add a 1-page module map | **now** |
| 4 | `README.md` | `# Postura`; says models download on first run (bundled since A1); lists the removed "Godziny formy", keyboard tempo, Accessibility permission, work hours; "8 exercises chosen for the problem" (`pickExercise` rotates); ~25 fps (now 30); structure list misses 9 core modules; no `npx electron --version` step; no screenshots | rewrite those lines (PL), owner D, FYI Kacper | **now** (cold: 3 h) |
| 5 | `CLAUDE.md` | gotchas say "17/17 tests" and "models download on first run"; stack says uiohook "keyboard activity"; core list incomplete; name Postura | refresh | **now** (Mateusz) |
| 6 | `docs/FEATURES.md` | "don't claim yet" list is stale (A1, MP7/9, A4/A5/C6, C10/C11 are done); lists removed C20-C22 features as ✅ | update | **now** (cold: 3 h) |
| 7 | `package.json` | `NSCameraUsageDescription` says "Postura…" (judges see it in the macOS prompt); mac target has no arch list; `uiohook-napi` (A1 #10) | fix string | owner (hot) |
| 8 | `src/renderer/widget.ts:49` | tooltip "Kliknij: otwórz **Posturę**" | → "otwórz Upright" | **now** (cold: 3 h; UI string only) |
| 9 | `.claude/commands/start.md` | doesn't mention ROADMAP.md (CLAUDE.md says mandatory) | add line | **now** |

---

## B. Hackathon compliance checklist

| # | Requirement | Status | Evidence | Gap → action (owner) |
|---|---|---|---|---|
| 1a | Pillar: **sport / movement** | ✅ | `core/breakEngine.ts`, `core/coach.ts` (8 exercises), `core/exerciseVerify.ts` (camera-counted reps), `overlays.ts` Bateria before→after | A4 thresholds not tuned on real people (B) |
| 1b | Pillar: **physical health** | ✅ | `core/metrics.ts`, `scoring.ts`, `headPose.ts`, `shoulderGate.ts`, `calibration.ts`, live figure | – |
| 1c | Pillar: **mental wellbeing** | ⚠️ | `core/fatigue.ts` (PERCLOS, blinks, yawns), `fatigueWhy.ts`, `energy.ts` | It's fatigue/energy, not mood. "Best hours" rhythm is computed (`insights.ts bestHoursText`) but **no longer shown** (C21). Pitch as "fatigue & energy rhythm"; consider re-surfacing best hours (B/D) |
| 1d | Pillar: **access to healthcare** | ❌ | only a static line in `views/exercises.ts:11` ("skonsultuj się z fizjoterapeutą"); no NFZ / doctor-report / care-pattern code | **Biggest gap for "Relation to category" (20%).** Minimal: NFZ card (GP / physio / eye doctor, TIP 800 190 590, red flags → 112) + printable 14-day summary from `buildStats`, shown when a pattern persists (B, A for carePattern) |
| 2 | "Helps users make better decisions" | ✅ | posture alert + 1 tip (`scoring.ts`, `coach.ts ISSUE_TIP`); adaptive break with reason (`coach.ts:151 BREAK_REASON`); nudge 20-20-20 (`nudge.ts`); "Dlaczego X%?" (`fatigueWhy.ts`); verified exercise → break credited + real Bateria change; end-of-day summary + "Na jutro" tip (`main.ts:447`); Bateria crash forecast (`energy.ts minutesUntilLow`, tray) | `core/explain.ts` (A3) not built; README claims exercise is chosen per problem but it rotates (D) |
| 3 | Data scattered / hard to interpret / rarely acted on | ⚠️ | one number per domain, norms + "vs wczoraj" (stats), plain-language states, "za mało danych z oczu" instead of a fake number. Garmin fully removed from `src` (only the drop-migration + a test fixture remain) | Sources are now camera only (keyboard tempo off). Frame it as "raw signals → one interpretable number → an action", not aggregation (D) |
| 4 | HackTribe submission (EN/PL): title, team name, members 1–6, description, PDF ≤ 10 slides | ❌ | repo public ✅; `docs/pitch/` only has `IDEAS.md`; no screenshots, video, description, team list | write `docs/pitch/SUBMISSION.md` (title **Upright**, team, members, PL description), PDF, screenshots via `--screenshot` (C9), video (D) |
| 5 | Judging (≥ 50 % from ≥ 3 mentors in phase 1) | ⚠️ | Idea: fusion + forecast + verified exercises, on-device · Category: sport/physical strong · Usability: calm home, hands-free calibration, widget · Design: overlay, figures, new logo · Completeness: 112 tests, offline models, demo mode | Weakest: Category (no healthcare access), Design unproven on paper (no screenshots/video), Completeness (installers never built, docs stale) |
| 6a | AI disclosure | ⚠️ | `AI_USAGE.md` names Claude Code | Missing: MediaPipe `face_landmarker`, `pose_landmarker_full` (+ lite fallback) with model-card links + Apache-2.0; svgrepo icons (`app.ts:209,213`, check licence); "no datasets used"; literature norms (`docs/BADANIE-OCZU.md`). Remove "Claude API (only if the AI coach ships)", since B4 isn't built (D) |
| 6b | Pre-existing code separated | ⚠️ | git starts `fb82440` 10:57 Oct 3. Kacper's prototype imported in **one commit `345cf6e` (13:26, +6 155 lines)**; Marcin's Rytm in `957cff3` (12:59, +33 k lines, archived). `AI_USAGE.md:4` still has the placeholder "*Kacper: describe exactly what existed…*"; README says nothing | Kacper fills in the statement; README "Pre-existing work" section; tag **`pre-hackathon-baseline` → `345cf6e`** (D + Kacper; tag = team decision). State whether Rytm was pre-existing too (Marcin) |
| 6c | Team can explain every module | ⚠️ | – | Add `docs/ARCHITECTURE.md` (outline below) + "who explains what". Hardest: `fatigue.ts` (adaptive eye heuristics), `headPose.ts` (matrix decomposition), `calibrator.ts`, `oneEuro.ts`/`landmarkFollower.ts`, `shoulderGate.ts` |
| 7 | Timing: no changes after deadline | ⚠️ **must confirm** | PL §4.3: "do godz. 11:00, 4 października"; EN §4.3 and Sport rules §5: "11:00 PM October 4th" (whose start time "11:00 PM Oct 3" looks like a template typo) | Confirm on Discord (D1); treat 11:00 Sun as hard. Tag the submitted commit **`v1.0-submission`** and stop pushing to `main` (D/C) |
| 8a | Frames never stored/sent | ✅ | CSP `connect-src 'self'` (`index.html:8`); only network = `net.fetch` of 2 Google model URLs in `models.ts:41`, used only if bundled models are missing; pixel reads local (`analyzer.ts:471`, `calibrator.ts:120` 32×24 brightness); no MediaRecorder/toBlob/image writes; `trayBadge.ts:32 toDataURL` = text only | ⚠️ dev flag `--screenshot` (`main.ts:519`) captures the window, and on the live view that includes the camera preview. Document it as dev-only (C) |
| 8b | No diagnosis / no emotion recognition | ✅ | no diagnosis words in UI strings; blendshapes used: only `eyeBlinkLeft/Right`, `jawOpen` (`analyzer.ts:354-356`) | – |
| 8c | Health claims as indicators | ⚠️ | "wskaźnik" mostly in comments; UI says "Zmęczenie X%" | add one in-app line "Wskaźnik orientacyjny, nie diagnoza medyczna" (Settings privacy card or fatigue tooltip) (C/B) |
| 8d | `FEATURES.md` "don't claim yet" current | ❌ | stale (see A6 #6) | update (C, now) |
| 9a | Offline models | ✅ | `assets/models/*.task` tracked; `main.ts:41-44` MODEL_DIRS tries bundled first; wasm copied by `build.mjs:45`; demo mode skips models | – |
| 9b | `npm install && npm start` / `npm run demo` | ⚠️ | scripts exist; baseline run ✅ on macOS | fresh-clone test on a clean machine (I3); README lacks `npx electron --version` gotcha |
| 9c | Installers | ⚠️ | electron-builder config bundles `dist/**` + `extraResources assets` (models incl.) | never built/tested; mac is host-arch only, unsigned (Gatekeeper right-click → Open note needed) (C) |

---

## C. Real bugs found (reported, NOT fixed here)

1. `src/core/fatigue.ts:80` local `median` returns the upper-middle element for even-length input, so it is not a true median. Owner A (PR #105 is in this file).
2. `src/renderer/calibrator.ts:256-307` RAF loop has no try/catch, so one exception freezes calibration. Owner A/C.
3. `src/main/main.ts:556` `setInterval(maybeEndOfDay)` has no try. Owner C.
4. `src/renderer/analyzer.ts:528-535` sorts ~14 400 numbers on every pose tick (~8/s) plus `shift()` O(n). Perf. Owner A.
5. `src/core/breakEngine.ts:89` `Math.random()` in pure core (non-deterministic tests). Owner A.
6. `README.md` claims exercises are matched to the top issue, but `coach.ts:133-143 pickExercise` ignores `_issue` and rotates. Fix the doc or the code (B/D).

---

## D. Proposed `docs/README.md` (index)

Start here: ROADMAP · PLAN · TEAM · ../CLAUDE.md — Product: SCOPE · FEATURES · FEEDBACK — Engineering: ENGINEERING · ARCHITECTURE · CLEANUP — Research notes (PL): BADANIE-OCZU · POMYSLY · ../research/ — Pitch (PL): pitch/ — Archive: archive-rytm/ (tag `backup/rytm-marcin`).

## E. Proposed `docs/ARCHITECTURE.md` outline (1 page)

1. Data flow: camera → MediaPipe (face 30 fps, pose ~8 fps, on-device) → `core/metrics` → `scoring` / `fatigue` / `energy` → per-minute `aggregate` → IPC → `main/db` (SQLite, numbers only) → stats / breaks / nudges.
2. Process map: main (tray, windows, IPC, DB, notifications) · preload (`window.postura`) · renderer (analyzer, views, widget, nudge).
3. Module table: one line per `src/core/*` with "what it decides" + who explains it.
4. Privacy boundary: where pixels exist and where they stop.
5. Naming note: product **Upright**, internal ID `postura` (appId/userData/bridge, kept for data compatibility).

---

## F. Proposed commits for `mateusz/cleanup` (SAFE NOW: cold files only, behaviour-neutral)

| ID | Commit | Files |
|---|---|---|
| S1 | `chore(cleanup): ignore .DS_Store and env files` | `.gitignore` |
| S2 | `docs: docs index, architecture map, cleanup report` | `docs/README.md`, `docs/ARCHITECTURE.md`, `docs/CLEANUP.md` |
| S3 | `chore(cleanup): remove dead Garmin remnants` | `src/main/db.ts` (get/setSecret), `test/statsYesterday.test.ts` (fixture keys) |
| S4 | `chore(cleanup): drop unused plural helper` | `src/renderer/dom.ts` |
| S5 | `refactor(core): shoulderGate uses shared median` | `src/core/shoulderGate.ts` (identical body) |
| S6 | `chore(core): name magic numbers in cold core modules` | `energy.ts`, `scoring.ts`, `calibration.ts`, `metrics.ts`, `aggregate.ts`, `framing.ts` (values unchanged) |
| S7 | `test: cover OneEuroFilter` | new `test/oneEuro.test.ts` |
| S8 | `fix(ui): widget tooltip says Upright` | `src/renderer/widget.ts:49` (string only) |
| S9 | `docs: README matches the app (Upright, bundled models, removed features)` | `README.md` |
| S10 | `docs: FEATURES "don't claim yet" + CLAUDE.md gotchas up to date` | `docs/FEATURES.md`, `CLAUDE.md`, `.claude/commands/start.md` |

Not in this branch (owner / post-freeze): A1 #4,5,7-13 · A2 #2-7 · A3 · fatigue median · CSS dead classes · `package.json` camera string · AI_USAGE · tags · healthcare pillar.
