# Claude playbook: what Claude builds best, and where teams get stuck

## Where Claude is strongest (highest judge-visible output per hour)
| Strength | Why it matters for judging |
|---|---|
| **Next.js / React + Tailwind + shadcn/ui web apps** | Design is 20% of most tasks. Claude produces polished, consistent UI very fast. |
| **TypeScript or Python backends, REST APIs, SQLite/Postgres, auth/RBAC** | "Completeness": many modules shipped, each one working |
| **Test suites (pytest/vitest), fixtures, CI** | Goldman scores the test suite at 15–20%. Huawei rewards tests. Repeat winners showed CI. |
| **LLM features: RAG, embeddings matching, agents, tool calling, structured output** | "AI plays a meaningful role" is the recurring winning shape |
| **Rules engines, regex/PII detection, policy-as-config (YAML)** | Deterministic, testable, demo-able. A perfect fit for Goldman. |
| **Dashboards and charts (Recharts, ECharts)** | Live metrics on screen read as a wow moment and look real |
| **Docs: README, architecture diagrams (Mermaid), AI_WORKFLOW.md, slide copy** | Every task asks for them. Claude writes them while the code is built. |
| **Polish and English copy** | HubMI and Kraków require Polish. Claude writes good Polish UI text. |
| **Parallel work: subagents and worktrees** | 3–5 Claude sessions building separate modules at once multiplies output. HubMI's "+5% per module" rewards exactly this. |

## Where teams get stuck, and Claude can't rescue them
| Trap | Why | Affected tasks |
|---|---|---|
| **Proprietary IDE/emulator toolchains** | Claude can write ArkTS, but can't click through DevEco installs, signing or the emulator GUI. Setup failures stop everything. | Huawei |
| **Hardware / sensors** | Physical debugging, drivers | Defence (FOKZ-style), CTF hardware |
| **Blockchain deploy and wallet flows** | Anchor/Rust compile cycles are slow. Devnet faucets fail. Wallet UX is fiddly. Claude knows Anchor, but the iteration loop is slow. | Superteam |
| **Live external data you don't control** | APIs go down and wifi at Tauron Arena is shaky. **Always cache and seed data locally.** | Kraków (OpenStreetMap), Smart City |
| **Local model performance** | Ollama on laptops is slow, and judges type ad-hoc prompts, so latency hurts. Pick small guard models (Llama Guard 3 1B, Qwen2.5 1.5–3B). | Goldman |
| **Vague open briefs** | No spec means ideation burns hours. Claude does best with a concrete spec. | All open tasks |

## Default stack (zero-friction)
- **Web:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Recharts.
- **Data:** SQLite through Drizzle/Prisma, with seed scripts. Deploy to Vercel or run locally with a tunnel.
- **AI:** Claude API (Sonnet 5.5 for features, Haiku 4.5 for cheap or fast calls), embeddings for matching. Ollama only when the task forbids paid APIs.
- **Python services:** FastAPI + pytest, if the task is proxy or security shaped.
- **Repo:** one monorepo, `CLAUDE.md` with the spec and criteria pasted in, Prelint optional.

## Process that makes Claude win
1. **Paste the full task PDF and the scoring weights into CLAUDE.md.** Claude then optimises against the scoring automatically.
2. **Write the spec first (1h):** modules, a demo script, the "wow moment", and the slide outline. **Write the demo script before writing code.**
3. **Run parallel Claude sessions, one module each**, with a shared contract (API types and DB schema) written first.
4. **Keep a demo build running from hour 4.** Never be more than 30 minutes away from a working demo.
5. **Freeze features at T-4h.** Then polish, seed data, record the video, write the slides and README, and practise the pitch with Claude acting as a hostile jury.
6. **Explain session:** Claude walks each team member through the architecture so everyone can defend it (the AI policy requires this).

## What reads as a wow moment to HackYeah judges
- **Judges interact with it live** and it reacts. Goldman designed its judging around this.
- **Something visibly moving:** a live dashboard, counters, a map, a "blocked!" alert flash.
- **Before and after:** "this took 3 days of emails; now it takes 30 seconds."
- **More scope than expected:** every requested module present, plus one they didn't ask for. HubMI and Kraków score this explicitly ("WOW factor 10%", "+5% per module").
- **Real data from the partner's own world**, not lorem ipsum.
