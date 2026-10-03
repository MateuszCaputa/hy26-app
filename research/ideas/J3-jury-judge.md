# J3: Jury judge (impact and memorability)

Lens: a composite of the ROPS, Goldman and Proidea juries. Phase 1 is a paper review that needs ≥50%; phase 2 is a short live pitch.

## 1. Ranking

1. **06 Pomost (Halina).** *"That's our client and our social worker, and Halina got an answer."* It answers every fear in the brief. This is the persona that lands.
2. **04 Sadzonka.** *"They get that our job is spreading innovations, not cataloguing them."* "Posadź w Bieczu" is the deploy-on-Monday moment. Cut the "3 months in 60s" overclaim.
3. **05 Pośrednik.** Mentors like the quoted evidence and the eval. ROPS tunes out at `szukaj_innowacji()`.
4. **01 MOST.** *"Built for us, or for the scoring sheet?"* It clears phase 1 but is forgotten by pitch 20.
5. **02 Puls.** Memorable if it works, but phase 1 can't see it. Jury QR codes are a gamble, and "a wójt waits weeks for ROPS" insults the jury.
6. **03 Tripwire.** The Goldman engineers would take apart the Q&A within 90 seconds, which is exactly the team's stated fear.
7. **07 Lupa.** Off-brief, with medical liability, against 30–50 teams.

## 2. Drop or reframe

- **Tryb Komisji (jury-mode overlay).** It reads as gaming the rubric. Use a module→screen table in the PDF and a "Panel KPI" tab in admin instead.
- **Jurors' phones and live dictation.** Unknown logistics, dead air if it fails, and phase 1 never sees it.
- **"ROPS is slow" framing (stopwatches).** Use "your library reaches more gminy" instead.
- **The 87% and 27/30 headline figures.** Claude wrote the eval set. Have a ROPS mentor label 10 cases instead, and cite the source.
- **"Lighthouse 100" bragging.** Toggle easy-read mode and tab through the page with the keyboard live instead.
- **Agent traces, MCP, "90k cached tokens".** One technical slide at most.
- **AI idea images.** Near-zero value to ROPS.
- **Fabricated quotes or real personal data.** Halina must be visibly synthetic.
- **Unlabelled grant text.** Label it "szkic do weryfikacji" (draft for review) and have the user accept it section by section.

## 3. Winning pitch: **Sadzonka**

*"Sprawdzone innowacje, które przyjmą się w Twojej gminie."* ("Proven innovations that will take root in your gmina.")

Build it from 06's journey, 04's transplant step, and 05's evidence and drafting under the hood. "Posadź" (plant it) is what the jury remembers at 18:00; "Pomost" and "MOST" sound like any portal.

| Time | Beat |
|---|---|
| 0:00–0:20 | "Pani Halina, 74, Biecz. Bez smartfona. Ma problem, który Państwo już rozwiązali." ("Mrs Halina, 74, from Biecz. No smartphone. She has a problem you have already solved.") |
| 0:20–0:50 | Ania from the CUS (local social services) taps "Zgłaszam w imieniu" (filing on someone's behalf) and dictates by voice. The need card appears in easy-read Polish with personal details redacted. **Toggle WCAG here, on a real screen.** |
| 0:50–1:25 | Three *real* ROPS innovations, each with "dlaczego pasuje" (why it fits) showing her words highlighted, a video, and the gmina that already ran it. Pause: *"To są Państwa innowacje."* ("These are your innovations.") |
| 1:25–1:55 | The ROPS inbox pings. An expert replies, and Halina gets the status by SMS or large-print letter. The trend map lights up powiat gorlicki. |
| 1:55–2:30 | **"Posadź w Bieczu":** GUS data, the adapted service, budget, KPIs and a cited grant draft as DOCX, with the original author attached as mentor. |
| 2:30–2:50 | Proof slide: 7/7 modules, axe at 0, cost of about X PLN/month, and the admin edits an innovation in 5 seconds. |
| 2:50–3:00 | *"Od głosu Haliny do sadzonki w Bieczu: cztery kliknięcia. Gotowe do pilotażu w poniedziałek."* ("From Halina's voice to a cutting planted in Biecz: four clicks. Ready for a pilot on Monday.") |

Have a fallback ready: cached responses for the golden path and a backup video in an open tab.

## 4. Phase-1 must-haves

The formal requirements in section 4 of the brief are pass/fail. Missing any one sinks the submission.

- **Name and description.** Halina's story goes in the first three sentences.
- **Both a PDF (≤10 slides) and a video (≤3 min).** The video *is* the phase-1 pitch: follow the arc above and add captions.
- **A demo link with no signup.** Use a role switcher, seeded needs, and test it on a phone over LTE.
- **UX/UI mockups, linked explicitly.** A Figma file or a mockup page.
- **Running cost and resources.** PLN per month, hosting, AI cost per query, staff time, and how it scales to the whole voivodeship.
- **A module→screen map slide**, so mentors can tick off each "+5%".
- **A WCAG 2.1 AA statement**, with axe output and the keyboard, contrast and easy-read features.
- **Data provenance.** The 115 ROPS innovations (CC BY 4.0) and GUS BDL are real; all personas are synthetic. Add a short GDPR and security note.
- **One integration slide.** API, notifications about grant calls, the link to a grants database.
- **Screenshots in the PDF** in case the demo dies during review.
