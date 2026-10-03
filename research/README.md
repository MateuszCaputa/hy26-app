> **Non-code knowledge base for the team.** Research on HackYeah 2026 tasks, past winners, rules PDFs, the idea tournament, and the earlier "Bateria" vision. **Not instructions for Claude sessions working on the app.** The app's source of truth is `/CLAUDE.md` and `/docs/`.

# HackYeah 2026: task research and decision folder

**Event:** HackYeah 2026, Tauron Arena Kraków, 3–4 Oct 2026. No overall grand prize: each task is its own contest.
**Source of truth:** https://hackyeah.pl/tasks-prizes (pulled from the site's CMS backend on 2026-10-03; raw JSON in `sources/tasks-2026.json`). Official rules and details PDFs are in `sources/pdf/`, with text versions in `sources/txt/`.

## The lens we decide through
> **Claude does the job.** Our own skills come second. We pick the task where Claude can produce the most judge-visible value per hour, and where we never get stuck on something Claude can't push through (proprietary toolchains, hardware, emulators, flaky external data).

## Files
| File | What's in it |
|---|---|
| `00-roi-matrix.md` | All 12 tasks scored side by side: prize, places paid, competition, Claude-fit, stuck-risk, wow potential |
| `01-past-winners.md` | 2023–2025 winners, the patterns that win, what judges reward |
| `02-claude-playbook.md` | What Claude builds fastest and most reliably, the stack to use, the traps, how to show the wow |
| `03-timeline-and-rules.md` | Deadlines, submission format, jury phases, AI-use policy, IP clauses |
| `tasks/P1-goldman-ai-control-layer.md` | Partner task: Goldman Sachs, 15k (6 / 5 / 4) |
| `tasks/P2-huawei-imagine-whats-next.md` | Partner task: Huawei HarmonyOS, 25k (12 / 8 / 5) |
| `tasks/P3-rops-hubmi.md` | Partner task: ROPS Małopolska social-innovation hub, 15k (6 / 5 / 4), Polish |
| `tasks/P4-superteam-solana.md` | Partner task: Superteam Solana, 11.3k |
| `tasks/P5-krakow-bez-barier.md` | Partner task: City of Kraków accessibility, 5k, Polish |
| `tasks/O1-defence.md` … `O5-impacther.md` | Open tasks: 8k each, one winner each |
| `tasks/X1-reentry-ctf.md`, `X2-prelint.md` | Side contests (CTF, Prelint credits) |
| `99-grill-log.md` | Decisions locked during grilling, with reasons |
