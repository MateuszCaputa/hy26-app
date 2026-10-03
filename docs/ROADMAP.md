# ROADMAP: the one path to the finish (read this before PLAN.md)

> `docs/PLAN.md` is the backlog (everything we *could* do). **This file is the order we actually do things in.**
> If a task isn't on this roadmap for the current phase, don't start it.
> Written Sat 16:35. Deadline assumed **Sun 11:00** until D1 confirms (if it's 23:00, phases 4–5 shift to the evening; nothing else changes).

---

## 1. The end state: what the jury sees on Sunday

**One app, five screens, one 3-minute story, works offline.**

```
┌ Na żywo ──────────────────────────────────────────────────────────────┐
│ [camera, darkened]                          BATERIA  73%  ▁▂▃▅▆▇▆▅      │
│   neon face mesh (cyan, glowing eyes/iris)  ⚠ Spadek <30% za ~40 min    │
│   posture line + shoulders (state colour)   → „Cofnij brodę."           │
│   ideal-head ring                           Przerwa za 12 min           │
│                                             ▸ Szczegóły pomiaru         │
└────────────────────────────────────────────────────────────────────────┘
┌ Przerwa / ćwiczenie ─────────┐ ┌ Statystyki ──────────────────────────┐
│ „Przerwa teraz, bo:          │ │ Day rhythm + best hours heat map     │
│  • PERCLOS 18% (norma <10%)  │ │ „Spadek ok. 14:00, najlepsze 9–11"   │
│  • 52 min bez przerwy"       │ │ Najczęstszy problem + co poprawić    │
│ Chin tuck  ▓▓▓▓▓░ 5/8 ✓      │ │ ZESPÓŁ: our 4 people's 24 h (hook)   │
│ camera counts → Bateria ↑    │ └──────────────────────────────────────┘
└──────────────────────────────┘
┌ Raport dla lekarza ──────────────────┐   ┌ Widget (corner, always on top) ┐
│ 14-day pattern, top issues, fatigue, │   │ ● 73%  posture ok  12 min      │
│ sleep; „częste przyczyny" (no diag.) │   └────────────────────────────────┘
│ NFZ path: GP / fizjo / okulista,     │
│ TIP 800 190 590, red flags → 112     │   + Settings (simple / advanced)
│ [Pobierz PDF]                        │   + Demo mode: the whole story, offline
└──────────────────────────────────────┘
```

**The story (each beat = one screen = one brief pillar):**

| # | Beat | What happens | Pillar |
|---|---|---|---|
| 1 | Hook | "This is our team's last 24 h" (Statystyki → Zespół) | wellbeing |
| 2 | Wow | Live: neon mesh lights up, Bateria 73%, forecast | physical health |
| 3 | Slouch | The score drops; the alert says *why now* | decisions |
| 4 | Break | The camera counts chin tucks; Bateria recharges | sport |
| 5 | Rhythm | Best hours, the 14:00 crash, the sleep effect | wellbeing |
| 6 | Care | The 14-day pattern produces the doctor report and the NFZ path | **access to care** |
| 7 | Close | "0 bytes of video left this laptop"; vs Straighty and Rest & Blink | |

**Not in the final app (cut, don't start):** phone import (B6), "what if" (B7), body strands (MP8), hands (MP10), real accounts, web build. The AI coach (B4) is built only if D1 confirms dual entry to the AI category.

---

## 2. Phases & gates

### Phase 0: UNBLOCK (16:45 → 17:15), everyone
- [x] **0.1 Mateusz: merged Kacper's stacked PRs #72 → #73 → #74** (Sat ~17:00; conflicts resolved keeping Kacper's side, MP1 fix preserved, 55/55 tests). Resolve `analyzer.ts` / `types.ts` conflicts by keeping both sides. Afterwards **everyone runs `git pull --rebase origin main`**.
- [ ] **0.2 Bartłomiej: D1 now.** Deadline 11:00 or 23:00? Dual entry with AI? Post in team chat and at the top of this file.
- [ ] **0.3 Bartłomiej: start the team experiment.** All 4 keep Postura running from now on (laptop lids open). Export data at 20:00, 02:00 and 07:00. This is pitch beat 1.
- [ ] **0.4 Each dev:** read this file and claim your Phase 1 tasks in PLAN.md (`/start`).

### Phase 1: DEMO SPINE (17:15 → 20:00), story beats 2, 3, 4 and 6 working (ugly is OK)
| Who | Task (PLAN ID) | Done when |
|---|---|---|
| **Kacper** | **A3** `core/explain.ts` "why now" + **A4** `core/exerciseVerify.ts` (chin tuck, shoulder blades) | An alert carries ≥ 2 evidence lines; the camera counts reps |
| **Marcin** | **B2** NFZ card (claimed) → **B1** doctor report screen + **A7** a simple `carePattern` (or seeded) | The report opens from Stats, shows the pattern and the NFZ path, prints to PDF |
| **Mateusz** | **MP7** neon face mesh → **C6** exercise screen UI wired to A4 | Mesh at ≥ 24 fps; the exercise screen shows reps + Bateria going up |
| **Bartłomiej** | D2 mentors visit · D3 BHP rule · D4 stats · **D5 the pitch script v1** | The script is timed under 3:00 and every claim has a source |

**🚦 GATE 20:00, everyone stops for 10 minutes:** click through beats 2→3→4→6 on `main`. Anything broken is fixed before new work starts.

### Phase 2: TRUE & STAGE-PROOF (20:00 → 00:00)
| Who | Task |
|---|---|
| Kacper | **A1** bundle the models offline (test with wifi OFF) · **MP6** blinks with glasses (Mateusz wears glasses; it showed 0/min) · **MP2** verify pause/resume |
| Marcin | **B3** "why now" in notifications and the break screen · **B5** Team view (beat 1) from the exported data |
| Mateusz | **MP9** smooth overlay (60 fps interpolation) · **I2** scripted demo mode (the whole story in 3 min, offline) · merges every 90 min |
| Bartłomiej | **D9** user test at 21:00 (5 confusing things → PLAN) · **D6** slides v1 with screenshots |

**🚦 GATE 00:00:** the full story beats 1→7 runs in demo mode **offline**, twice in a row, without a crash.

### Phase 3: POLISH (00:00 → 06:00), sleep in shifts (2 people sleep while 2 work, swap at 03:00)
- **C7** one visual pass (palette, type, projector test) · **C8** empty and error states · **C4** demo-intensity hotkey
- **A2** FPS check with everything on · **A9** formulas in the README
- **B4** AI coach, *only if dual entry to AI is confirmed*
- **I3** macOS `.dmg` · **I4** README · `AI_USAGE.md` up to date

**🚦 GATE 06:00:** D9 user test #2. Fix only what's broken.

### Phase 4: FREEZE (07:00), no new features after this, bug fixes only
### Phase 5: SHIP (07:00 → 10:00)
- 07:00–08:30 **D7 video** (screen recording in demo mode + voice-over) · **C9** screenshots
- 08:30–09:30 **D6** final slides PDF · **D8** HackTribe text · **I5** tag `v1.0-submission`
- 09:30–10:00 **D10 submit** · confirmation screenshot in team chat
- 10:00+ **D11** rehearse the pitch 3× and the Q&A

---

## 3. Rules that stop the chaos
1. **Only roadmap tasks for the current phase.** A new idea goes in PLAN.md → "Found issues / notes". Don't build it.
2. **One task per person at a time.** Claim it, ship it (`/ship`), then claim the next.
3. **A PR open more than 60 min is a problem.** Mateusz merges within 30 min of a PR being green; if it's stuck, say so in chat.
4. **Every 90 min, `main` must run.** If it doesn't, the person who broke it fixes it before anything else.
5. **At each gate everyone stops,** clicks through the story together for 10 min, and decides what to cut. Bartłomiej (demo captain) has the final word on cuts.
6. **Never cut:** the neon mesh, Bateria, the alert with "why", the verified exercise, the doctor report + NFZ, offline demo mode.
