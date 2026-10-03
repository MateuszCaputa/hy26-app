---
description: Verify, tick the task in PLAN, open the PR and squash-merge to main
argument-hint: [task ID, optional; defaults to the current branch's task]
---
Ship the current task: **$ARGUMENTS** (if empty, infer the ID from the branch name).

Stop and report at the first failure. Never skip a step and never claim success without the output.

1. **Self-check scope:** `git diff main --stat`. Every file must be in this person's area or be an announced shared hot file. Revert anything unrelated (drive-by reformatting, renames).
2. **Verify:**
   - `npm run typecheck`, which must be green
   - `npm test`, which must be green, with new tests present for new `src/core/` logic
   - `npm run build`
   - Ask me to run `npm start` (real camera) and/or `npm run demo` and confirm the feature works. Wait for my confirmation. If it's visual, ask me for a screenshot path to mention in the PR.
3. **Docs:**
   - in `docs/PLAN.md`, change this task's line to `[x]` and remove the "in progress" marker
   - if you learned a gotcha every agent needs, add one line to CLAUDE.md → Gotchas
   - add one line to `AI_USAGE.md` → "Built during HackYeah": `<feature> → PR #<n>`, filled in after the PR exists
4. **Sync:** `git pull --rebase origin main`. Resolve conflicts (a lockfile conflict means you take main's version, then `npm install`), then re-run typecheck and tests.
5. **PR:** `git push -u origin HEAD`, then `gh pr create --fill`. Edit the body so it has: the task ID, **how it works (2–3 lines, so the team can explain it to the jury)**, how it was verified, and screenshots if any.
6. **Merge:** `gh pr merge --squash --delete-branch`, then `git switch main && git pull --rebase origin main`.
7. Report in 3 lines: what shipped, the PR link, and the next unchecked task in this area.
