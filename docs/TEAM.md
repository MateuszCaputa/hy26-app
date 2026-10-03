# Team playbook — read this first (5 min)

How three of us + three Claudes ship one demo without tripping over each other.
Rules for the agents live in `/CLAUDE.md`; the backlog lives in `docs/PLAN.md`. This file is for humans.

---

## 0. Setup (once, ~3 min)

```bash
git clone git@github.com:MateuszCaputa/hy26-app.git
cd hy26-app
# install + run commands: see "Stack & commands" in CLAUDE.md
claude            # Claude Code reads CLAUDE.md automatically
```

Accept the GitHub invite first, or the clone fails.

---

## 1. The five principles

1. **The demo is the product.** Every hour ask: "does this make the demo flow better?" If not, it's backlog.
2. **Walking skeleton first.** A thin end-to-end path (UI → logic → data → back to UI) that works badly beats three polished halves that don't connect. Target: **skeleton on `main` by ~hour 3**.
3. **Contract before code.** We agree the shared data shapes / API (one types file or schema) early. Then each lane builds against **mocks** of the other lanes and nobody waits on anybody.
4. **Integrate continuously.** Merge small and often (every 1–2h). A branch living 6 hours is a merge hell waiting to happen. Everything in `main` must still run.
5. **Own an area, not a file list.** Each person owns directories (see CLAUDE.md → Team & ownership). Merge conflicts happen when two people edit the same file. Ownership removes 90% of them; the rest come from the *shared hot files* — handle those deliberately (§4).

---

## 2. Daily git loop (the only commands you need)

```bash
git switch main && git pull --rebase           # start from fresh main
git switch -c mateusz/login-form               # <name>/<task>

# ...work, commit small...
git add -p && git commit -m "feat: login form posts to /api/session"

git pull --rebase origin main                  # pick up others' work, fix conflicts locally
git push -u origin HEAD
gh pr create --fill                            # PR title/body from your commits
gh pr merge --squash --delete-branch           # merge yourself once it builds & runs
```

- **Rebase, don't merge** `main` into your branch — keeps history linear and conflicts small.
- Mid-rebase conflict: fix files → `git add <file>` → `git rebase --continue`. Panic button: `git rebase --abort`.
- Committed to `main` by accident (not pushed yet): `git switch -c my/branch` — the commit comes with you; then `git switch main && git reset --hard origin/main`.
- **Never** `push --force` on `main`. On your own branch after a rebase: `git push --force-with-lease` is fine.
- You can tell Claude "commit, push and open a PR" — it follows CLAUDE.md conventions.

---

## 3. Git worktrees — running 2+ Claudes in parallel on one laptop

A worktree is a **second checkout of the same repo in another folder, on another branch**, sharing one `.git`. You can have Claude A building the API in one folder while Claude B builds the UI in another — no stashing, no branch switching, no agents overwriting each other's files.

**Easiest — let Claude Code do it:**
```bash
claude -w login-form        # creates a worktree + branch and starts Claude inside it
```

**Manual (full control):**
```bash
git fetch origin
git worktree add ../hy26-wt/login-form -b mateusz/login-form origin/main
cd ../hy26-wt/login-form
# install deps here (each worktree has its own node_modules / venv)
cp ../../hy26-app/.env .env      # .env is gitignored, so copy it in
claude
```

**After merge — clean up:**
```bash
git worktree list                              # see all of them
git worktree remove ../hy26-wt/login-form      # delete the folder (refuses if uncommitted changes)
git worktree prune                             # forget folders you deleted by hand
```

Rules of thumb:
- **One branch per worktree.** Git won't let the same branch be checked out twice — that's a feature.
- **Different dev-server port per worktree** (e.g. 3000, 3001, 3002) or they'll collide.
- Worktrees on one laptop are still separate branches → same rule: merge small and often.
- Don't run more parallel agents than you can actually review. 2 per person is usually the sweet spot; reviewing is the bottleneck, not typing.

---

## 4. Avoiding conflicts (concretely)

**Shared hot files** — dependency manifest + lockfile, DB schema/migrations, shared types/API contract, route registry / nav, global styles, env config.

- Pull right before touching one. Make the minimal change. **Commit it alone, push it immediately**, post "pushed X, rebase" in chat.
- **Lockfile conflict:** never merge by hand → `git checkout --theirs <lockfile>` (or take main's), re-run install, commit.
- **New page/route:** add your own file in your own folder; only the one-line registration touches the shared file.
- **Need a change in someone else's area?** Ask them, or do it in a tiny separate PR and tell them. Don't sneak it into your feature branch.
- **Mocks live with the consumer**, behind the agreed contract, so swapping mock → real is a one-line change.

---

## 5. Working with Claude well

- **Give it the task id + acceptance criteria** from `docs/PLAN.md`: "Do B3. Done when the list shows real items from the API and loads under 1s." Vague asks → vague code.
- **Plan first for anything > 30 min:** ask for a plan, sanity-check it in 1 minute, then let it go. Cheaper than undoing a wrong direction.
- **Keep sessions focused:** one task per session/worktree. Start a fresh session for a new task instead of an endless one.
- **Make it prove it:** "run it and show me" — CLAUDE.md requires it to verify, but ask anyway.
- **Teach it once:** if you correct Claude on something every agent should know, have it add one line to CLAUDE.md → Gotchas, commit and push. Everyone's Claude gets smarter.
- Useful: `/grill-me` (stress-test an idea), Playwright (it can click through the app), `/code-review` before a risky merge.

---

## 6. Communication cadence

- **Kickoff (15 min):** read brief → pick idea → pick stack → agree contract → assign lanes. Decide fast; a good decision now beats a perfect one in an hour.
- **Sync every ~2h (5 min, standing):** what merged, what's blocked, is the demo flow still on track? Re-cut scope here, not at the end.
- **Blocked > 20 min → say it.** Sitting quietly stuck is the most expensive thing in a hackathon.
- **Feature freeze** at T-3h (see PLAN). After that: bug fixes, seed data, demo polish only.

---

## 7. Demo insurance

- Deploy early (first hour if possible) so we never demo from `localhost` by surprise.
- Seed realistic demo data; never rely on live typing during the pitch.
- **Record a backup video** of the full flow once it works. Wi-Fi at events fails.
- One person owns the pitch + demo script from the start, not at the end.
