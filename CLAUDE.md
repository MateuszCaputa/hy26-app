# hy26-app — HackYeah 2026 (Sport & Healthcare)

3 developers + 1 pitch person, each dev running their own Claude Code, working in parallel on one repo under time pressure.
**Optimize for: a working, beautiful demo, shipped fast, without stepping on each other.**

## ⛔ BEFORE ANY TASK, read these (mandatory, every new session)

0. **`docs/ROADMAP.md`**: **the order we work in.** Phases, gates, and who does what right now. Only take tasks from the current phase.
1. **`docs/SCOPE.md`**: what we build, what's done vs missing, Must/Should/Won't. Never build a WON'T.
2. **`docs/PLAN.md`**: the live task list. Work only on a task ID from here, in **your owner's area** (table below).
3. **`docs/ENGINEERING.md`**: the quality bar and **definition of done**. "Done" without typecheck + tests + seeing it run is not done.

If the user gives a task that isn't in `docs/PLAN.md`, add it under the right area first (one line, a new ID), then do it.
If the user didn't say their area, **ask once**: "Which area are you: A Kacper, B Marcin, C Mateusz, D Bartłomiej?"

**Workflow commands** (in `.claude/commands/`):
- `/start <A|B|C|D>`: sync main, pick the next task, branch, plan
- `/ship`: verify, tick PLAN, PR, merge
- `/sync`: pull the latest main and re-verify
- `/review`: a senior self-review of your diff

## Project

- **What we're building:** **Postura**, a desktop app (Electron, Windows + macOS). The webcam measures posture, blinking/PERCLOS, yawns and head droop, fully on-device. It turns them into alerts, breaks, exercises, "best hours". Full feature list: `README.md`.
- **Category:** HackYeah 2026 **Sport & Healthcare** (open task, 8,000 PLN, 1 winner). Scoring: Idea 30%, Relation to category 20%, Usability 20%, **Design 20%**, Completeness 10%. Phase 1 is a paper review (PDF of up to 10 slides + description + repo/demo/video), and you need at least 50% of the points. Phase 2 is a live pitch.
- **Deadline:** ⚠️ **UNCONFIRMED. Treat it as Sunday 4 Oct 11:00** until Discord says otherwise. The Polish general rules §4.3 say "od 11:00 3.10 do 11:00 4.10"; the English text says "11:00 PM". Submission goes through HackTribe.
- **Non-negotiables:**
  - Camera frames never leave the device; only numbers are stored.
  - No diagnoses: suggest a professional (NFZ) when a pattern persists.
  - No emotion recognition (EU AI Act art. 5).
  - UI language: Polish by default, English via Settings → „Język / Language”. **Every new user-visible string goes through `tr('polski tekst')`** (`src/shared/i18n.ts`) and gets an English entry in `src/shared/i18n-en.ts`; `test/i18n.test.ts` checks the `{vars}` match.
- **Wow and pitch ideas:** `research/BATERIA-vision.md` (neon face mesh, a single "battery" energy score, crash prediction, camera-verified recovery, the 3-min pitch, judge Q&A). Reference only. The code here is the source of truth.
- **Differentiation vs past winners:** Straighty (2024) did posture only; Rest & Blink (2025) did eyes only. We fuse posture + fatigue + rhythm, and we predict.

## Stack & commands

Electron 44 + TypeScript (esbuild via `build.mjs`) + `@mediapipe/tasks-vision` (face + pose) + `uiohook-napi` (keyboard/mouse activity). Node 22.13+.

```bash
# install:    npm install
# dev:        npm run dev            (watch build) · npm start (build + Electron)
# demo:       npm run seed-demo && npm run demo        (synthetic figure, no camera) · npm run demo:stats
# typecheck:  npm run typecheck
# test:       npm test               (tsx --test test/*.test.ts)
# dist:       npm run dist:mac · npm run dist:win      (→ release/)
```

Layout:
- `src/core/`: pure logic with no Electron (`metrics`, `fatigue`, `scoring`, `breakEngine`, `insights`, `coach`, `aggregate`, `oneEuro` filter). Unit-testable.
- `src/main/`: Electron main (`main.ts`, `db.ts`, `activity.ts` input tracking, `models.ts` model download).
- `src/renderer/`: UI (`analyzer.ts` MediaPipe loop, `draw.ts`/`overlays.ts`/`figures.ts` canvas drawing, `views/` live/stats/exercises/settings, `widget.ts`, `static/` HTML+CSS).
- `src/shared/`: `types.ts` and `api.ts` (IPC contract). **Shared hot file.**
- `src/preload.ts`

