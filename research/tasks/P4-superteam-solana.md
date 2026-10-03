# P4: Finance Without Intermediaries (Superteam Poland, Solana)

**Pool:** 11,300 PLN. The rules give one figure; the split isn't stated, so assume 1st place only unless told otherwise. **Language:** PL or EN. **IP:** stays with the team.
**Sources:** `sources/txt/Finance_Without_Intermediaries_details.txt` (and `Finance_Without_Intermediaries_rules.txt`)

## The brief
Build a Solana app that **removes the need for trust** in a financial transaction. Take a relationship that needs an intermediary (escrow, freelancer settlements, conditional-refund fundraisers, revenue sharing, parametric insurance, loyalty, B2B settlement) and put its terms **on-chain** so neither party can circumvent them.

### Hard requirements
- **Logic must live in the on-chain program.** "If your backend enforces the terms, the intermediary has become you."
- Devnet is fine.
- **The live demo must work:** a full flow from the user connecting a wallet to a confirmed transaction, shown in the block explorer.
- A design rationale: who the intermediary was and what changes.
- **Name the target user explicitly.**
- **Submission:** description, PDF of 10 slides max, **a video of 3 minutes or less**, the repo.

### What judges ask
- Where exactly does the intermediary disappear in the code?
- What if a party disappears halfway?
- Who can do what, and can you, as the author, change it after deployment?
- **Why blockchain and not a database?**
- What would you do with another week?

They **don't** test security, audit the code, or nitpick design. "Rough UI is fine." They value honesty about limitations.

## Scoring
| Criterion | Weight |
|---|---|
| Relevance to challenge | 30% |
| Completeness and functionality | 25% |
| Idea and problem choice | 20% |
| Implementation potential | 15% |
| Originality | 10% |

## Claude-fit analysis: 3/5
- Claude writes Anchor (Rust) programs and web3 frontends reasonably well. An escrow or milestone-payment program is a classic pattern.
- **Friction:**
  - Rust and Anchor compile times.
  - Anchor version drift (0.29 → 0.31 broke a lot), so Claude may produce stale syntax.
  - Wallet adapter setup.
  - Devnet faucet rate limits.
- They provide a **dev container** (github.com/matzayonc/solana-live-course-2026) and Solana Playground. Use those to avoid setup hell.
- Design isn't scored, so Claude's UI strength is wasted here. The value is in a correct program plus a clear story.

## Stuck risks
| Risk | Mitigation |
|---|---|
| Toolchain setup | The dev container or Codespaces from the bootcamp repo. |
| Faucet or RPC down | Pre-fund several wallets early. Record a backup video. |
| Anchor API drift | Pin versions from the bootcamp repo. Give Claude the docs through context7. |

## Wow ideas
- **Freelancer milestone escrow** with automatic release on a deadline and a dispute timeout. Target user: Polish freelancers invoicing foreign clients.
- **Parametric insurance**, e.g. a train-delay payout using a Pyth/Switchboard oracle (a weather oracle is easier).
- **Conditional-refund crowdfunding** for local social causes.

## Competition guess
Niche (crypto devs). Probably 8–15 teams, but those teams are motivated Solana people with prior experience. One prize.

## Verdict
Medium. Only pick it if someone on the team already knows Solana. Otherwise Claude-fit is lower than P1 and P3, and there's only one prize.
