# ROI matrix: all 2026 tasks

Scale: 1 (bad) to 5 (good). **Claude-fit** = how much of the scored work Claude can produce directly. **Unstuck** = low risk of hitting a wall Claude can't push through. **Field** = expected competition (5 = few teams). **Odds** combines places paid and field size.

| # | Task | Partner | Pool (PLN) | Places | Lang | Claude-fit | Unstuck | Field | Wow ceiling | Odds | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | AI Control Layer | Goldman Sachs | 15,000 | **3** (6 / 5 / 4) | EN | **5** | 4 | 4 | 5 | **5** | Exact spec; judges hit it live; tests are scored; local models only |
| P2 | Imagine What's Next | Huawei | **25,000** | **3** (12 / 8 / 5) | EN | 3 | **2** | **5** | 4 | 4 | ArkTS/DevEco emulator is the blocker; AI workflow docs required, which favours a Claude team |
| P3 | HubMI.pl | ROPS Małopolska | 15,000 | **3** (6 / 5 / 4) | **PL** | **5** | **5** | 3 | 3 | 4 | +5% per module, so breadth equals points; WCAG AA; **IP transfer on win**; likely to be deployed |
| P4 | Finance Without Intermediaries | Superteam | 11,300 | 1? | PL/EN | 3 | 3 | 4 | 3 | 3 | Logic must live on-chain; must work live; "rough UI ok" |
| P5 | Kraków bez barier | City of Kraków | 5,000 | 1 | **PL** | 4 | 3 | 4 | 3 | 3 | OpenStreetMap data; business model 20%; WOW 10%; small prize |
| O1 | Defence | Proidea (open) | 8,000 | 1 | PL/EN | 4 | 4 | 2 | 4 | 2 | Very open; 2025 winner was hardware/sensor + NATO TAK |
| O2 | Sport & Healthcare | open | 8,000 | 1 | PL/EN | 4 | 5 | 2 | 3 | 2 | Screen-break / wellness apps live here (already won in 2025) |
| O3 | Smart City | open | 8,000 | 1 | PL/EN | 4 | 4 | 2 | 3 | 2 | Overlaps Kraków task |
| O4 | Artificial Intelligence | open | 8,000 | 1 | PL/EN | **5** | 5 | **1** | 4 | 1 | Most crowded; "unexpected twists" may be added mid-event |
| O5 | ImpactHer | open | 8,000 | 1 | PL/EN | 4 | 5 | 3 | 3 | 2 | Tech for women's needs; probably a smaller field |
| X1 | REENTRY CTF | Hex-Rays and others | 5,000 + IDA Pro | ? | – | 2 | 2 | – | – | – | Separate skill game; hard to parallelise with a build |
| X2 | Prelint | Prelint | $5,000 credits | 1 | – | 5 | 5 | ? | – | ? | **Stackable**: build your main project through Prelint |

## Expected value, rough
EV ≈ P(podium) × average prize.
- **Goldman:** 3 slots, an estimated 10–20 teams, and Claude-fit 5, so podium chance is about 30–40%. EV is about 1.5–2.4k, plus a recruiter and visibility upside.
- **HubMI:** 3 slots, about 15–30 teams (an easy theme draws a crowd, but the Polish requirement filters some out), so podium chance is about 25–35%. EV is about 1.2–1.8k, minus the IP transfer.
- **Huawei:** 3 slots, probably fewest teams (5–15). Podium chance is 40%+ **if the toolchain works**, about 0 if not. EV is about 3k × P(toolchain OK).
- **Open tasks:** 1 slot, 30–50 teams, so 3–6% chance. EV is about 0.3–0.5k.

## Shortlist (to grill)
1. **P1 Goldman**: best combined Claude-fit, odds and wow.
2. **P3 HubMI**: the safest "never stuck" option, where breadth equals points.
3. **P2 Huawei**: highest ceiling, only if the toolchain risk is killed in the first 2h.
4. **X2 Prelint**: stack it on whichever we choose.
