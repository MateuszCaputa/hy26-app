# Plan & backlog

> Status: **in progress.** Tick `[x]` when merged to `main`. Every task has an id — tell Claude "do H2" and it finds the acceptance criteria here.
> Deadline: **Sun Oct 4, 22:00** (HackTribe, PDF ≤10 slides, hard limit 23:00). **Feature freeze: Sun 18:00.**

## Brief
- Problem / theme: health data is scattered (watch, apps, tests, wellbeing), hard to interpret and rarely turns into action. Task: holistic tool (sport + physical + mental health + access to healthcare) that helps users **make better decisions**, not just monitor.
- Our idea in one sentence: **Rytm** — a desktop assistant that combines what the webcam sees at your desk with your phone's health data and tells you what to do right now, what a decision will change, and when/how to see a specialist.
- **The demo flow** (the 3–5 steps judges will see):
  1. Pitch opens with our team's real 24h hackathon data (energy map, the 4 a.m. dip).
  2. Live: calibrate → slouch → posture score drops → nudge "take a break, because…" built from several sources + one-tap mood.
  3. What if: pick a decision (sleep at 23 vs 1, train vs rest) → effect from similar days in your own history, with N days and range.
  4. Doctor report: PDF summary + specialist + NFZ path (referral needed or not); red flags → 112 / TIP NFZ.
- Out of scope (say no to these): employer dashboard (AI Act — only a business-model slide), emotion recognition, real wearable APIs (file import only), ML prediction models, multi-language UI, daily questionnaires.

## Where we are (Sat ~13:00)

