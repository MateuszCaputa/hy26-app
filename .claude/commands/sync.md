---
description: Pull latest main into your branch and re-verify
---
1. `git stash` if there are uncommitted changes (tell me).
2. `git fetch origin && git rebase origin/main`. On conflicts: resolve them keeping both sides' intent. A lockfile conflict means you take `origin/main`'s version and run `npm install`. **Never** delete or overwrite other people's files to make a conflict go away. If unsure, stop and show me the conflict.
3. `git stash pop` if you stashed.
4. If `package-lock.json` changed: `npm install`.
5. Run `npm run typecheck && npm test`. Report green or red, plus a one-line summary of what other people merged since my last sync (`git log --oneline ORIG_HEAD..origin/main` or similar).
