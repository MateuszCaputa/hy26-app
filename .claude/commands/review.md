---
description: Senior self-review of the current diff against docs/ENGINEERING.md
---
Review `git diff main` like a strict senior reviewer, using `docs/ENGINEERING.md` and `docs/SCOPE.md`. Report findings ranked by severity, each with file:line and a concrete fix. Check:

1. **Demo risk:** can this crash or freeze the live view? Is there an unguarded frame loop, a per-frame allocation, or something that breaks offline? Is the FPS impact measured?
2. **Correctness:** edge cases (no face, no pose, low light, glasses, camera busy, empty DB, first run).
3. **Truthfulness:** is every number real or labelled demo data? Is there medical wording that sounds like a diagnosis? Are the privacy claims still true?
4. **Scope:** files outside the owner's area, drive-by changes, new dependencies, anything on the WON'T list.
5. **Code quality:** `src/core/` purity (no Electron/DOM), types in `src/shared/types.ts`, naming, dead code, `// HACK:` markers for shortcuts.
6. **Tests:** new core logic without tests, or tests that don't actually assert behaviour.
7. **Design:** does new UI follow ENGINEERING §8 (palette, motion, projector readability, short Polish copy)?
8. **Explainability:** could a teammate explain this to a judge in 2 sentences? If not, simplify or comment the *why*.

Then fix the high-severity items (ask first if a fix touches another area), and re-run typecheck and tests.
