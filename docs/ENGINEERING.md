# ENGINEERING: the senior+ bar for this repo

> Every Claude session and every human follows this. Senior+ here doesn't mean more code. It means **fewer surprises**: the demo never breaks, every claim is true, and every change is easy to merge.

## 1. Mindset
- **The demo is the product.** Any change that risks the 3-minute demo needs a reason, and a fallback.
- **Outcome over output.** Before coding, write one line: *which scoring criterion does this move, and by how much?* If none, don't build it.
- **Smallest change that fully works.** Finish one thing end to end before starting the next. Half-done features are worse than absent ones (Completeness 10%, and they crash on stage).
- **Make it true, then make it pretty, then make it fast.** In that order, but all three before the freeze.
- **Own it end to end:** build → run → see it work → test → merge → tick in `docs/PLAN.md` → tell the team in one line.

## 2. Code standards (this codebase)
- **TypeScript strict.** No `any` without a `// HACK:` comment saying why. Shared shapes live in `src/shared/types.ts`; extend, don't duplicate.
- **`src/core/` stays pure:** no Electron, DOM or I/O. Every new metric, score or rule goes there with a unit test in `test/`. This is our proof of rigour for the judges.
- **Renderer draws, core decides.** No business rules in drawing code.
- **IPC contract** is in `src/shared/api.ts`: typed, versioned by name, never stringly-typed ad-hoc channels.
- Follow existing patterns (filters like `oneEuro.ts`, hysteresis in `scoring.ts`, Polish UI strings in `coach.ts`). **Read before you write.**
- Names say what things are (`perclos60s`, not `p`). Comments explain *why*, not *what*.
- No new dependency if ~20 lines will do. New deps go through the integrator (they're a shared hot file).

## 3. Reliability rules (stage-proof)
- **Offline-first:** models, fonts and assets are bundled. No network on the demo path. Garmin and AI are optional and degrade silently to cached or canned data.
- **Never crash the live view:** guard every frame loop, catch per-panel errors, and show a calm fallback state ("no face, check the light") instead of a blank screen.
- **Performance budget:** at least 24 FPS on the demo laptop with the overlay ON. Measure after every visual change. Reuse arrays in hot loops; no allocations per landmark per frame.
- **Deterministic demo mode:** seeded data and scripted events, so the same story plays every time.
- **Graceful permissions:** camera denied, camera busy (Teams/Zoom), no Accessibility permission. Each has a friendly path.

## 4. Truthfulness (judges and AI policy)
- Every number on screen comes from a real computation or is **labelled as demo data**.
- **No medical claims.** Wording: "may indicate", "consider talking to", never "you have". Red flags → 112 / NFZ TIP 800 190 590.
- Privacy claims must be literally true: no frames stored or sent. If the AI coach is on, show exactly what numbers are sent.
- The team must be able to **explain every module** (HackYeah AI policy: functionality you can't explain hurts the score). Every PR description says *how it works* in 2–3 lines.
- Keep `AI_USAGE.md` updated: tools used, what was pre-existing (Kacper's Postura prototype, Marcin's Rytm ideas) vs built during HackYeah.

## 5. Testing & verification (definition of done)
1. `npm run typecheck` is green.
2. `npm test` is green, **with new tests for new core logic**.
3. `npm start`: you saw the feature work with a real camera.
4. `npm run demo`: the demo path still works.
5. Screenshot or GIF in the PR when it's visual.

A claim of "done" without steps 1–4 is not done.

## 6. Git & collaboration (details in `docs/TEAM.md`)
- Branch `<name>/<task>` → PR → squash merge. Small PRs, under ~300 lines changed, merged within 1–2h.
- `git pull --rebase origin main` before you start and before you push.
- **Never** force-push `main`, never delete other people's files, never replace the codebase without a team decision.
- Touching another person's area or a shared hot file? Say it in chat first.
- Commit messages: `feat|fix|chore|docs: what changed`, one line.

## 7. Working with Claude (to get senior output)
- Start every session with: *"Read CLAUDE.md, docs/SCOPE.md, docs/ENGINEERING.md and docs/PLAN.md. I own area X. Take the next unchecked task in my area."*
- Ask Claude to **plan first** (files to touch, approach, risks) for anything bigger than about 30 lines; review the plan, then let it build.
- Make Claude **run** things (typecheck, tests, the app) and report the output. Don't accept "should work".
- One task per session. When context gets long, finish, merge, start fresh.
- If Claude proposes a refactor, a new library or a rewrite: **no**, unless it's the task.
- Before merging, ask: *"Review your diff against docs/ENGINEERING.md. What would a senior reviewer flag?"*

## 8. Design bar (Design = 20%)
- One visual language: dark UI, neon accents (cyan / magenta / lime, amber for warning, red for alert), one font family + mono for numbers.
- Motion with purpose: score and battery changes animate; alerts fade, never pop.
- Every screen passes the "projector test": readable from 5 m, high contrast, big numbers.
- Polish copy is short, warm and imperative ("Cofnij brodę." — "Pull your chin back."). No jargon on primary screens; details are one click away.
