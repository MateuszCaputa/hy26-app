# P5: Kraków bez barier (Gmina Miejska Kraków, the city)

**Pool:** 5,000 PLN, one winner. **Language: Polish only.** **IP:** stays with the team.
**Sources:** `sources/txt/Cracow_without_barriers_details.txt` (and `Cracow_without_barriers_rules.txt`)

## The brief
A tool that lets residents and tourists judge whether a place or route is accessible **for their specific needs**, e.g. wheelchair users or parents with strollers. It must show detailed facts, not a yes/no:
- stairs, thresholds, ramps, lifts
- door width, surface type
- accessible toilets, places to rest

**Every fact needs a source, a date and a reliability status.** Unverified user reports must be visibly separate from confirmed data.

### Constraints
- Data from public sources: **OpenStreetMap** (it has `wheelchair=*`, `ramp`, `kerb`, `surface`, `step_count`, `toilets:wheelchair` and more), owners' info, user reports.
- **No manual database upkeep by the city, and no access to internal city systems** (UMK, MJO).
- The architecture must separate data ingestion from presentation, and show how new sources, categories and cities get added.
- **WCAG 2.2 AA** as a goal: keyboard navigation, screen reader, contrast, **text alternative to the map**.
- A hosting and maintenance model outside city infrastructure. Data-protection basics.
- Must have potential for **commercialisation and scaling to other cities** (hotels, events, booking systems, map providers).

### Submission
- solution description
- prototype or demo
- target group
- data sources and how freshness is judged
- **business model**
- PDF of 10 slides max
- **video of 3 minutes or less**

## Scoring (two documents disagree)
**Details PDF:**

| Criterion | Weight |
|---|---|
| Fit and usefulness for the target group | 25% |
| Prototype quality | 20% |
| Data reliability and presentation | 15% |
| Deployment potential and scaling | 20% |
| **Business model** | 20% |

**Rules PDF:**

| Criterion | Weight |
|---|---|
| Idea | 30% |
| Technical aspects | 30% |
| Design | 20% |
| Fit | 10% |
| **WOW factor** | 10% |

## Claude-fit analysis: 4/5
- A web map app (MapLibre + Overpass/OSM), routing, and a reliability badge system. Claude handles all of this well.
- The business model write-up is easy for Claude.
- **Risk:** routing that respects accessibility needs a router (OSRM/GraphHopper/Valhalla custom profiles). Valhalla has a wheelchair profile, but setup takes time. You can fake it on a small area.

## Stuck risks
- The Overpass API is rate-limited and venue wifi is flaky, so **pre-download a Kraków Old Town extract**.
- OSM accessibility tags are sparse, so you have to show "unknown" honestly. That fits the brief, which explicitly wants reliability levels.

## Wow ideas
- "Can I get there?" Pick a needs profile (wheelchair width 70 cm, no steps above 2 cm), get a route plus a per-segment breakdown of barriers, each with its source and date.
- An **AI step-counter from a photo**: a user snaps an entrance and a vision model estimates steps or ramp, saved as an unverified report.
- An **embeddable widget for hotels and events**: one script tag. That's the business model, shown live.

## Verdict
A good fit but a **small prize with one winner**. The same project could also go to Smart City (O3) if both submissions are allowed. Check the rules.
