# hy26-app — Hackathon project

3 developers, each running their own Claude Code, working in parallel on one repo under time pressure.
**Optimize for: a working demo, shipped fast, without stepping on each other.** Polish is secondary.

## Project

> TODO (fill in as soon as the brief is known — keep it to ~5 lines)
- **What we're building:**
- **Who it's for / the one demo flow that must work:**
- **Deadline / demo time:**

Work split and task list live in `docs/PLAN.md` — read it before starting any task, update it when you finish one.

## Stack & commands

> TODO (fill in once the stack is chosen — exact commands, no prose)

```bash
# install:
# dev:        (port: )
# build:
# lint/types:
# test:
```

## Team & ownership

| Person   | Area (directories they own) |
|----------|-----------------------------|
| Mateusz  | TODO                        |
| Dev 2    | TODO                        |
| Dev 3    | TODO                        |

- Stay inside your owner's area. Touching another area = tell that person first (or leave a note in `docs/PLAN.md`).
- **Shared hot files** (dependency manifest + lockfile, DB schema/migrations, shared types, route/nav registry, global styles, env config): pull right before editing, keep the change minimal, commit it on its own and push immediately so others rebase onto it.

## Git workflow (speed first)

- `main` must always build and run — it's what we demo from.
- Branch per task: `<name>/<short-task>` (e.g. `mateusz/auth-flow`). Short-lived: merge within ~1–2h.
- Sync often: `git pull --rebase origin main` before starting and before pushing.
- Merge via `gh pr create --fill` then `gh pr merge --squash --delete-branch`. No blocking reviews — only ping someone if you changed their area or a shared hot file.
- Commit messages: `feat: …`, `fix: …`, `chore: …`, `docs: …` — one line, imperative.
- Lockfile conflict: never hand-merge. Take `main`'s version, re-run install, commit.
- Never force-push `main`. Never rewrite someone else's branch.

## Rules for Claude

- **Scope:** do the task asked, in the owner's area. No drive-by refactors, renames, reformatting, or "cleanup" of files outside the task — every unrelated diff is a merge conflict for a teammate.
- **Dependencies:** don't add a package if ~20 lines of code will do. If you add one, say so explicitly in the summary (it touches a shared hot file).
- **Verify before claiming done:** run the build/typecheck and actually exercise the feature (run the app / hit the endpoint / Playwright). Report what you ran.
- **Prefer boring, proven solutions** and the stack's defaults. Hardcode/mock freely if it unblocks the demo — mark it `// HACK:` so we can find it.
- **Dev servers:** if you start one in the background, stop it when done. Parallel agents on one machine → use a git worktree and a different port.
- **Secrets:** never commit `.env*` (except `.env.example`). New env var → add it to `.env.example` with a placeholder and tell the user.
- **Keep docs live:** when you finish a task, tick it in `docs/PLAN.md`. If you learn something every agent needs (a command, a gotcha, a convention), add one line here.
- Ask only when blocked on a real product decision; otherwise pick the sensible default and state it.

## Definition of done

Builds, runs, feature works in the app, merged to `main`, task ticked in `docs/PLAN.md`.

## Gotchas

<!-- one line each, add as discovered -->
