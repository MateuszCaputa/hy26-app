# Idea tournament brief (read first)

**Context:** HackYeah 2026, Tauron Arena Kraków.
- It's **Saturday about 12:30**. Hard submission deadline is **Sunday 11:00**, about 22h left including sleep.
- Feature freeze is at about 07:00 Sunday.
- Submissions go through the HackTribe platform.

**Team:** 4 people. 3 programmers (web / Next.js comfortable). The 4th is non-technical: pitch, slides, video, talking to mentors.
- **Zero cybersecurity knowledge.** The team is reluctant to be attacked live or questioned on security.
- 3 laptops with Claude subscriptions (Claude Code, parallel git worktrees). The dev laptop is an M2 Pro with 16 GB RAM.
- Can pitch in Polish **and** English.

**Principle:** **Claude does the job.** Human skills come second.
- Pick what Claude can build fastest and best, with judge-visible output.
- **Never get stuck** on proprietary toolchains, hardware or emulators.

**Goal:** **maximise the probability of ANY podium finish.**

**Settled decisions:**
- Huawei / HarmonyOS is EXCLUDED: an unfamiliar toolchain that Claude is weak on.
- IP transfer is OK.
- Claude API inside the product is affordable (about $0.02 per call).

**Read these files (all in /Users/mateuszcaputa/Code/hy26-app/research/):**
- `00-roi-matrix.md`: all 12 tasks, prizes, places, odds
- `01-past-winners.md`: what won 2023–2025 and why
- `02-claude-playbook.md`: what Claude builds best, traps, wow patterns
- `03-timeline-and-rules.md`: rules, judging phases, AI policy, 50% threshold
- `tasks/*.md`: each task's brief, scoring weights, risks
- `sources/txt/*.txt`: original task PDFs (Polish/English) if you need exact wording
- `sources/data/innowacje.json`: **115 real ROPS social innovations, scraped** (CC BY 4.0)
- Real data also available:
  - GUS BDL API, per-gmina population and 65+ share for Małopolska (unit 011200000000, variables 72305 / 72239 / 72240). Rate-limited; a script is at `sources/data/fetch_bdl_gminy.py`.
  - obserwator.rops.krakow.pl, gmina-level social statistics.
  - The ROPS Mapa Wyzwań PDF.
- **Multiple-task entry:** probably allowed; no rule forbids entering the same project in a partner task plus an open task. Not yet confirmed.

**Current front-runner:** HubMI (ROPS, 15k, 3 places, Polish).
- Each module scores +5%. WCAG AA is worth 20%.
- Candidate headline ideas:
  - (A) "Radar Potrzeb": proactively match gminy, by demographics, to proven innovations, shown on a map
  - (B) voice-first for seniors
  - (C) the innovation library exposed as MCP/API for AI assistants
- **You are free to overturn it.**
