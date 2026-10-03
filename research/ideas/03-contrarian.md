# 03: Contrarian. Drop HubMI, take Goldman, and submit it to Defence too

## 1. Idea name + pitch
**TRIPWIRE: an AI firewall the judges can try to break live.**
- EN: Swap one `base_url` and every agent, LLM and MCP call goes through a hot-reloaded YAML policy and four layers (regex, signatures, local AI judge, budget governor). Every decision shows up live on the dashboard and in the audit log.
- PL: Zmieniasz jeden `base_url` i każde wywołanie agenta, modelu czy MCP przechodzi przez politykę YAML i cztery warstwy kontroli. Każdą decyzję widać na żywo.

## 2. Tasks targeted
- **P1 Goldman:** 15k PLN for 3 places, and IP stays with us.
  - The rules PDF (line 32) accepts **English or Polish**, so the "English-only" filter we assumed doesn't exist.
- **Dual submit to O1 Defence** (cyber, resilience) if Discord confirms it's allowed. Same build, no extra work.

## 3. The wow moment
1. A judge edits `policy.yaml` (`pii.email: redact → block`) and saves.
2. The prompt they typed earlier is replayed and flips from amber REDACTED to red BLOCKED in under a second.
3. A waterfall shows the latency each layer added.
4. The judge clicks **"Run judge suite"** and 150+ pytest cases stream in, each tagged with its OWASP ID.

The brief says judges *will* do exactly this; we script around it.

## 4. What gets built
**MUST**
- FastAPI proxy:
  - OpenAI-compatible endpoint.
  - MCP tool-call interceptor with per-agent allow/deny lists.
- `policy.yaml`:
  - Profiles: `dev`, `standard`, `bank`.
  - Settings: block/redact thresholds, allowed models, budgets.
  - Hot-reload; bad edits keep last good config.
- Deterministic layer:
  - PII: PESEL, IBAN, cards (Luhn check), email.
  - Secrets: matched by pattern and entropy.
  - Auth: API-key check.
- Semantic layer: a local Prompt-Guard-86M or Llama Guard 3 1B classifier. It only runs when the deterministic layer finds nothing.
- Budget governor:
  - Token and cost tracking per key.
  - Loop detection, which throttles first and then kills.
- Test suite: a parametrized pytest suite with 150+ allow, block and redact cases, run with one command.
- Next.js dashboard, fed over SSE (server-sent events). It shows posture, blocked threats, cost, per-layer latency and the audit export.

**SHOULD**
- A signature feed loaded from a URL: jailbreak strings, a scan for malicious pickle opcodes, and model-hash allowlists.
- A red-team console with 30 one-click attacks.
- A Mermaid architecture diagram.

**COULD:** embeddings jailbreak detector, output redaction.

## 5. 22-hour plan
**12:30–14:00:** contract (policy schema, `Decision` event, SSE format). Benchmark the guard model on the M2 Pro.

**14:00–19:00:**
- **A:** proxy, policy loader, hot-reload, auth.
- **B:** regex and secret detectors, guard model.
- **C:** dashboard shell and live feed.
- **Pitcher:** 150 PL/EN test prompts via Claude.

**19:00 gate:** a curl request shows BLOCK on screen, end to end.

**19:00–01:00:**
- **A:** MCP interceptor, budget governor.
- **B:** signatures, pickle scan.
- **C:** latency waterfall, export, red-team console.
- **Pitcher:** slides, OWASP map.

**01:00–06:00:** sleep in shifts. One Claude worktree keeps growing the test corpus.

**07:00:** feature freeze. Until 10:00, drill "a judge tries to break it". Record the video.

**10:30:** submit.

## 6. Estimated score
| Criterion | Weight | Estimated score |
|---|---|---|
| Robustness | 30% | 22 |
| Architecture & performance | 20% | 16 |
| Reporting | 20% | 17 |
| Tests | 15% | 14 |
| Implementability | 15% | 11 |
| **Total** | | **≈ 80%** |

P(podium) estimates:
- **Goldman: about 40%** (field 10–20; many will ship regex demos without hot-reload or real tests).
- **Defence: plus about 5%.**
- **HubMI: about 22%.**

## 7. Stuck risks & kill-switches
- **14:00 gate: guard model slower than 500 ms.** Switch to Prompt-Guard-86M on ONNX, or an embeddings classifier.
- **19:00 gate: no end-to-end demo.** Cut MCP and signatures, ship only the MUST list.
- **Security Q&A.** Claude writes `THREAT_MODEL.md` (OWASP ID → control → test name). Two hostile-judge drills with Claude; every answer is "here's the test that proves it."
- **A judge's prompt gets through.** The default `bank` profile fails closed. We add the prompt to the corpus live ("now it's test #181").

## 8. Why it beats HubMI
- **HubMI's biggest criterion stops separating teams.** "+5% per module" rewards code output, and every team with an AI coding tool can ship all 7 modules. The 40% stops differentiating, and the result comes down to subjective WCAG, look and pitch. That jury rewards local credibility, a human skill.
- **HubMI will be crowded.** The theme is easy, and the Polish-only rule filters almost nobody in Kraków.
- **HubMI costs us the IP.** Winning means signing it away.
- **Goldman is judged on behaviour the judges can check.** Tests, live prompts, config edits: all Claude-strong; passing tests outweigh stage presence.
- **The other alternatives are worse:**
  Kraków (5k, 1 winner), Solana (Anchor loops), ImpactHer (1 winner, needs lived story).

## 9. Weaknesses I concede
- **Stronger rivals.** Security-minded AGH/PW teams will show up and may beat us in the Q&A.
- **Blind spots.** With zero security intuition, we'll miss edge cases that Claude also misses. Robustness (30%) is where we lose points.
- **The local model can misfire,** blocking judges' harmless prompts as false positives.
- **HubMI is safer:** real data, deployment upside.
- **Defence dual entry unconfirmed**, and that jury likes field-ready ops.
