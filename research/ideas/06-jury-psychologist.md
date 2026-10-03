# 06: Jury psychologist / human-centred designer

## 1. Idea: **Pomost**
- **EN:** Tell your problem your way (voice, text, a social worker filing for you, or a photo of a handwritten note). Pomost finds who in Małopolska already solved it, and carries that need to a ready implementation pack for the gmina.
- **PL:** *Opowiedz problem po swojemu, a Pomost znajdzie w Małopolsce kogoś, kto już go rozwiązał, i doprowadzi potrzebę do gotowego pakietu wdrożeniowego dla gminy.*

## 2. Task: P3 HubMI (ROPS), and who judges it
- **Why this task:** three places, Polish only, +5% per module, and the jury plans to deploy the winner.
- **Who judges:** ROPS social-policy staff, likely the people who curated the 115-item library over 10 years. Proidea mentors score Phase 1.
- **What they fear:**
  - another dead portal ("tylko integruje istniejące portale")
  - seniors who can't use it
  - ideas that never get an answer
  - AI that invents innovations
  - GDPR
  - running costs
- **What they want for their boss:** proof that the library reaches gminy, a regional needs radar, and a report for the board.
- **What moves them:** seeing *their own* innovations recommended to a real-sounding person.

Most teams will build "chat → RAG → list". We build one need's journey through all 7 modules, and each step answers one fear.

## 3. Wow moment: Pani Halina
- **Who she is:** Halina, 74, gmina Biecz, widowed, offline.
- **Ania files for her.** Ania is the social worker at Halina's Centrum Usług Społecznych (CUS). She taps **"Zgłaszam w imieniu"** ("filing on someone's behalf") and records 30 seconds of Halina.
- **The recording becomes a need card:** loneliness, 65+, rural, no transport. Halina's personal details are auto-redacted.
- **Three real ROPS innovations appear:** Centrum antydepresyjne, Mobilne centrum pomocy dla osób starszych, and Kody QR. Each has a "why it fits" line in easy-to-read Polish and a source link.
- **ROPS sees it:** the ROPS inbox pings, and the trend map lights up powiat gorlicki ("samotność seniorów: 14 zgłoszeń", "senior loneliness: 14 reports").
- **One click, then the gmina pack:** the Middleman adapts "Mobilne centrum" for Biecz, with GUS 65+ data, cost, partners and a grant draft.
- **Halina gets an answer** by SMS or a large-print letter.
- **Closing line:** "Od głosu Haliny do wdrożenia: 4 kliknięcia." ("From Halina's voice to a rollout: 4 clicks.")
- **Stage proof:**
  - the accessibility toggle, live
  - axe/Lighthouse at 100
  - a quote from a ROPS mentor who tested it on Saturday

## 4. What gets built
**MUST**
1. **Matchmaking (module I).**
   - Inputs: text, voice (Web Speech pl-PL), photo of a note (Claude vision).
   - The whole 115-item library fits in one cached prompt, so no vector DB.
   - Output is restricted to valid IDs, plus "dlaczego pasuje" ("why it fits").
2. **Proxy filing**, with consent and PII redaction.
3. **Reply path (module V).**
   - ROPS inbox and expert threads.
   - A status code, so the author needs no account.
   - SMS mock and a printable letter.
4. **Admin panel (module VI):** verify, publish, edit.
5. **WCAG AA**, plus an easy-read toggle and axe in CI.
6. **About 40 seeded synthetic needs**, so the map looks alive.

**SHOULD**
- **Trend map (module II)** on GUS data, plus a "Raport dla Zarządu" PDF (report for the regional board).
- **Middleman gmina pack (module VII).**
- **Idea card ("fiszka") and grant generator (module III).**

**COULD**
- Tester (module IV), the library view with videos, AI idea images, and a cost sheet (about 250 PLN/month).

## 5. Build plan
| Time | Dev A (AI) | Dev B (citizen UX + WCAG) | Dev C (ROPS side) | Pitcher |
|---|---|---|---|---|
| 12:30–14:00 | Schema, seed library | Design tokens, accessibility mode | RBAC for 4 roles | ROPS mentors: confirm their pains, get sample data |
| 14:00–19:00 | Matcher, redaction, vision | Intake wizard, voice, proxy filing | Inbox, threads, notifications | Persona, script |
| 19:00 | **Integration.** A ROPS mentor tests it on camera. | | | |
| 20:00–01:00 | Middleman, grant generator | Easy-read mode, letter, tester | Map, board PDF | Mockups |
| 01:00–06:00 | Sleep in shifts; Claude worktrees fix axe findings | | | |
| 06:00–09:00 | **Freeze at 07:00**, then bug bash | Lighthouse at 100 | Deploy | Video, slides, cost sheet |

## 6. Estimated score
| Criterion | Weight | Estimate |
|---|---|---|
| Fulfilment (mandatory module + 6 extras) | 40 | 35 |
| Implementation potential | 20 | 15 |
| WCAG and intuitiveness | 20 | 18 |
| UI and inventiveness | 10 | 8 |
| Materials | 10 | 9 |
| **Total** | | **≈85%** |

**P(podium) ≈ 45%.**

## 7. Stuck risks and kill-switches
- **Voice:** if it is broken at 18:00, fall back to OS dictation and a recorded clip.
- **GUS rate limit:** fetch a static powiat GeoJSON with numbers in hour 1.
- **Matching:** test 10 hand-written needs at 19:00. If precision is poor, add a category pre-filter.
- **Behind schedule at 01:00:** cut the tester and image generation. Never cut the reply path or WCAG.
- **Wifi:** a backup video and cached responses.

## 8. Why it wins, and what we concede
- **vs Radar alone:** analytics with no person in it. Our radar is the *consequence* of Halina's report.
- **vs voice-first alone:** one feature. Here voice is one of four entry doors, and that makes "a senior without help" believable.
- **vs MCP/API:** invisible to a social-policy jury.
- **vs Goldman:** a jury that probes security, which is exactly what our team fears.
- **Concessions:**
  - The core matcher is what everyone builds; we differ only by the journey and the polish.
  - Proxy filing raises consent questions.
  - IP transfer.
  - Breadth risks looking shallow, so the demo goes deep only on Halina's path.
