# VERDICT: idea tournament (7 advocates, 3 judges)

**All 3 judges independently chose HubMI, as a merge of proposals 06 + 04 + 05 (+ pieces of 01 and 02).**

## Product: "Sadzonka" (name chosen by the jury judge)
> Weź sprawdzoną innowację i posadź ją w swojej gminie.
> ("Take a proven innovation and plant it in your gmina.")

### Hero path (must work end to end on the deployed URL by 19:00 Saturday)
1. **Problem intake** (from 06): a social worker types a problem or dictates it by voice in Chrome, either for herself or **"Zgłaszam w imieniu"** (filing on behalf of) Pani Halina, 74, gmina Biecz. Personal details are anonymised.
2. **Matcher** (from 05): the whole 115-innovation ROPS library sits in one cached Claude prompt. Output is structured: the top 3, each with a **verbatim quote** and "why it fits". **Only valid library IDs are allowed**, so it can't hallucinate innovations.
3. **"Posadź w Bieczu"** (from 04): a gmina card built from real GUS BDL data, plus an implementation package (adapted service = Middleman, budget, KPIs) and a **DOCX grant draft labelled "szkic do weryfikacji"** (draft for verification), with every claim cited.
4. **ROPS inbox → expert reply → back to the author** via a status code, with no account needed (from 06, plus the visible timer from 01).
5. **WCAG AA + "Tryb Seniora / tekst łatwy do czytania"** (senior mode / easy-to-read text) toggle. Never cut this.

### Should (only after the hero path works)
- Library browser and knowledge base, admin panel, needs trends shown as a **static chart or table, not a gmina map**, idea card (fiszka), tester module.
- **Replay mode** with cached demo answers, for wifi or API failure (from 02).

### Explicitly NOT building
- Goldman, the health app, a gmina map (no GeoJSON, a 3–4h trap), the QR jury room, MCP server, AI images (Claude can't generate images), photo intake, SMS/push, real auth (use a role switcher), Ollama, the "Tryb Komisji" overlay (jury mode), Lighthouse or accuracy boasts based on Claude-written tests, extra open-task submissions.

## Realistic odds
**P(podium) is about 27–30%** (judge 1). Every advocate's 40–50% was inflated about 2×. The base rate is about 9–10% (3 places, about 33 teams).

## Hard facts / traps
- **Claude API key with a funded account above tier 1 is needed NOW.** The Claude Code subscription doesn't include API credits, and the about-90k-token prompt is refused on tier 1. **Cost: about $0.27 per uncached call**, and much less when cached.
- No SQLite writes on Vercel, so use **Turso/Neon** (or run locally behind a tunnel).
- Install all dependencies in hour 1, to avoid lockfile conflicts across 3 worktrees.
- Web Speech (voice) works in Chrome only and needs the network. The OS dictation key is the fallback.
- `innowacje.json`: no gmina field (only 14 of 115 mention one), 26 have videos, the `authors` field is HTML junk and needs cleaning.
- GUS BDL data isn't fetched yet. Run `research/sources/data/fetch_bdl_gminy.py`.
- **HubMI binding rules (§5.3) score 1–10 per criterion, including the QUALITY of key elements.** "+5% per module" exists only in the details PDF. **Depth on the hero path beats shallow breadth.**
- Every team gets the same library and challenge map from ROPS, so real data alone doesn't differentiate us.

## Hedges
- 60% of dev time on matcher + Posadź + the reply loop.
- ROPS mentors test the app at **19:00** and **07:00**. Use their own words and cases in the demo.
- Hard gate at **19:00**: if the hero path isn't working end to end, cut the extras, never WCAG.

## Phase 1 (paper review; you need at least 50% or you're out): the 4th team member owns these
- Name and description; **PDF of 10 slides max AND a video of 3 minutes max** (the video *is* the pitch in phase 1).
- Demo link with no signup and a role switcher.
- **UX mockups link** (screenshots or Figma). **Monthly running cost in PLN.**
- A module-to-screen mapping slide, a WCAG statement plus axe output, data provenance (CC BY ROPS, GUS, synthetic personas, GDPR), an integrations slide, and screenshots in the PDF in case the demo link fails.

## Pitch arc (3 min)
1. Pani Halina hook.
2. Ania files the problem on her behalf by voice.
3. Accessibility toggle.
4. Three real ROPS innovations, then pause: *"To są Państwa innowacje."* ("These are your innovations.")
5. ROPS inbox → expert reply → letter back to Halina.
6. Trends.
7. "Posadź w Bieczu": GUS data plus the DOCX draft.
8. One proof slide.
9. Close: *"4 kliknięcia — gotowe do pilotażu w poniedziałek."* ("4 clicks — ready for a pilot on Monday.")

Sources: `01–07-*.md` proposals; judges `J1-odds-judge.md`, `J2-feasibility-judge.md`, `J3-jury-judge.md`.
