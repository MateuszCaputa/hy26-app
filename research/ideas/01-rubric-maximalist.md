# 01: Rubric maximalist. "MOST: one case, seven modules, every point shown on screen"

## 1. Idea name and pitch
**MOST** (Polish for "bridge").
- **EN:** A resident's problem becomes one living "Sprawa" (case) that flows through all 7 HubMI modules. A built-in **Tryb Komisji** (jury mode) shows live proof for every scoring line.
- **PL:** *Problem mieszkańca staje się jedną „Sprawą” przechodzącą przez wszystkie 7 modułów Hubu; Tryb Komisji pokazuje na żywo dowód na każde kryterium oceny.*

## 2. Tasks targeted
**P3 HubMI.** The scoring is a formula: 10% + 6×5% for modules, plus 20% for WCAG. Claude's throughput converts directly into points.

The same repo also goes to **X2 Prelint**, which stacks at no cost. No open-task entry: that's one winner from about 40 teams, and it would dilute the pitch.

## 3. The wow moment (3 minutes)
1. **0:00, the senior (Q1).** A 30-second clip of a real 70+ relative (filmed Saturday by our 4th member) saying *„Starsi w naszej wsi są samotni”* into "Tryb prosty" (large type, one question per screen, voice input). This is evidence, not a promise.
2. **0:40, the match (Q3).** Three real ROPS innovations come back, each with:
   - a video link
   - a **highlighted "why"**: the user's words are marked in both texts (*samotni ↔ osamotnienie*)
   - the gmina that already ran it
3. **1:20, the notification loop, live (Q2).**
   - "Rozwiń w pomysł" pre-fills a fiszka (idea card), which becomes a grant draft.
   - On the second laptop, the ROPS admin's bell rings and an email lands (phone on the projector).
   - An expert replies, and the author gets a push notification.
   - The timeline reads **"Zgłoszenie → odpowiedź: 41 s"**.
4. **2:10, Tryb Komisji.** One keypress opens an overlay:
   - **7/7 modules**, each a live link
   - axe-core: **0 violations**, re-scanned live
   - Lighthouse accessibility **100**
   - matching top-3 hit rate **87%** on 30 held-out cases
   - cost slider: 50k users → **≈1 100 PLN/mies.**
5. **2:40, novelty (Q4).** *„To nie portal z wtyczkami — to jedna Sprawa widoczna dla każdej roli.”*

## 4. What gets built
**MUST**
- **I Matchmaking:**
  - BM25 plus local multilingual-e5 embeddings
  - Claude Haiku rerank with a structured "why" and keyword highlights
  - 115 real innovations seeded
- **Sprawa model, timeline and RBAC:** 4 roles, switchable in one click.
- **VI Admin:** CRUD and verify/publish.
- **II Knowledge base:** library, challenge pages, and a needs heatmap per gmina (admin only).
- **Notifications:** in-app bell, email via Resend, web push.
- **Accessibility layer:** font scale, high contrast, "tekst łatwy do czytania" (easy-to-read Polish, rewritten by Claude), keyboard navigation, axe-core in CI.
- **Tryb Komisji.**

**SHOULD**
- **III Kreator:** fiszka, canvas, grant generator per funding call exported to DOCX, an assistant.
- **V Komunikacja:** threads per Sprawa, mentor inbox, partnerships.
- **VII Middleman:** innovation plus institution profile becomes a service card (budget, staff, KPIs).

**COULD**
- **IV Tester:** sign-up, ratings, feedback.
- Image visualisation. Fallback: a Claude-drawn SVG.

## 5. Build plan
| Time | Dev A (core) | Dev B (modules) | Dev C (a11y/infra) | 4th member |
|---|---|---|---|---|
| 12:30–14 | CLAUDE.md with the rubric; schema; **frozen Sprawa contract** | Demo script, personas | Next.js, shadcn, Vercel, seed data | ROPS stand: sample data, mentor questions |
| 14–18 | Matchmaking and the "why" | Worktrees: II, VI | Auth, a11y layer, axe CI | Mockups, slide skeleton |
| 18–23 | Notification loop, timeline | III with DOCX, V | Tryb Komisji, eval set | Film the senior; cost sheet |
| 23–03 | Sleep in shifts; Claude drafts VII and IV in worktrees | | | Sleep |
| 03–07 | Merge, real ROPS data | VII, IV | Lighthouse 100, mobile | Video cut |
| 07–10 | **Freeze**; Claude acts as a hostile ROPS jury | Bug bash | Bug bash | PDF, video |
| 10–11 | Submit | | | |

## 6. Estimated score
| Criterion | Max | Est | Why |
|---|---|---|---|
| Fulfilment | 40 | 35 | 7/7 is near certain; points lost on the thin modules IV and VII |
| Implementation | 20 | 16 | Cost model, API, a SQLite→Postgres path |
| WCAG | 20 | 18 | Measured 100/0 plus a real senior; rivals only *claim* AA |
| UI inventiveness | 10 | 7 | The Sprawa timeline is novel; the visuals are merely competent |
| Materials | 10 | 9 | Evidence-dense deck and a cost sheet |
| **Total** | | **≈85** | **P(podium) ≈ 45–50%** |

## 7. Stuck risks and kill-switches
- **Embeddings slow:** fall back to a Claude rerank over the BM25 top 20.
- **Email blocked on wifi:** use the in-app bell on a second browser. The timeline still proves the loop.
- **Image API blocked:** use an SVG sketch.
- **Lighthouse below 100 everywhere:** claim it for the 3 hero pages only, plus axe at 0.
- **No senior available:** a parent on video call. Last resort: a consenting stranger at the venue.
- **Merge hell:** modules are separate route folders built against the contract frozen at 14:00.

## 8. Why it beats the alternatives
- **A Radar, B voice, C MCP** are single features. MOST absorbs A (admin heatmap) and B (Tryb prosty). C is invisible to a non-technical ROPS jury.
- **Goldman** judges attack the build live, and we have no security knowledge.
- **Health, Kraków, Superteam and the open tasks** pay a single winner each, or carry on-chain risk.
- HubMI is the only task where breadth converts linearly into points. MOST is also the version that **proves** each point.

## 9. Weaknesses I concede
- **"A 7-module platform" is not original.** Many teams will try it. We win on finishing and evidence; if two rivals also ship 7/7, the UI 10% decides, and ours is only good.
- **Tryb Komisji may look like gaming the jury.** We frame it as an "ROPS KPI dashboard".
- **The 87% figure comes from a Claude-written eval set.** We must disclose that and add ROPS's own cases.
- **IV and VII may be shallow CRUD.** The IP transfer is required, and the quality of the Polish pitch rests on the 4th member.
