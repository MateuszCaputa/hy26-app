# P2: Imagine What's Next (Huawei, HarmonyOS / OpenHarmony / Oniro)

**Pool:** 25,000 PLN, paid as 1st 12,000 / 2nd 8,000 / 3rd 5,000. This is the **biggest 2026 pool**. **Language:** English only.
**IP:** a non-exclusive royalty-free licence to Huawei if you accept a prize.
**Sources:** `sources/txt/IMAGINE_WHAT_S_NEXT_details.txt` (and `IMAGINE_WHAT_S_NEXT_rules.txt`)

## The brief
Build an innovative **system feature or mobile app for an OpenHarmony-based device**, in one or more of these areas:
- **Intelligent Experiences:** agents, contextual awareness, on-device AI.
- **Spatial Experiences:** 3D, sensing, positioning, spatial UI.
- **Human-Centric Tech:** accessibility, digital wellbeing, education, inclusion. *The screen-break app fits here.*

## Hard technical requirements
- Target HarmonyOS / OpenHarmony / Oniro at **API 20 or later**.
- Native ArkTS + ArkUI (or C/C++), **or** React Native for OpenHarmony (RNOH) with a real OpenHarmony build. **A web, Android or iOS build alone does not count.**
- Must **run on an emulator or a real device**.
- Must **use at least one platform, device or system capability**.

## Deliverables
1. A public repo.
2. Reproducible build instructions.
3. **A working `.hap` package** (the HarmonyOS app file).
4. A recorded demo.
5. An architecture write-up.
6. **AI_WORKFLOW.md:** the models, agents, MCP servers and skills used, main prompts, workflow, how output was validated, and lessons learned.
7. AI-feature documentation, if the app has an AI feature.

## Scoring
| Criterion | Weight |
|---|---|
| Originality | 20% |
| Demonstrated usefulness ("a working narrow solution beats a broad concept") | 20% |
| Technical execution (works, sensible architecture, error handling, *tests*, hygiene) | 20% |
| **Use of platform capabilities** (an app that would run unchanged on another OS scores low) | 20% |
| Demo quality (emulator expected; mentors have real devices on site) | 10% |
| Reproducibility and **transparency of the AI dev workflow**, commit history | 10% |

Each juror scores 1–10 per criterion and the scores are averaged. **You need at least 50% to receive a prize.**

## Claude-fit analysis: 3/5
- **Good:**
  - ArkTS is TypeScript-like and ArkUI is declarative, similar to SwiftUI or Compose. Claude can write it.
  - **20% of the score (AI_WORKFLOW.md plus reproducibility) is pure documentation**, which Claude produces trivially. Huawei *explicitly encourages* agentic coding.
- **Bad:**
  - Claude's training data on ArkTS/ArkUI API 20 is thin and APIs change quickly, so expect hallucinated APIs.
  - The build loop goes through **DevEco Studio / hvigor / HDC / signing**. That's GUI-heavy and slow, and Claude can't see emulator errors unless you pipe logs back.
- **The killer question:** can we get "hello world .hap running in the emulator" on our Macs within 1–2h? If not, abandon.
  - DevEco Studio supports macOS on Apple Silicon. The emulator needs a Huawei developer account and an image download, which is several GB over venue wifi.

## Stuck risks
| Risk | Mitigation |
|---|---|
| DevEco install / emulator image download / account login | **Do it NOW, before committing.** Take a phone hotspot. Mentors on site have devices. |
| Claude hallucinating ArkTS APIs | Feed it the official docs through context7 or downloaded docs. Keep scope narrow. Copy the official samples repo. |
| hvigor command-line builds | Script `hvigorw assembleHap` so Claude can run builds and read errors itself (this closes the loop). |
| Platform-capability criterion | Pick 1–2 genuinely Harmony-specific features: distributed/multi-device flows, on-device AI kit, accessibility services, sensors. |

## Wow ideas
- **Human-centric plus intelligent:** an on-device AI accessibility agent, e.g. it reads the screen and narrates or simplifies UI for seniors. Combines areas, which the criteria reward.
- **Digital wellbeing system feature:** screen-time or eye-strain guardian (the screen-app idea), using the front camera plus a system-level overlay. The 2025 winner Rest & Blink validates the idea, and here it's not crowded.
- **Distributed / multi-device:** phone and watch handoff (Harmony's signature feature).

## Competition guess
Probably the fewest teams of any partner task (5–15), because the toolchain filters people out. The biggest prizes. **The highest variance: our EV is roughly 3k × P(toolchain works).**

## Open questions for grilling
- Has anyone on the team got DevEco installed or a Huawei ID? Can we test the emulator before committing?
- Native ArkTS or RNOH? (RNOH adds another layer that can break.)
- Is the team OK with a mobile-first demo instead of a web app?