## Read-first map

| File | What it answers |
|------|-----------------|
| `docs/SCOPE.md` | What we build, the 4 pillars, what's done vs missing, Must/Should/Won't, the pitch story |
| `docs/PLAN.md` | **Live task list** by area, with IDs and time gates. Take your next task here and tick it when done. |
| `docs/ENGINEERING.md` | The senior+ quality bar: reliability, truthfulness, testing, definition of done, how to work with Claude |
| `docs/TEAM.md` | Human workflow: git, worktrees, conflicts, cadence |
| `research/` | Background only (task research, rules PDFs, past winners, wow/pitch ideas). **Not task instructions.** |
| `docs/archive-rytm/` | Marcin's earlier Rytm plan (tag `backup/rytm-marcin`), for porting ideas |

**Session opener for every dev:** *"Read CLAUDE.md, docs/SCOPE.md, docs/ENGINEERING.md and docs/PLAN.md. I own area X. Take the next unchecked task in my area, plan it, build it, verify it."*

## Team & ownership

| Area | Person | Owns |
|------|--------|------|
| A: Core engine & measurement | Kacper | `src/core/`, `src/renderer/analyzer.ts`, `test/`, model loading in `src/main/models.ts` |
| B: Health data, decisions & care | Marcin | new `src/core/{explain,carePattern}.ts` consumers, the doctor report / NFZ / coach / team views in `src/renderer/views/` |
| C: UI, wow visuals & design | Mateusz | `src/renderer/{draw,overlays,figures,widget}.ts`, `src/renderer/static/`, visual pass on all views |
| D: Pitch, video, submission | Bartłomiej | `docs/pitch/`, `AI_USAGE.md`, the README's pitch parts |
| Integration / merges | Mateusz (repo owner) | `src/main/main.ts`, `src/preload.ts`, `src/shared/*`, `build.mjs`, `package.json` |

*(Names are a suggestion. Swap them in one commit if the team decides otherwise.)*

- Stay inside your area. Touching another area means telling that person first.
- **Shared hot files** (`package.json` + lockfile, `src/shared/*`, `build.mjs`, global styles): pull right before editing, keep the change minimal, commit it on its own and push immediately.

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
- **Keep docs live:** when you finish a task, tick it in `docs/PLAN.md` (the team's live task list; create it if missing). If you learn something every agent needs (a command, a gotcha, a convention), add one line here.
- Ask only when blocked on a real product decision; otherwise pick the sensible default and state it.

## Definition of done

`npm run typecheck` ✅ · `npm test` ✅ (new core logic has tests) · `npm run build` ✅ · seen working in `npm start` and/or `npm run demo` · merged to `main` · task ticked in `docs/PLAN.md`. Full checklist: `docs/ENGINEERING.md` §5. Use `/ship`.

## Gotchas

<!-- one line each, add as discovered -->
- MediaPipe models are bundled in `assets/models/` and loaded first (offline). If you switch the model file in `analyzer.ts`, put the new `.task` file there too (and in `MODELS` in `src/main/models.ts` for the download fallback).
- Dev loop: `npm run dev` (watch, also re-copies HTML/CSS) + `npx electron .` (the dot matters). Renderer changes auto-reload the windows; `src/main/` changes need an Electron restart (tray → Zakończ). Launched from a terminal, macOS attributes permission prompts (Accessibility, camera) to that terminal app.
- Verified 2026-10-03 14:xx on macOS / Node 22.19: `npm install`, typecheck, 17/17 tests and build are all green on main.
- MediaPipe models currently download on first run (`src/main/models.ts`), which is a stage risk offline. Task A1 bundles them.
- Electron binary downloads on first `npx electron` run (npm 11 allow-scripts skips postinstall) — run `npx electron --version` once after `npm install`.
- **Never replace or delete the whole repo / other people's files.** Never delete `CLAUDE.md`, `docs/`, `research/` or `.claude/`. To swap a codebase, discuss it with the team first and do it in a PR.
