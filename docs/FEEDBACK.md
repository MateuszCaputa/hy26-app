# FEEDBACK: mentors & user tests

> What people outside the team told us, verbatim-ish, plus what we do about it. Newest first.
> Turn an item into a PLAN task (with an ID and owner) before building it.

## Sat 2026-10-03 ~18:30, Sport & Healthcare mentor (via Mateusz)

**Overall:** the mentors like it ("eye stuff is super good"); UX is OK but could be even simpler.

| # | What the mentor said | What it means for us | Proposed task | Size |
|---|---|---|---|---|
| F1 | **Simpler UX.** Hiding the detailed data is good, but what's shown up front should be so simple and clear that nobody has any doubt what is happening right now. | The live view should lead with 1–2 plain statements ("Siedzisz prosto" / "Cofnij brodę"), not numbers that need explaining. Details stay one click away. | C7a: live view "one glance" pass (state sentence + one action; score/Bateria secondary) | ~1 h |
| F2 | **Conditional skeleton.** When posture is good, the lines don't need to glow; they can be very greyed out. They should light up when something goes wrong. | Matches our colour plan **B**: neutral, greyed skeleton by default; the segment with the problem (neck, shoulders, spine) lights up amber/red. Keeps the wow and gives it meaning. | MP11: state-driven overlay (grey when good, problem segment coloured) + Stonowany/Pokazowy switch | ~1.5 h |
| F3 | **A little figure ("ludzik") next to the details panel**, an even simpler way to see what's wrong. | A small SVG body diagram in the side panel; the body part with the current top issue is highlighted (head forward → neck/head, slouch → back, tilt → shoulders). Works even without looking at the camera. | C16: posture figure in the readout panel, driven by `topIssue` + severities | ~1.5 h |
| F4 | **Water reminders.** Could we see that I drink from a bottle and count the sips in a given time, so I know if I hydrated well? | Two levels: (a) **easy**: hydration reminder in the existing nudges (e.g. every 45–60 min) with a one-tap "Wypiłem" counter; (b) **hard**: detect drinking from the camera: MediaPipe ObjectDetector (COCO has *bottle* / *cup*) near the face + wrist at the mouth + head tilting back for ~1 s → count a sip. It's an **estimate**, so label it so; costs FPS (run detection ~2×/s). | B8a reminder + tap counter (~45 min) · B8b camera sip detection (stretch, ~3–4 h, after the draft) | S / L |

**Not now (team decision before the draft):** camera-guided exercises (live preview inside the exercise screen) are risky because they move the shared `<video>` element (the MP1 freeze class of bug). Revisit after the draft together with A4 (rep counter).
