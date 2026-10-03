# 02 – Stage showman: "Puls Małopolski"

## 1. Idea + pitch
**HubMI "Puls Małopolski": the jury becomes the region.** Jurors scan a QR code and dictate a social problem from "their" gmina. In about 10 seconds the projector does two things:
- lights that gmina up on a live map of Małopolska
- shows a proven ROPS innovation, why it fits, and a ready grant card ("fiszka")

**PL:** *„Powiedz do telefonu problem swojej gminy. W 10 sekund Małopolska pokaże sprawdzone rozwiązanie i gotową fiszkę grantową."*

## 2. Task(s)
- **Primary: P3 HubMI.**
  - 3 places, a field limited to Polish-language teams, and no way to get stuck.
  - I don't overturn the front-runner. I fix its weakest point: HubMI's wow ceiling is only 3/5, and every rival will show "chatbot + list".
- **Dual (if Discord allows): O4 AI.**
  - Its brief asks for "making complex information understandable" and "users verify outputs". Our cited "why it fits" panel answers both.

## 3. The wow moment (3 min)
1. **0:00–0:30.** A stopwatch on the slide: "Today a wójt (gmina head) emails ROPS and waits weeks for a PDF."
2. **0:30–1:45. The jury takes part.**
   - The QR code goes up. A juror picks a gmina and **dictates using their phone's own keyboard mic**. This is robust, unlike the Web Speech API.
   - The projector: a choropleth with real GUS 65+ data pulses on that gmina, and a card slides in. It shows a **real** innovation from the 115-item library, a streamed "dlaczego pasuje" (why it fits) with citations, "already run in: X", and a generated fiszka.
   - The stopwatch stops at **0:41**.
3. **1:45–2:15.** With 3–4 jurors in, the admin "Radar Potrzeb" clusters *their* needs by area. That is exactly the trends view ROPS asked for.
4. **2:15–2:40.** One click switches on "Tryb Seniora" (large text, contrast, easy-read Polish, read-aloud). axe shows 100. This answers ROPS's own question: "can a senior do it alone?"
5. **2:40–3:00.** All 7 modules, the cost model, and "wdrażalne od poniedziałku" (deployable from Monday).

## 4. What gets built
**MUST**
- Matchmaking: precomputed embeddings, Sonnet streaming the "why" with citations, and matches weighted by BDL demographics.
- `/sala` mobile page and the projector view: 1s polling/SSE, local gmina GeoJSON.
- WCAG senior mode, with axe running in CI.
- **Replay mode**, which re-plays a recorded stage run.

**SHOULD** (each +5%)
- Zasobnik (knowledge base)
- Kreator: fiszka plus grant DOCX
- Middleman (AI that adapts an innovation for an institution)
- Admin, with new-idea notifications
- Tester
- Komunikacja (ROPS–user messaging)

**COULD**
- AI image of the idea
- Text-to-speech on the projector
- O4 deck

## 5. 22h plan
| Time | Dev A (data/AI) | Dev B (app/WCAG) | Dev C (live room/map) | Member 4 |
|---|---|---|---|---|
| 12:30–14 | Contract into CLAUDE.md; embeddings; BDL; **GeoJSON committed** | Next.js + shadcn, roles, Polish copy | `/sala` + projector skeleton | ROPS stand: sample data; "may jurors use phones?" |
| 14–20 | Matchmaking + "why" | Senior mode, Zasobnik, Admin | Map, card animation, stopwatch | Pitch script |
| 20:00 | **Draft submission** | | | |
| 20–02 | Kreator/DOCX, Middleman | Tester, Komunikacja | Radar, replay | Video storyboard |
| 02–07 | Sleep in shifts; Claude fixes axe/Playwright; **freeze 07:00** | | | |
| 07–10:30 | Rehearse the wow 10× on LTE; record a 3-min video with our phones as "jurors" (Phase 1 only sees this); cost estimate; submit | | | |

## 6. Score estimate (HubMI rubric)
| Criterion | Weight | Estimate |
|---|---|---|
| Fulfilment + modules | 40 | 33 |
| Implementation potential | 20 | 15 |
| WCAG / intuitiveness | 20 | 17 |
| Attractiveness | 10 | 9.5 |
| Materials | 10 | 9 |
| **Total** | | **about 83%** |

**P(podium) ≈ 40%**, against about 30% for a plain HubMI.

## 7. Stuck risks and kill-switches
- **Wifi.** Deploy on Vercel; jurors use their own LTE; the laptop runs on a hotspot. *Kill-switch:* team phones play the jurors.
- **Jury won't scan, or phones are disallowed.** *Kill-switch:* "Imagine you're the wójt of Bukowina…" and a teammate submits live.
- **Claude slow or down.** Embedding matches render instantly and only the "why" streams. *Kill-switch:* cached answers for the top 20 problems, then replay mode.
- **No gmina GeoJSON by 14:00.** Fall back to powiaty, or centroid dots.
- **Troll input.** A Haiku pre-check.

## 8. Why it beats the alternatives
- **HubMI-A/B/C:** it *contains* A (the map/radar) and B (voice); C becomes one slide. It adds memorability among 15–30 HubMI teams.
- **Goldman:** its wow is the jury attacking us live, in English, on security. With zero security knowledge, that's our worst possible stage.
- **Health / open tasks:** one winner among 30–50 teams, and Rest & Blink already won.
- **Kraków / Superteam:** one winner each, a small wow, and Anchor/devnet risk on Superteam.

## 9. Weaknesses conceded
- **The live room plus map costs about half a dev-day** and earns no +5%. If we slip, it costs a module.
- **Phase 1 is a paper and video review.** The trick only pays off if the video sells it.
- **The pitch format is unknown** (closed room, phones?). Without jury phones it drops to "a teammate demos", which is good but not legendary.
- **"Is the map decoration?"** A sharp ROPS juror will ask this. The demographic weighting has to be real.
- **Showmanship doesn't raise the ceiling:** at most 6k, and the IP is transferred.
