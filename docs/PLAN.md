# Plan & backlog

> Status: **pre-brief template.** Lanes, phases and process are fixed; concrete tasks get filled in
> (by Claude, from the brief) once the hackathon task is announced. Tick `[x]` when merged to `main`.

## Brief (TODO)
- Problem / theme:
- Our idea in one sentence:
- **The demo flow** (the 3–5 steps judges will see):
  1.
  2.
  3.
- Out of scope (say no to these):

## Lanes — who owns what

Split is by **ownership area**, not by "frontend vs backend": each lane can ship visible progress on its own,
and lanes meet only at the **contract** (shared types / API shapes).

| Lane | Owner | Owns (dirs) | Responsibility | Branch prefix |
|------|-------|-------------|----------------|---------------|
| **A — Platform & data** | Mateusz | TODO | Scaffold, deploy, auth (if needed), DB/schema, API endpoints, shared contract | `mateusz/` |
| **B — Core product UI** | Dev 2 | TODO | Screens of the demo flow, components, state, UX | `dev2/` |
| **C — The "wow" + demo** | Dev 3 | TODO | The differentiating feature (AI / integration / algorithm), seed data, pitch & demo script | `dev3/` |

Rename lanes to fit the brief, but keep the principle: **one owner per area, contract in between.**

## Phases & timeline (adjust T to real deadline)

### Phase 0 — Kickoff (T+0 → T+0:30) · everyone
- [ ] P0.1 Read brief, pick idea, write the Brief section above (demo flow!)
- [ ] P0.2 Pick stack (default: what all three know best) → fill CLAUDE.md "Stack & commands"
- [ ] P0.3 Agree the contract: core entities + API/function signatures → `TODO path` (A writes, all review)
- [ ] P0.4 Fill ownership table in CLAUDE.md, invite to repo, everyone cloned

### Phase 1 — Walking skeleton (T+0:30 → T+3h) · goal: end-to-end path on `main`, ugly is fine
- **A:** [ ] A1 scaffold project + push (others wait ≤20 min — do P1 prep meanwhile) · [ ] A2 deploy pipeline live · [ ] A3 data layer + first real endpoint per contract
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

## Blockers / notes
