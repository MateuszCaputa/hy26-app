# P1: AI Control Layer (Goldman Sachs)

**Pool:** 15,000 PLN, paid as 1st 6,000 / 2nd 5,000 / 3rd 4,000. **Language:** English only. **IP:** stays with the team.
**Sources:** `sources/txt/AI_Control_Layer_details.txt` (and `AI_Control_Layer_rules.txt`)

## The brief
Build a lightweight **AI control layer**: a gateway, proxy, middleware or SDK wrapper that sits between apps, agents, MCP servers, LLMs and APIs. It must enforce **security, privacy and budget controls** from one central config, and produce reporting for both security teams and management.

### Required (formal)
1. **Central policy engine:** one config source with:
   - the controls
   - sensitivity thresholds (block vs redact, adherence %)
   - the list of allowed models
   - budgets
2. **Controls:**
   - **Deterministic:** regex for PII and secrets, authentication and access checks.
   - **Semantic:** an AI-based classifier.
   - **The hybrid of the two is mandatory.**
3. **Budget and resource governance:** token spend, compute time, resource access, and loop or runaway detection.
4. **Historical-attack mitigation:** a signature feed (can come from an external source) covering:
   - malicious code execution
   - unsafe deserialisation (e.g. pickle)
   - model-repo supply-chain attacks
5. **Reporting and audit:**
   - real-time metrics (blocked count, budget use)
   - **exportable audit logs**
6. **Self-testing suite:** automated **positive (allowed) and negative (blocked/redacted)** cases.

### Deliverables
- The working layer, plus a demo agent (you can reuse an existing one, e.g. a simple LangChain or MCP agent).
- An **architecture diagram**.
- A **documented policy file** showing different strictness levels and budget rules.
- An **interactive dashboard**: controls, security posture, blocked threats, cost.
- An **executable test suite**.

### How judging actually works (key)
- **Judges run your test suite** themselves.
- **Judges type spontaneous prompts live** at the running layer.
- **Judges edit your config files** (change rules, remove controls, adjust thresholds) and watch whether the change applies, ideally in real time.
- They ask for **performance telemetry** (latency overhead per request).
- They review the architecture, dashboards and logs.

### Constraints
- **No paid APIs are provided.** "Ensure you can design, build and run the entire system on your own setup." Expect local models through **Ollama**.
- The agents and apps behind the layer are **not assessed**. Only the layer is.

## Scoring
Two versions conflict. Both put **robustness first** and **reporting at 20%**.

| Criterion | Details PDF | Rules PDF |
|---|---|---|
| Robustness / guardrail quality | 30% | 30% |
| Architecture & performance efficiency | 20% | 20% |
| Security reporting | 20% | 20% |
| Self-testing suite completeness | 15% | 20% |
| Practical implementability & scalability | 15% | 10% |

## Claude-fit analysis: 5/5
- This is essentially a backend and security engineering spec with crisp acceptance criteria. Those are Claude's best conditions.
- **Every scored item is code Claude writes well:**
  - an HTTP proxy that speaks the OpenAI-compatible API format
  - a YAML policy file with hot-reload
  - regex and entropy detectors
  - a semantic classifier through Ollama
  - token and cost accounting
  - a SQLite audit log
  - a Next.js or Streamlit dashboard
  - pytest
- **OWASP LLM Top 10 and OWASP agentic threat lists:** Claude knows these well and can map each control to an OWASP ID, which judges in finance security love.
- **Nothing proprietary, no hardware, no external data.** Ollama is the only local dependency.

## Stuck risks
| Risk | Mitigation |
|---|---|
| Ollama latency on laptops while judges type live | Small guard model (Llama Guard 3 1B / Qwen2.5-1.5B / prompt-guard-86M through HF). Cache verdicts. Run deterministic checks first and only call the AI when they're ambiguous. Show latency per stage on the dashboard. |
| "Hybrid" judged as shallow | Layered pipeline (regex, then heuristics, then embeddings similarity to known jailbreaks, then LLM judge). Each layer shows on screen *which* layer caught it. |
| Config hot-reload breaking live | File watcher + schema validation. Invalid config means keep the last good config and show an alert. Practise exactly this, because judges will do it. |
| Venue wifi | Everything runs locally. That's a requirement anyway. |
| Using Claude API in product | Not provided and risky given "run on your own setup". Use Ollama in the product; Claude only builds it. Optional: a pluggable "external judge" provider. |

## Wow ideas (pick 1–2)
- **Live red-team console:** a judge picks from 30 real historical attacks (DAN, indirect prompt injection in a PDF, MCP tool poisoning, pickle exploit, secret exfiltration) or types their own. The dashboard flashes which layer blocked it and why.
- **"Edit the policy, watch it change":** a split screen showing the YAML on the left and the same prompt flipping from BLOCK to REDACT to ALLOW on the right, in under a second.
- **Budget kill-switch demo:** an agent in a runaway loop gets throttled, then cut off, with a cost graph flatlining.
- **MCP-aware:** intercept agent-to-MCP tool calls and enforce per-tool access control ("this agent cannot call `delete_*`"). That's very current in 2026.
- **One-line integration:** change `base_url` in any OpenAI or Anthropic SDK client and you're protected. A developer-speed story, which the brief explicitly cares about.

## Competition guess
English-only, security-heavy, and technical, so it filters out idea-only teams. Estimated 10–20 teams. Strong teams will still show up, especially Goldman-curious students from AGH, PW and UJ.

## Open questions for grilling
- Proxy in Python (FastAPI) or TypeScript (Hono/Node)?
- Which local guard model? Benchmark on our laptops in hour 1.
- Do we build our own demo agent, or use an existing one (e.g. Claude Code is out because it uses paid APIs; maybe the Ollama + smolagents demo)?
- How far do we go on "historical attack signatures": a JSON feed we write, plus fetching from a public URL?
