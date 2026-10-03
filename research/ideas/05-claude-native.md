# 05: Claude-native advocate — "Pośrednik" (HubMI)

## 1. Idea and pitch
**Pośrednik:** you speak, photograph or upload a problem. A Claude agent reads all 115 real ROPS innovations at once and cites why each one fits *your* gmina. Then it writes the grant application as a DOCX.
**PL:** *Powiedz, sfotografuj lub wgraj problem — agent AI dobierze sprawdzone innowacje ROPS, uzasadni dopasowanie do Twojej gminy i napisze wniosek grantowy.*

## 2. Task
**P3 HubMI**, plus a dual entry in O4 AI if allowed.
- Goldman bans paid APIs, so Claude could build it but couldn't *be* it.
- HubMI is the only podium-friendly task where Claude can sit inside the product. It also pays +5% per module, which rewards parallel throughput.
- Claude's capabilities map one to one onto the requested modules: matchmaker, grant generator, Middleman, knowledge base.
- Rivals will ship embeddings plus a chatbot. We ship an agent.

## 3. Wow moment
1. A juror presses the mic and says *"Starsi u nas są samotni, młodzi wyjeżdżają"* ("our older people are lonely, the young ones are leaving").
2. A **visible tool trace** runs: `szukaj_innowacji` (search innovations), then `dane_gminy` (GUS data: 65+ = 24%), then `porownaj` (compare).
3. Three cards appear, each with **quoted evidence**, the video and an easy-read summary.
4. "Napisz wniosek" ("write the application") streams a filled DOCX in about 20s.
5. The admin tab shows **"Trafność dopasowań: 27/30 (eval)"** ("match accuracy: 27/30"). That answers ROPS's own validation question, "do suggestions match accurately?", with numbers.

## 4. What gets built
**MUST (10% mandatory + 3 modules)**
- **Matchmaker** [long context + prompt caching + structured output]:
  - The whole library (about 90k tokens) sits in a cached system prompt, so there's **no vector DB and no RAG to debug**.
  - A JSON schema returns the top 3 matches, each with `cytat` (quote), `dlaczego` (why) and `ryzyka` (risks).
- **Middleman agent** [tool-use loop, streamed trace]:
  - Tools: `szukaj_innowacji`, `dane_gminy` (seeded GUS BDL data), `adaptuj_do_instytucji` (adapt to the institution), `utworz_fiszke` (create an idea card).
- **Kreator** (idea creator): idea card, then canvas, then a **grant DOCX** (`docx` npm, filled from structured output).
- **Zasobnik** (knowledge base): browse and filter all 115 innovations, with videos.
- **WCAG AA:** shadcn/Radix, with axe-core in CI.

**SHOULD (+15%)**
- **Multimodal intake** [vision/PDF]: a photo of a note or a broken bus stop, or a gmina strategy PDF, gets turned into problems, which then get matched.
- **Voice:** Web Speech API in pl-PL (zero backend).
- **Admin:** a needs heatmap per gmina, plus verify/publish.
- **Eval page:** 30 labelled problem→innovation pairs, scored as precision@3.
- **Easy-read mode** [Haiku]: rewrite any card in simple language.

**COULD**
- **MCP server** (about 80 LOC) exposing the library: "your gmina's clerk asks Claude Desktop and gets ROPS data". This proves integration readiness.
- **Tester** and the ROPS↔author messaging thread.

## 5. Build plan and parallel workflow
**Repo:** Next.js monorepo.
- `app/(mieszkaniec|gmina|admin)` (resident, gmina and admin route groups)
- `lib/contract.ts` (Zod: Innovation, Match, Fiszka, Wniosek, AgentEvent)
- `lib/ai/`, `data/`, `mcp/`, `evals/`
- SQLite through Drizzle

| Time | Dev A: AI core | Dev B: UX/WCAG | Dev C: docs/admin | Pitcher |
|---|---|---|---|---|
| 12:30–13:30 | **All together:** CLAUDE.md (HubMI PDF, scoring table, demo script), `contract.ts`, seeds, mock responses | | | Talks to ROPS mentors, collects sample data |
| 13:30–19:00 | matchmaker, agent loop | shell, UI on mocks, voice | Zasobnik, DOCX, admin | mockups, cost estimate |
| 19:00 | **Integration: swap mocks for real calls, deploy to Vercel.** Always demoable from here. | | | |
| 19:00–01:00 | vision/PDF, evals | easy-read, a11y, contrast | heatmap, tester, MCP | slides |
| 01:00–05:00 | sleep in shifts; subagents run `/code-review` and axe fixes | | | |
| 05:00–09:00 | **Freeze 07:00.** Backup video, Claude-led "explain the architecture" session, hostile-jury rehearsal | | | |

**Rules:**
- One worktree per module per dev, with subagents writing tests and fixtures.
- `contract.ts` changes are announced before they're made.
- Every route supports `?mock=1`, so the UI never waits on AI work.

## 6. Estimated score
| Criterion | Weight | Est. |
|---|---|---|
| Fulfilment + modules | 40% | 34–38 |
| Implementation potential (≈0.1 zł/query, MCP) | 20% | 15 |
| WCAG / intuitiveness | 20% | 15–17 |
| Attractiveness | 10% | 8 |
| Materials | 10% | 8 |
| **Total** | | **≈82** |

**P(podium) ≈ 40%.** Three places are paid, and few rivals will combine real ROPS data, an agent and evals.

## 7. Stuck risks and kill-switches
| Risk | Kill-switch |
|---|---|
| Agent loop is flaky by 18:00 | Fall back to a single structured-output call. The trace becomes a scripted step animation. |
| Latency | Cached prompt, streaming, Haiku for the first pass. |
| Wifi or API down on stage | `?replay=1` serves recorded responses for the 3 demo queries, plus the backup video. |
| DOCX fights us | Kill it at 23:00 and fall back to HTML print-to-PDF. |
| Weak Polish speech recognition | Demo in Chrome; text input always works. |
| MCP or Tester running late | They're COULD items; drop them. |

## 8. Why it wins, and what I concede
- **vs Goldman:** our main multiplier, Claude inside the product, is banned there. Local-model latency will also be tested live by the judges.
- **vs Radar (A), voice (B) and MCP (C):** each one becomes a *feature* here (heatmap, intake, COULD item). This is a superset that **degrades gracefully**: every kill-switch still leaves a complete HubMI submission.

**What I concede:**
- HubMI probably has the biggest field.
- The jury may value senior usability over AI depth, so the trace must sit behind a simple view.
- The IP transfer is real.
- "Mash-up of portals?" is a fair attack. Our answer is that the gmina-data reasoning and the grant drafting are new.
- Each uncached 90k-token call costs about $0.03–0.05. The cost slide must say so.
