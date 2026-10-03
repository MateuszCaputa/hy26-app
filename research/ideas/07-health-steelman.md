# 07: Health steelman: "Lupa", lab results you can understand and act on

## 1. Idea and pitch
- **EN:** Drop in three years of blood-test PDFs. In 20 seconds you get a cited timeline, plain-language flags, the questions to ask your doctor, and the NFZ specialist with the shortest queue in Kraków.
- **PL:** Wrzuć wyniki badań z trzech lat, a w 20 sekund dostaniesz oś czasu z odnośnikami do źródła, zrozumiałe wyjaśnienia, pytania do lekarza i najkrótszą kolejkę NFZ do specjalisty w Krakowie.

Deliberately **not** a webcam or eye-strain app: Rest & Blink and Straighty already won that space.

## 2. Tasks targeted, and the multi-submission
| Task | Why it fits | Est. field | P(win) alone |
|---|---|---|---|
| **O2 Sport & Healthcare** (primary) | The brief literally names "lab results, treatment history, access to care" and "decisions, not monitoring" | 30–40 | 9–12% |
| **O5 ImpactHer** | Iron deficiency and Hashimoto's mostly affect women and go underdiagnosed; adds an NFZ screening calendar | 15–25 | 9–12% |
| **O4 AI** | "Users verify outputs and stay in control": every claim links to its source line | 50+ | 3–4% |

**Odds math, head-on:**
- One open task alone gives about 10%, which loses to Goldman (30–40%) and HubMI (25–35%). Conceded.
- With triple entry the outcomes are correlated, so the real figure sits below the independent 1−(0.9·0.9·0.965) ≈ 22%. **Realistic P(≥1 win): 17–22%.**
- EV ≈ 0.2 × 8k = 1.6k, comparable to HubMI's 1.2–1.8k.
- Each extra entry costs almost nothing: the pitcher and Claude tailor the deck per category, protecting the 20% "Relation to category" score.
- **Rescue condition:** multi-submission confirmed on Discord by 13:30 (otherwise see section 7).

## 3. The wow moment
1. A judge drags in four demo-lab PDFs; timelines animate in within about 20 seconds.
2. Headline card: "Ferritin down 62% since 2023, now below range."
3. Clicking it opens the original PDF with that exact line highlighted. The source is visible.
4. Then: three doctor questions, a rule-based "check TSH too" nudge, and **real NFZ waiting times** (public Terminy Leczenia API): "Hematologist, Kraków: 11 days at X vs 94 at Y."
5. A one-page doctor-visit summary PDF downloads.

Before/after: "You used to Google every value. Now it's one screen."

## 4. What gets built
**Must:**
- Multi-PDF upload with in-browser pdf.js extraction and PESEL/name redaction.
- Claude structured extraction (Zod: analyte, value, unit, range, date, line ref); about 25 canonical analytes with unit normalisation.
- Timeline dashboard, click-to-source highlight, deterministic flag rules, grounded doctor questions.

**Should:**
- NFZ queue finder (cached plus live), women's screening calendar, doctor-visit PDF, PL/EN, WCAG-clean design.

**Could:**
- Vision fallback for scanned PDFs, Apple Health steps/resting HR beside labs, read-only link for the doctor.

## 5. 22-hour plan (3 devs plus Claude worktrees)
- **12:30–13:30 (all):** briefs into CLAUDE.md, shared types (`LabResult`, `Flag`, `Action`), demo script, 10 synthetic lab PDFs as fixtures, multi-submission question on Discord.
- **Dev A, ingestion:** redaction, extraction prompt, units, vitest over fixtures (target ≥95% field accuracy).
- **Dev B, UI:** shadcn dashboard, analyte cards, react-pdf highlight viewer, mobile.
- **Dev C, actions:** YAML rules, NFZ client plus cache, screening calendar, doctor questions, summary PDF.
- **Pitcher:** surveys 20–30 people in the arena ("Did you understand your last blood test?") for a real slide statistic; drafts three decks and the video script.
- **Milestones:** 19:00 end-to-end demo v1; 01:00 all "should" items; sleep in shifts; 07:00 freeze; 07:00–10:00 polish, video, three submissions done by 10:00.

## 6. Estimated scores
| Criterion | Weight | O2 | O5 | O4 |
|---|---|---|---|---|
| Idea & Innovation | 30% | 6.5 | 6.5 | 6 |
| Relation to category | 20% | 9 | 7.5 | 7.5 |
| Usability | 20% | 8.5 | 8.5 | 8 |
| Design | 20% | 8.5 | 8.5 | 8.5 |
| Completeness | 10% | 8 | 8 | 8 |
| **Total** | | **≈80%** | **≈77%** | **≈75%** |

Passing the 50% Phase 1 bar is near-certain. Innovation is the weak spot: lab explainers exist, so the edge is click-to-source citations and live NFZ queues.

## 7. Stuck risks and kill-switches
- **No multi-submission (13:30):** P drops to about 10%. **Then switch to HubMI or Goldman**; a single open task loses on odds. The grounded-extraction engine can become a HubMI module.
- **Extraction below 90% at 18:00:** cut to 15 core analytes and text PDFs only.
- **NFZ API down:** dated cached snapshot from 14:00.
- **Liability question:** never diagnoses; ranges come from the lab's own PDF; rules are visible; output is "questions for your doctor".
- **Privacy question:** in-browser redaction, no account, no storage, EU zero-retention in production. No security expertise needed.
- **Simultaneous final pitches:** the team splits into two pairs, each rehearsing the demo.

## 8. Why it beats the alternatives, and what I concede
**For:**
- **Zero toolchain risk:** pure Next.js plus the Claude API.
- **Real public data** (NFZ) and an emotional human story, the shape that won Rest & Blink and BeeSafeGirl.
- **IP stays with the team**, and it's a real product (consumer plus clinic B2B).
- **8k prize** beats the 6k first place in partner tasks.

**Conceded:**
- With one entry it loses to Goldman and HubMI on P(podium); the case rests on multi-submission.
- Innovation is middling, and the medical topic invites probing.
- O4/O5 judges may see it as "a health app in our category".
