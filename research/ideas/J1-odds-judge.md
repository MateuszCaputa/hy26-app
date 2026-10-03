# J1: Odds judge (cold P(podium))

**Base rates first.** 2024/25 had ~400 projects over ~12 tasks (~33/task). In 2026 everyone vibe-codes, so expect more submissions and a higher floor.
- **HubMI:** 25–40 teams. Polish-only barely filters; easy theme. Base rate 3/32 ≈ 9%.
- **Goldman:** 20–35 teams. GS brand plus "AI agent security" is *the* 2026 topic, so the 10–20 estimate is too low. Base ≈ 10%.
- **Open tasks:** 1 slot, 30–50 teams. Base 2–3%.

A disciplined Claude team earns 2–3× base, not 4–5×. Self-scores of 80–85% mean nothing: podium is relative, and the top 10 all *claim* 80+.

## 1. Ranking

| # | Proposal | Their P | My P | Kill-shot |
|---|---|---|---|---|
| 1 | 06 Pomost | 45% | **24%** | Same matcher as everyone; edge is only journey + polish. |
| 2 | 04 Sadzonka | 40–45% | **23%** | Only genuinely new artefact, but it's one module (VII/III) dressed as a product. |
| 3 | 01 MOST | 45–50% | **21%** | "Tryb Komisji" is a checklist for a holistic 1–10 jury; 87% eval is self-graded. |
| 4 | 05 Pośrednik | 40% | **21%** | Tool-trace is invisible to social-policy jurors; multimodal/MCP cost time, earn nothing. |
| 5 | 02 Puls | 40% | **18%** | Phase 1 is mentors reading PDF/video; QR room = half a dev-day, 0 rubric points. |
| 6 | 03 TRIPWIRE | 40% (+5) | **14%** | Robustness 30% is graded by security pros attacking live; we bleed there and in Q&A. |
| 7 | 07 Lupa | 17–22% | **8%** | 3 single-winner fields, correlated; multi-entry unconfirmed; all pitches at 16:00, one pitcher. |

## 2. False or inflated claims

- **"Real ROPS data" as a differentiator (01/02/04/05/06): false.** HubMI_details §7 hands every team the innovation library, the challenge map and sample data. Only GUS-per-gmina joins are ours.
- **"+5% per module = linear points" (01, brief): overstated.** The binding regulamin (HubMI_rules §5.3) scores each criterion **1–10, weighted average**. It counts "*jakość działania* kluczowych elementów oraz liczba" (quality AND count). The 10+6×5 formula is only in the details PDF. Shallow CRUD won't get full credit, and most serious teams will claim 7/7 (03 is right).
- **03 "Goldman accepts Polish": TRUE.** AI_Control_Layer_rules l.32: "in English or Polish". The ROI matrix's "EN" was wrong. This doesn't fix the real problem: live attack plus security Q&A.
- **05 "Goldman bans paid APIs": false.** Details §7 says only that no paid subscriptions are *provided* and the system should run on your own setup.
- **05 cost "$0.03–0.05 per uncached 90k-token call": wrong.** innowacje.json is 247k chars, about 90k tokens. That's roughly $0.27 per uncached call on Sonnet; the $0.03 figure holds only for cached reads. Cache warming is mandatory.
- **07 "9–12% per open task":** 3–4× base rate for self-admitted "middling innovation".

## 3. Verdict: HubMI, merged build. Realistic P ≈ 27–30% (with Prelint stack)

- **Spine (06):** Pani Halina's need flows through the modules: "Zgłaszam w imieniu" proxy filing → ROPS inbox → reply to the author via status code. It answers the four §6 validation questions in order.
- **Matcher (05):** whole library in a cached prompt, no vector DB; output constrained to valid IDs with a quoted "dlaczego pasuje"; precision@3 eval page **re-labelled by a ROPS mentor** so it isn't self-graded.
- **Wow artefact (04):** "Posadź" = Middleman (VII) + grant generator (III): gmina GUS data, adapted service, budget, cited DOCX. The only answer to "czy tworzy nową jakość?".
- **From 01:** contract frozen at 14:00, one route folder per module; visible "zgłoszenie → odpowiedź: 41 s" timer; easy-read toggle; module checklist as **one slide**.
- **From 02:** static powiat choropleth in admin "trendy" (module II requires it); replay/cached stage mode.
- **4th member owns mandatory deliverables:** UX/UI mockups, maintenance cost estimate, ≤3-min video, ≤10-slide PDF, demo link.
- **Stack** X2 Prelint if setup takes <30 min.

**Do NOT build:** Goldman or health; QR jury room; MCP server; photo/PDF intake; AI images; SMS/web push (bell + email only); real auth (role switcher); Lighthouse 100 everywhere (axe 0 on hero path); Defence/O4 dual entry unless it's a 10-minute re-upload (P ≈ 2%).

## 4. Biggest risk: convergence

Ten-plus teams ship the same "7 modules + RAG + WCAG toggle". Holistic 1–10 scoring then rewards depth and jury taste, and our breadth leaves the hero path mediocre.

**Hedges:**
1. **Depth budget.** Matcher + Posadź + reply loop get 60% of dev time; IV/V/VI are honest thin CRUD.
2. **Win the jury before the pitch.** The 4th member gets ROPS mentors to test at 19:00 and 07:00, and the demo uses *their* words and cases.
3. **19:00 gate.** If matcher → Posadź isn't end-to-end, cut the map and VII polish, never WCAG.
