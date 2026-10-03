---
description: Start the next task in your area (A Kacper, B Marcin, C Mateusz, D Bartłomiej)
argument-hint: <A|B|C|D> [task ID, optional]
---
You are starting a work session on the HackYeah repo. Area / task: **$ARGUMENTS**
(If no area is given, ask once: "Which area are you: A Kacper, B Marcin, C Mateusz, D Bartłomiej?")

Do these in order:

1. **Read** `docs/SCOPE.md`, `docs/PLAN.md` and `docs/ENGINEERING.md` (CLAUDE.md is already loaded).
2. **Sync:** `git switch main && git pull --rebase origin main`. If `package-lock.json` changed, run `npm install`. Then run `npm run typecheck && npm test` so you know `main` is green before you touch anything. If `main` is red, report it and stop.
3. **Pick the task:** use the given task ID, or else the first unchecked `[ ]` task in this area in `docs/PLAN.md`, respecting MUST before SHOULD and the time gates at the top. Skip tasks marked `(@someone, in progress)`.
4. **Claim it:** edit only that line in `docs/PLAN.md` to append `(@<name>, in progress)`, commit `docs: claim <ID>`, then `git pull --rebase origin main && git push origin main`. This is a one-line commit straight to main, the only allowed exception.
5. **Branch:** `git switch -c <name>/<id>-<short-slug>`.
6. **Plan:** before writing code, show me:
   - the goal and which scoring criterion it moves
   - the files you'll touch (they must be in this area; flag any shared hot file)
   - the approach in 3–6 steps
   - how you'll verify it (tests + what to look at in the running app)
   - the risks and a fallback

   Keep it short. Then wait for my "go", unless the task is under ~30 lines, in which case proceed.
7. Build in small commits (`feat: <ID> …`). Add unit tests for any new `src/core/` logic. When finished, tell me to run `/ship`.
