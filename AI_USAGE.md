# AI usage & provenance (HackYeah 2026 disclosure)

## Pre-existing work (before 3 Oct 2026, 11:00)
- `Postura` prototype by Kacper Smaga: the core posture/fatigue analysis and Electron shell (imported in commit `345cf6e`). *Kacper: describe exactly what existed before the event.*
- Ideas ported from Marcin Pałys' `Rytm` prototype (tag `backup/rytm-marcin`).

## Built during HackYeah
- *(fill in as PRs merge: feature → PR #)*
- Camera freeze fix: analyse only fresh frames, resume preview after view switch (MP1) → PR #71
- Quick glance: live posture score next to the tray icon, tray quick menu with actions, dev auto-reload, FEATURES.md (C10) → PR #76
- MediaPipe-style overlay (eyelid/iris contours showing blinks, glowing skeleton) + Windows tray score (MP7) → PR #78
- Two mini-widget styles (card / pill), click to open, drag to move (C11) → PR #79
- Smooth 60 fps overlay: rAF drawing + landmark following between pose measurements (MP9) → PR #80
- Calm nudges next to the widget: 20-20-20 countdown, break Start/snooze, posture tip (C13) → PR #82
- Models bundled for offline start (A1) → PR #87
- No fatigue score on unreliable eye data; 2+ min away from the desk counts as a break (A13, A14) → PR #77
- Whole-number posture score in widget/tray; widget text ellipsis (A15, C12) → PR #81
- Stats: breaks/alerts on the day chart, norms and vs-yesterday under figures, 7-day bar charts for fatigue and good posture (C14, C15) → PR #83
- Posture figure in the live panel that mirrors the top issue with a correction arrow (C16, mentor feedback F3) → PR #85
- Side menu: camera/gear icons, „Kalibruj” button in place of „Wstrzymaj” (C17) → PR #88

## AI tools used
- **Claude Code** (Anthropic): used by all developers for planning, implementation, tests, docs and review. Every module is understood and can be explained by the team.
- **MediaPipe Tasks Vision** (Google): on-device face and pose landmark models; video frames never leave the device.
- **Claude API** *(only if the AI coach ships)*: receives aggregated numbers only (no images), opt-in.

## How AI output was validated
- Unit tests for all core logic (`npm test`), typecheck, manual verification with a real camera, scripted demo runs.
