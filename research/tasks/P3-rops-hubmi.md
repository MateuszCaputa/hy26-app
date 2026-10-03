# P3: HubMI.pl (Małopolski Hub Innowacji Społecznych, ROPS Kraków)

ROPS Kraków is the regional social-policy office. The hub is meant to connect social problems with existing social innovations.

**Pool:** 15,000 PLN, paid as 1st 6,000 / 2nd 5,000 / 3rd 4,000. **Language: Polish only.**
**IP: winners must sign a copyright-transfer agreement** with Proidea.
**Upside:** ROPS plans to develop the winning prototype into the real Hub, with regional rollout and implementation grants.
**Sources:** `sources/txt/HubMI_pl_details.txt` (and `HubMI_pl_rules.txt`)

## The brief
Design, name and prototype the **"digital heart"** of the Hub. It's an AI-powered platform that matches residents' and municipalities' social problems with existing social innovations, and supports the ideas pipeline (pitching an idea, testing it, spreading it).

### Modules (I is mandatory; **each extra module scores +5%**)
1. **Matchmaking społeczny (MANDATORY):** a user describes a problem, and the system finds similar cases and proposes ready social innovations. **RAG / embeddings matching.**
2. **Zasobnik wiedzy (knowledge base):** Małopolska's challenges (reports, the Map of Social Challenges), a library of about 200 innovations (including videos), educational materials. Fast updates. **Admin-only trends view** that aggregates needs by area.
3. **Kreator pomysłów (idea creator):**
   - an idea card ("fiszka")
   - a **grant-application generator** tailored to each funding call
   - a social-innovation canvas
   - an **AI assistant** that develops the idea and **visualises it** (image generation)
4. **Tester innowacji (innovation tester):** sign up as a tester, rate solutions, give feedback.
5. **Platforma komunikacji (communication):** dialogue between ROPS and users, mentor support, partnerships.
6. **Panel administratora (admin panel):** edit, verify and publish knowledge.
7. **Middleman Innowacji (AI assistant):** adapts an innovation into a service tailored to the requesting institution.

### Required
- A functional MVP: the mandatory module plus as many others as possible.
- At least UX/UI mockups.
- **WCAG 2.1 AA.**
- Scalable, ready to integrate with other systems, data security.
- **Submission:**
  - name and description
  - PDF of 10 slides max **or** a 3-minute video
  - **a demo link and the mockups**
  - **an estimated running and maintenance cost**, with the resources needed
- **Users (four roles):**
  - residents and NGOs
  - municipalities (JST)
  - ROPS staff (admins)
  - experts

### Materials provided on site
- the Map of Social Challenges and reports
- the innovation library link
- the canvases
- **sample data**
- mentors at the ROPS stand

## Scoring
| Criterion | Weight |
|---|---|
| **Degree of fulfilment:** quality of key elements **plus number of extra modules** (mandatory module 10%, **+5% each**) | **40%** |
| Implementation potential (scalable, flexible, cheap to maintain) | 20% |
| **Accessibility and intuitiveness, WCAG 2.1 AA**, usable by every age and skill level | 20% |
| Interface attractiveness and inventiveness | 10% |
| Quality of materials and MVP communication | 10% |

**Validation questions they will ask:**
- Can a senior fill it in without help?
- How is the admin notified of a new idea, and how does the reply reach the author?
- Do suggestions match keywords accurately?
- Is it new, or just a mash-up of existing portals?

## Claude-fit analysis: 5/5
- **This is the closest thing to "the scoring formula rewards Claude's throughput".**
  - Mandatory module 10% + six modules × 5% = 40%, so **shipping all seven modules maxes the biggest criterion**.
  - Parallel Claude sessions, one per module, give exactly that.
- It's a standard web CRUD app with RBAC, a RAG matchmaker, generators, an admin panel and dashboards. Claude's home turf.
- WCAG AA: Claude knows it well (shadcn/Radix are accessible by default). Add a high-contrast mode, font scaling, keyboard navigation and screen-reader labels, and **run axe-core / Lighthouse to show a score of 100 on stage**.
- Polish UI copy: Claude is fine.
- **Zero external toolchain risk.** It's the most "never stuck" option of all.

## Stuck risks
| Risk | Mitigation |
|---|---|
| Sample data only arrives on site | Seed from the public ROPS innovation library now (scrape or summarise). Swap in theirs later. |
| Breadth over depth looks shallow | The mandatory matchmaking must be **excellent** (good RAG plus explanations of why each match was chosen). The others can be thinner but real. |
| Popular, accessible theme draws many teams | Differentiate on completeness (all seven modules) plus a WCAG score plus a real cost model. |
| IP transfer | A team decision. It doesn't matter if it's a hackathon throwaway. |

## Wow ideas
- **"Describe your problem in your own words, or by voice."** A senior speaks; the system shows three matching innovations with videos, a "why it matches" explanation and a contact for the municipality that ran it.
- **A grant application generated live** from an idea card, tailored to a specific call, exported to DOCX/PDF.
- **AI visualisation of an innovation idea** (image generation) in the Idea Creator.
- **Admin trend heatmap** of needs across Małopolska's municipalities (gminy).
- **Accessibility mode toggle** live on stage: large font, high contrast, simplified language ("tekst łatwy do czytania", easy-to-read text).

## Competition guess
A Polish-only social theme attracts mid-size, less technical teams. Estimated 15–30. Prize is the same as Goldman.

## Open questions for grilling
- Do we have a Polish-speaking pitcher?
- Is the team OK with the IP transfer?
- AI in product: Claude API is allowed here (no restriction mentioned) and gives the best quality.
