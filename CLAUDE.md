# hy26-app — Hackathon project

3 developers, each running their own Claude Code, working in parallel on one repo under time pressure.
**Optimize for: a working demo, shipped fast, without stepping on each other.** Polish is secondary.

## Project

- **What we're building:** **Rytm** — desktop health assistant for people who work at a computer. Webcam (posture, blinking/PERCLOS, yawns, time at desk) + imported phone data (Apple Health incl. Fitatu, Samsung Health) → in-the-moment decisions ("take a break now, because…"), a "what if" screen and a report for the doctor with the NFZ path. Category: HackYeah 2026 Sport & Healthcare.
- **Who it's for / the one demo flow that must work:** desk workers; pitch opens with our own team's data measured during the hackathon. Flow: Start (interview + calibration) → Live → Day rhythm → Decision now → What if → Doctor report.
- **Deadline / demo time:** submission on HackTribe by **Oct 4, 22:00** (hard limit 23:00) — PDF ≤10 slides.
- **Non-negotiables:** camera frames never leave the device (only per-minute numbers are stored); no emotion recognition (EU AI Act art. 5); no diagnoses — "common causes matching your data" + red flags → 112 / NFZ TIP 800 190 590. UI language: Polish.

Work split and task list live in `docs/PLAN.md` — read it before starting any task, update it when you finish one.
Human workflow (git, worktrees, conflict handling, cadence) is in `docs/TEAM.md`; follow the same conventions.

## Stack & commands

Electron 44 + React 19 + Vite 8 (plain JS) + `@mediapipe/tasks-vision` (face + pose, models/WASM served locally from `public/`) + IndexedDB. Node 20+.

```bash
# install:    npm ci
# dev:        npm run dev            (port: 5173, browser) · npm run desktop:dev (Electron window on the dev server)
# desktop:    npm run desktop        (build + Electron)
# build:      npx vite build · npm run dist:win (portable exe → release/) · npm run dist:mac (only on a Mac)
# lint/types: npx oxlint src
# test:       node scripts/desktop-smoke.mjs (after vite build; fake camera, checks models load + measuring while hidden)
```

Layout: `src/lib/` measurement core (`monitor.js` camera loop, `metrics.js` posture/fatigue math, `db.js` IndexedDB) · `src/screens/` one file per screen · `electron/main.cjs` desktop shell (app:// protocol, tray, camera permission).

## Team & ownership

| Person   | Area (directories they own) |
|----------|-----------------------------|
| Marcin   | Lane 1 — camera & app: `src/lib/{monitor,metrics,useMonitor,decide}.js`, `ticker.worker.js`, `src/screens/{Start,Live,Day,Data}.jsx`, `src/components/`, `electron/`, `scripts/` |
| Mateusz  | Lane 2 — phone data & what-if: `src/lib/health/`, `src/lib/whatif.js`, `src/screens/{Import,WhatIf}.jsx`, `public/sample/` |
| Dev 3    | Lane 3 — doctor report, NFZ & pitch: `src/lib/{report,nfz}.js`, `src/screens/Report.jsx`, `docs/pitch/` |

Shared contract (data shapes between lanes) and hot-file rules: `docs/PLAN.md` → "Contract" and "Hot files". Build against stubs of the contract; never block on another lane.

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
- Electron binary downloads on first `npx electron` run (npm 11 allow-scripts skips postinstall) — run `npx electron --version` once after `npm ci`.
- `dist:win` failed with EPERM rename (Defender lock) → `build.electronDist` points at `node_modules/electron/dist`; keep it.
- Asset paths must be relative (`import.meta.env.BASE_URL`, vite `base: './'`) — the desktop app loads from `app://rytm/`, absolute `/x` paths break.
- The worker ticker delivered ~2× ticks in Chromium; `monitor.tick()` has a hard rate limit — don't remove it.
- Real team data lives in `%APPDATA%/rytm` (IndexedDB) + auto-backups in `Documents/Rytm/` (every 10 min, `rytm-latest.json` + hourly files). **Never delete these.** Smoke tests set `RYTM_TEST_DIR` so they use a temp userData + backup dir — any new Electron test must do the same.