**Done (PR #1, #2):** camera core (MediaPipe face + pose, calibration, posture score, blinks/PERCLOS, yawns, time at desk), per-minute IndexedDB store, screens Start / Na żywo / Rytm dnia / Dane zespołu, nudges + one-tap mood, team export/import, Electron tray app, auto-backup every 10 min, smoke tests.

**Missing for the demo flow:** phone data import (step 3 needs history) · "Decyzja teraz" combining sources (step 2 "because…") · "Co jeśli" (step 3) · Raport dla lekarza + NFZ (step 4) · pitch PDF (= the submission itself).

## Lanes — who owns what

Three lanes, each ends in a **screen judges see**, so everyone ships visible progress on their own.
Lanes meet only at the **contract** below. Stay in your dirs; for anything else see "Hot files".

| Lane | Owner | Owns | Delivers (demo step) | Branch prefix |
|------|-------|------|----------------------|---------------|
| **1 — Kamera & aplikacja** | Marcin | `src/lib/monitor.js` `metrics.js` `useMonitor.js` `ticker.worker.js` · `src/lib/decide.js` · `src/screens/{Start,Live,Day,Data}.jsx` · `src/components/` · `electron/` · `scripts/` | Live + "Decyzja teraz" (step 2), team 24h data (step 1), app stability | `marcin/` |
| **2 — Dane z telefonu & Co jeśli** | Mateusz | `src/lib/health/` · `src/lib/whatif.js` · `src/screens/{Import,WhatIf}.jsx` · `public/sample/` | Import + sample data, "Co jeśli" (step 3) | `mateusz/` |
| **3 — Lekarz, NFZ & pitch** | Dev 3 | `src/lib/report.js` · `src/lib/nfz.js` · `src/screens/Report.jsx` · `docs/pitch/` | Raport dla lekarza + NFZ path (step 4), pitch PDF, demo script, backup video | `dev3/` |

## Contract (P0.3) — agree in 10 min, then build against it

Plain JS objects; missing value → `null`, never `undefined`/`0`. Dates local `YYYY-MM-DD`, times `HH:MM`.

```js
// IndexedDB v2, new store `days` (Lane 2 adds it in H0). key: `${person}|${date}`
DayRecord = {
  id, person, date, source: 'apple' | 'samsung' | 'sample',
  sleepMin, bedtime, wakeTime,         // sleep that ENDED on `date`
  steps, activeKcal, workoutMin,
  restingHr, hrv,                      // bpm, ms
  weightKg, intakeKcal,                // Fitatu → Apple Health
}

// Lane 1 — camera summary of one day, built from the existing `minutes` store
summarizeDay(minutes, date) → { date, deskMin, postureAvg, fatigueAvg, breaks, longestSitMin, energyByHour: number[24] }

// Lane 1 — the in-the-moment decision (rules only; LLM may rephrase `reasons`, never decides)
decideNow({ live, today: DayRecord | null, cam: CamDay }) →
  { action: string, reasons: string[], level: 'info' | 'warn' | 'redflag' }

// Lane 2 — "what if": compare similar days in own history
whatIf(history: Array<DayRecord & CamDay>, decision: { id, label, test(day) → bool }, outcome: 'fatigueAvg' | 'postureAvg' | 'sleepMin' | …) →
  { n, nWithout, withAvg, withoutAvg, range: [min, max], enough: n >= 5 }

// Lane 3 — doctor report data (rendered by Report.jsx, exported to PDF)
buildReport({ person, days, camDays, events }) →
  { period: { from, to }, findings: [{ text, evidence }], specialist, referralNeeded: bool, redFlags: string[] }
```

Until a function exists, the consumer uses a **stub returning a hardcoded object of this shape** — never wait.

## Hot files (shared — pull first, minimal change, separate commit, push now, say it in chat)

- `src/App.jsx` → each lane adds **one line** to `TABS` + one render line. Nothing else.
- `src/lib/db.js` → only H0 (Lane 2) bumps `DB_VERSION` to 2 and adds `days`. Others: ask Mateusz.
- `electron/main.cjs` (Marcin) → Lane 3 needs a `printToPDF` IPC: ask Marcin, or a tiny separate PR he reviews.
- `src/index.css` → append only, prefix classes with the screen name (`.report-…`, `.whatif-…`).
- `package.json` / lockfile → avoid new deps; if needed, own commit, push immediately.

## Backlog

### Phase 0 — Kickoff · everyone · now
- [x] P0.1 Brief, idea, demo flow
- [x] P0.2 Stack → CLAUDE.md
- [ ] P0.3 Contract above agreed (5 min read by all)
- [ ] P0.4 Third member named in this table + CLAUDE.md, invited, cloned, app running on their laptop
- [ ] P0.5 **Everyone runs Rytm all the time from now** — this is our pitch data (step 1)

### Phase 1 — Skeleton of every step (Sat → ~18:00) · ugly is fine, stubs allowed
**Lane 1 — Marcin**
- [ ] M1 `summarizeDay()` per contract + export from `src/lib/` — **first, others consume it**. Done: returns correct shape for today's real data.
- [ ] M2 `decide.js` rules v1: posture, sit time, fatigue (camera) + sleep/steps (`today` DayRecord, stub until H0). Every result has ≥1 human reason "bo…". Red flags (e.g. very high fatigue + very short sleep) → `level: 'redflag'`.
- [ ] M3 NudgeToast / Live show `decideNow` output (action + reasons) instead of current single-source text.
- [ ] M4 macOS run check with Mateusz (camera permission, tray) — 15 min pairing.

**Lane 2 — Mateusz**
- [ ] H0 `db.js` v2 + `days` store + `getDays(person)` / `putDays(records)` — **within 30 min, push alone** (hot file).
- [ ] H1 `public/sample/` — 60 days realistic sample DayRecords (weekday/weekend pattern, a few short-sleep nights, workouts) + matching camera summaries; loaded via button, **labeled "dane przykładowe"**.
- [ ] H2 Import screen: pick file → parse → preview (days found, date range, fields present) → save. Sample-data button here.
- [ ] W1 `whatIf()` per contract + 3 decisions: bed before 23:00 vs after 01:00, workout day vs none, >7k steps vs <3k. Outcome: next-day fatigue / posture.
- [ ] W2 "Co jeśli" screen: choose decision → two bars (with / without) + "na podstawie N dni, zakres X–Y"; `enough=false` → honest "za mało danych".

**Lane 3 — Dev 3**
- [ ] R1 `nfz.js`: static map pattern → specialist + referral needed? + red flags list → 112 / TIP NFZ 800 190 590. **Verify each referral rule on nfz.gov.pl, cite source in a comment.** No diagnoses — "częste przyczyny pasujące do Twoich danych".
- [ ] R2 `buildReport()` per contract, using stubs for camera/phone data.
- [ ] R3 Raport screen: printable layout (A4), summary charts/numbers, specialist + NFZ path box, red flags box.
- [ ] P1 Pitch outline ≤10 slides in `docs/pitch/` (problem → us at the hackathon → demo flow → privacy/AI Act → NFZ → business model → team). **The PDF is the submission — start now, not Sunday.**

- [ ] **Milestone 1 (~Sat 18:00):** all 4 demo steps clickable in the app on `main`, stubs allowed.

### Phase 2 — Make it real (Sat evening → Sun 12:00)
- [ ] H3 Apple Health `export.xml` parser in a Web Worker, **streaming** (files are often 200 MB–1 GB; never `DOMParser` the whole thing). Sleep, steps, resting HR, HRV, active kcal, workouts, weight, dietary kcal (Fitatu). Test on a real export from one of us.
- [ ] H4 Samsung Health CSV import (sleep, steps, HR) — zipped export folder; same DayRecord output.
- [ ] W3 Co jeśli on real camera summaries joined with phone days (by date).
- [ ] M5 `decideNow` uses real `today` DayRecord; tune thresholds on our own data.
- [ ] M6 24h stability: memory/FPS after many hours, backup restore tested.
- [ ] R4 PDF export via Electron `printToPDF` (IPC from M-lane) → save dialog; browser fallback `window.print()`.
- [ ] R5 Report on real data (team member who consents).
- [ ] P2 Pitch slides with real screenshots + our 24h data chart (energy map, 4 a.m. dip).
- [ ] **Milestone 2 (~Sun 12:00):** full demo flow on real data, on both Windows and Mac.

### Phase 3 — Wow & polish (Sun 12:00 → 18:00)
- [ ] Visual pass over all screens, consistent Polish copy (Lane 1 leads, each owner fixes own screens)
- [ ] Stretch, only if Milestone 2 is solid:
  - [ ] S1 LLM rephrases `decideNow.reasons` (numbers only in prompt, never frames; offline fallback = rule text)
  - [ ] S2 Team energy-map comparison chart for the pitch opener
  - [ ] S3 Onboarding tour on Start

### Phase 4 — Freeze & ship (Sun 18:00 → 22:00) · **no new features**
- [ ] F1 Bug fixes on demo path only
- [ ] F2 Demo reset: clean profile with sample data + our real 24h data loaded
- [ ] F3 Record backup demo video (full flow, 2–3 min)
- [ ] F4 Final pitch PDF ≤10 slides exported, rehearsed twice with timer
- [ ] F5 README: what it is, how to run, screenshots, privacy note
- [ ] F6 **Submit on HackTribe by 21:30** (buffer before 22:00)

## Decisions log
<!-- one line each: what we decided and why — saves re-arguing at 3am -->
- Posture alone isn't original (SitApp, Slouch Sniper, Zen…) and "AI reads your health data" is ChatGPT Health → our edge: the camera sees you at work + proactive nudges + Polish healthcare (NFZ).
- Desktop (Electron) over web: background measurement doesn't get throttled; tray keeps it running.
- Data: Apple Health export.xml (Fitatu syncs meals/weight into it) + Samsung Health CSV, both from the start; bundled sample dataset as fallback, labeled as sample.
- "What if" = compare similar days in the user's own history (always show N days + range); no ML.
- Rules decide, LLM only phrases (numbers only, never camera frames).
- Mental wellbeing: no daily survey — passive signals + optional one-tap mood in nudges.
- Persona in pitch: us at the hackathon; desk worker as the target. Each team member consented to showing their data (name or pseudonym).
- Business model: free for users, paid by employers as a benefit; employer sees nothing.
- Lanes split by demo step (camera+decision / phone data+what-if / doctor+pitch) so each person owns a visible screen; meet only at the contract.
- Sample dataset (H1) first so What-if and Report can be built before real imports work; real 24h team data overrides it for the pitch.

## Blockers / notes
