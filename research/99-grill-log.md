# Grill log: decisions locked

## Settled
| # | Decision | Reason | Unblocks |
|---|---|---|---|
| D0 | **Claude does the job.** Optimise for Claude's throughput of judge-visible output and for never getting stuck. | User principle | Everything |
| D1 | **Goal: the highest chance of any podium finish** | User answer, Q1 (a) | Favours three-place partner tasks; open tasks become secondary or dual submissions only |
| D2 | **Huawei EXCLUDED** | User: drop it if hard to control or Claude isn't seasoned in the tech. ArkTS/DevEco is both. | Shortlist is Goldman vs HubMI |
| D3 | **Pitch in PL and EN: both OK** | User | HubMI and Kraków stay eligible |
| D4 | **3 machines with Claude subscriptions, parallel worktrees, with some usage control** | User | About 3 main sessions plus subagents. Favours a modular build. |
| D5 | **IP transfer is OK** | User | HubMI stays eligible |
| D6 | **Claude API inside the product is affordable.** Sonnet 5.5 costs $2 / $10 per MTok and Haiku 4.5 $1 / $5. A typical call (about 5k in, 1k out on Sonnet) is about $0.02, so about 500 dev and demo calls is about $10. | Pricing from the claude-api skill (cached 2026-09-25) | Not a constraint for HubMI. Goldman requires local models anyway. |

| D7 | **Task: HubMI. Concept: "Sadzonka"** (a merge of tournament proposals 06 + 04 + 05). See `ideas/VERDICT.md`. | 7-advocate tournament; all 3 judges agreed. Realistic P(podium) is about 27–30%. | Build plan, arena run on the concept |
| D8 | Arena plugin installed (Jakeschincariol/arena-skill, reviewed: stdlib Python, local files only) | User request | `/arena --quick` after `/reload-plugins` |

| D9 | **OVERRIDES D7: the whole team goes on the health app (option C).** "Bateria" = one webcam + MediaPipe giving eyes, posture and fatigue in one energy score, with a "beautiful, Instagram-level" visual effect. Target Sport & Healthcare, plus AI if dual entry is allowed. | User decision 2026-10-03 about 13:45; team momentum (a friend already has a working posture prototype). Accepted odds: about 10–15%. | Build round |

## Facts discovered
- Clock: **it's Saturday 11:48. The hackathon started at 11:00. Deadline Sunday 11:00 (about 23h).**
- Dev machine: M2 Pro with 16 GB RAM, **Ollama not installed**. 16 GB fits 1–3B guard models, which is fine for Goldman.
- Multiple-task entry: not forbidden (our inference). Confirm on Discord.

## Open (frontier)
See the latest round in the chat.
