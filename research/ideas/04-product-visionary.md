# 04: Product visionary. **Sadzonka**, the innovation transfer engine

## 1. Idea name + one-sentence pitch
**Sadzonka** ("a cutting": you take a cutting from a plant that already grows well and plant it somewhere new).
- **EN:** Pick a social innovation that has already worked in one gmina. Sadzonka gives any other gmina, OPS or NGO a ready-to-submit implementation package in 60 seconds: their local GUS data, an adapted service design, a budget and a draft grant application. The original author is attached as a mentor.
- **PL:** *Sadzonka: weź sprawdzoną innowację społeczną i posadź ją w swojej gminie: lokalne dane, dopasowana usługa, budżet i szkic wniosku grantowego w 60 sekund.*

Thesis: the bottleneck isn't *finding* innovations but *transplanting* them. Adapting one costs a social worker months of paperwork; Sadzonka removes it.

## 2. Task(s) targeted
- **Primary: P3 HubMI.** It produces a new artefact (the transfer package), so it's not a portal mash-up (their validation question). It covers **all 7 modules**:
  1. Matchmaking: problem or gmina profile → innovations, with a "why it matches" explanation
  2. Knowledge base and trends map
  3. Idea creator, plus a grant generator tailored to the funding call
  4. Tester: rate whether a transplant "took"
  5. Communication: an author-mentor thread with ROPS
  6. Admin publishing
  7. Middleman: the adaptation step itself
- **Dual: O4 AI** (decision support). Every generated sentence cites its innovation record or GUS figure; the user accepts or rejects each section. No second entry allowed → HubMI only.

## 3. The wow moment
The pitcher types **"Słomniki"**; the map zooms in and shows real data (65+ share, population trend) and "3 innovations that worked in gminy like yours". Press **"Posadź"** ("Plant") and a 6-section package streams in: diagnosis with real numbers, adapted service, budget, KPIs, a FERS/FEM grant draft, every claim cited. Export to DOCX. Toggle WCAG mode: large font, high contrast, easy-to-read Polish. Closing line: *"3 months of a social worker's work, done in 60 seconds, for each of 182 Małopolska gminy."*

## 4. What gets built (22h) vs the roadmap
**MUST**
- Seed DB with the 115 innovations plus the 182 Małopolska gminy (BDL, cached)
- Embeddings matching with explanations
- Gmina profile page
- Streamed "Posadź" package generator with citations
- DOCX export
- 4 roles (mock login)
- WCAG toolbar, axe score of 100 on stage

**SHOULD**
- Need-radar map: a choropleth of gaps, i.e. high need with no matching innovation, plus a text/table alternative
- Admin panel (edit and publish innovations, see the trend aggregates)
- Idea card + canvas for brand-new ideas
- Tester ratings ("did it take?")
- Mentor/ROPS message thread with notifications. This answers the jury's question "how does the admin get notified?"

**COULD**
- Voice input for seniors
- Generated illustration of the idea
- An MCP/API endpoint "library for AI assistants" (one route)

**Roadmap (after the hackathon)**
- Multi-tenant for all 16 ROPS
- A live calls feed (FERS, regional FE programmes)
- **Transplant-outcome dataset:** every package and rating teaches which innovations take root where. A network effect no portal has.
- Implementation tracking for grant reporting

## 5. 22-hour build plan (3 devs, each running 2 Claude worktrees)
| Time | Dev A: data and AI | Dev B: generator | Dev C: shell, WCAG, admin | Pitcher |
|---|---|---|---|---|
| 12:30–14:00 | Shared schema (Drizzle/SQLite), seed scripts, BDL fetch → JSON | Package JSON contract, prompts | Next.js + shadcn shell, roles, WCAG toolbar | Get sample data and current calls from the ROPS stand mentors |
| 14–20 | Embeddings, match + explain, gmina profiles | Streamed 6-section generator, citations, DOCX | Map + table alternative, admin CRUD, trends | Name, story, cost model |
| 20–02 | Gap radar, MCP route | Idea card, canvas, grant-call templates (2 calls) | Tester, message thread, notifications | 10 slides, demo script |
| 02–07 | Sleep in shifts; cache the demo packages; axe/Lighthouse fixes | | | |
| 07–11 | Freeze, record the video, submit HubMI + O4, hostile-jury rehearsal, "explain the architecture" session | | | |

## 6. Estimated score and P(podium)
| HubMI criterion | Weight | Estimate |
|---|---|---|
| Fulfilment (7 modules, mandatory module is deep) | 40 | 34 |
| Implementation potential (cheap, multi-tenant, cost model) | 20 | 17 |
| WCAG / intuitiveness | 20 | 16 |
| UI attractiveness | 10 | 8 |
| Materials | 10 | 9 |
| **Total** | **100** | **≈84** |

**P(podium) HubMI ≈ 40–45%**, above a generic build: real gmina data plus a live grant draft is the justCheckingTax (2024) pattern. O4 adds ~5%.

## 7. Who pays after the hackathon, and go-to-market
- **16 ROPS** buy regional SaaS/implementation from their EU social-innovation budgets (FERS / regional FE). Małopolska is the reference customer.
- **Incubators, OPS, NGOs:** free packages; paid grant workflow, collaboration, reporting.
- **GTM:** win HubMI → ROPS pilot → case study across the ROPS network; we operate and maintain the Hub.

## 8. Stuck risks and kill-switches
- **BDL limit / wifi:** fetch now, commit JSON; fallback static CSV.
- **Slow/hallucinating generation:** stream, cite, pre-cache 3 demo gminy. Poor by 20:00 → template + per-section LLM fill.
- **Map not done by 19:00:** SVG choropleth + table (WCAG needs it anyway).
- **DOCX breaks:** print-CSS PDF.
- **Vision scope creep:** roadmap is 1 slide; no multi-tenancy code.

## 9. Why it beats the alternatives; what I concede
- **Merges** ideas A (Radar), B (accessible) and C (MCP) into one artefact. Still +5% per module, but the jury remembers *one* moment.
- Uses the two strongest wow patterns: partner's real data and before/after.
- The vision *feeds* the 20% implementation-potential score.

**Concessions**
- **IP transfer:** a win hands the code to Proidea/ROPS, so the business is operator/implementer, not IP owner.
- Public-sector sales are slow: credible, not fast.
- Grant drafts can be wrong; labelled "szkic" (draft), accepted per section.
- 115 innovations, not ~200; HubMI may be crowded.
