# Plan & backlog

> Status: **pre-brief template.** Lanes, phases and process are fixed; concrete tasks get filled in
> (by Claude, from the brief) once the hackathon task is announced. Tick `[x]` when merged to `main`.

## Brief
- Problem / theme: health data is scattered (watch, apps, tests, wellbeing), hard to interpret and rarely turns into action. Task: holistic tool (sport + physical + mental health + access to healthcare) that helps users **make better decisions**, not just monitor.
- Our idea in one sentence: **Rytm** — a desktop assistant that combines what the webcam sees at your desk with your phone's health data and tells you what to do right now, what a decision will change, and when/how to see a specialist.
- **The demo flow** (the 3–5 steps judges will see):
  1. Pitch opens with our team's real 24h hackathon data (energy map, the 4 a.m. dip).
  2. Live: calibrate → slouch → posture score drops → nudge "take a break, because…" built from several sources + one-tap mood.
  3. What if: pick a decision (sleep at 23 vs 1, train vs rest) → effect from similar days in your own history, with N days and range.
  4. Doctor report: PDF summary + specialist + NFZ path (referral needed or not); red flags → 112 / TIP NFZ.
- Out of scope (say no to these): employer dashboard (AI Act — only a business-model slide), emotion recognition, real wearable APIs (file import only), ML prediction models, multi-language UI, daily questionnaires.

## Lanes — who owns what

Split is by **ownership area**, not by "frontend vs backend": each lane can ship visible progress on its own,
and lanes meet only at the **contract** (shared types / API shapes).

**4 lanes — tasks, owners, directories and data contracts are in [`docs/PODZIAL-PRACY.md`](PODZIAL-PRACY.md).**
A — Measurement & app · B — Health data & decisions · C — UI & design · D — Healthcare content, pitch & team experiment.
Tick tasks there (A1, B1, …) when merged to `main`; the generic phase checklist below still applies.

## Phases & timeline (adjust T to real deadline)

### Phase 0 — Kickoff (T+0 → T+0:30) · everyone
- [x] P0.1 Read brief, pick idea, write the Brief section above (demo flow!)
- [x] P0.2 Pick stack (default: what all three know best) → fill CLAUDE.md "Stack & commands"
- [ ] P0.3 Agree the contract: core entities + API/function signatures → `TODO path` (A writes, all review)
- [ ] P0.4 Fill ownership table in CLAUDE.md, invite to repo, everyone cloned

### Phase 1 — Walking skeleton (T+0:30 → T+3h) · goal: end-to-end path on `main`, ugly is fine
- **A:** [x] A1 scaffold project + push (Rytm desktop app: camera, calibration, posture/fatigue, per-minute store, Live, Day rhythm, team data export/import, nudges + mood tap, Electron tray app) (others wait ≤20 min — do P1 prep meanwhile) · [ ] A2 deploy pipeline live · [ ] A3 data layer + first real endpoint per contract
- **B:** [ ] B1 (while A1 runs) wireframe the demo screens · [ ] B2 routes/pages for demo flow against **mock data** · [ ] B3 base layout / design tokens
- **C:** [ ] C1 (while A1 runs) spike the wow feature in isolation (script/notebook) to prove it works · [ ] C2 seed/demo data set · [ ] C3 wrap the spike behind the contract
- [ ] **Milestone 1:** click through demo flow on the deployed URL (mocks allowed)

### Phase 2 — Make it real (T+3h → T-6h)
- **A:** [ ] A4 replace mocks with real endpoints · [ ] A5 persistence · [ ] A6 error handling on the demo path only
- **B:** [ ] B4 wire screens to real API · [ ] B5 loading/empty/error states on demo path
- **C:** [ ] C4 integrate wow feature into the flow · [ ] C5 make it fast/reliable (cache, fallbacks)
- [ ] **Milestone 2:** demo flow works end-to-end with real data

### Phase 3 — Wow & polish (T-6h → T-3h)
- [ ] Visual polish on demo screens (B)
- [ ] The one "extra" that makes judges remember us (C)
- [ ] Performance / stability of demo path (A)
- [ ] Stretch goals — only if Milestone 2 is solid:
  - [ ] TODO

### Phase 4 — Freeze & ship (T-3h → demo) · **feature freeze, no new features**
- [ ] Bug fixes on demo path only
- [ ] Final seed data; reset script so demo starts from a clean state
- [ ] Record backup demo video
- [ ] Pitch deck + rehearse demo twice with a timer
- [ ] README: what it is, how to run, screenshots

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

## Blockers / notes
