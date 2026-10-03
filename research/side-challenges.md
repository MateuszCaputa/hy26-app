# HackYeah 2026: side competitions we can run alongside HubMI

Researched Sat 3 Oct 2026 at about 13:00. Sources: the hackyeah.pl CMS dump (`_serverFn` taskSections), the REENTRY CTF regulamin PDF (saved as `sources/reentry-ctf-rules.pdf` and `sources/txt/reentry-ctf-rules.txt`), the general rules (`sources/txt/hackyeah-2026-general-rules.txt`) and a web search.

## What exists

The CMS `taskSections` lists exactly 5 Open Tasks, the REENTRY CTF, the Prelint Challenge and 6 Partner Tasks. Nothing else in the CMS offers a prize: no quiz, booth contest, Discord contest or separate SheHacks contest. SheHacks now only appears historically; its successor is the open task **ImpactHer** (8,000 PLN), which is a main-track task and not a side contest. The general rules (§4.13) say that "additional activities, such as workshops, lectures, or contests, may also be conducted". Partners might therefore run small booth or swag contests that are announced only on site or on Discord. Walk the booths once to check.

| Contest | Prize | Parallel to HubMI? |
|---|---|---|
| REENTRY CTF (Unshade + Hex-Rays) | **5,000 PLN gross, 1st place only**, plus 5 annual IDA Pro Expert-4 subscriptions (in the CMS; not in the regulamin) | Yes, it is a separate competition |
| Prelint Challenge | **USD 5,000 in Prelint credits** (not cash) | Yes, we use Prelint while building the HubMI project |
| Open/Partner tasks (Defence, Sport, Smart City, AI, ImpactHer, Goldman "AI Control Layer", Superteam, Huawei, Pekao, Kraków) | 5–25k PLN | No, these are main tracks. We are committed to HubMI. |

## 1. REENTRY CTF

- **Organiser:** UNSHADE sp. z o.o. (Poznań). Contact is on Discord (the link is published on the platform) or by email at biuro@unshade.pl. The 5,000 PLN prize is paid by Proidea within 90 days.
- **Timing:** **3 Oct 12:00 → 4 Oct 12:00** (§4.1). It is **already running**. Registration stays open until the end (§3.4), so a late start is allowed but we lose time.
- **How to enter:** (1) fill in the Google Form: https://docs.google.com/forms/d/e/1FAIpQLSeDuVWV3Y86p4PWVhABLii5q1UueD9y0YYlDFfdVTTYlHAExA/viewform (§2.2). (2) Register on the contest platform and create a team (§3.3). The platform URL is not in the CMS. It probably comes after the form or is announced on the HackYeah Discord or at the CTF stand.
- **Format:** jeopardy-style flags `flag{...}`, one stage. Categories are web, crypto, reverse engineering, pwn and forensics, plus "real hardware, AI challenges and an on-site team game". Teams are ranked by points; a tie goes to the team whose last correct flag came earlier. **Winner takes all.**
- **Team rules:** teams of 1–4 people with a captain (§2.3). Every player must be an adult, a registered HackYeah participant and **physically present** (§2.1, §2.5). Nothing forbids hackathon team members from also playing. The CMS says "Join solo or with a team." **Recommendation:** register one person (e.g. the least pitch-critical member) as a solo team, or two people at most. A smaller team does not change the prize, which is fixed (§5.3).
- **AI/LLM:** there is **no explicit ban**. The relevant clause, §4.7, reads: *"Organizator … surowo potępia przypadki niesamodzielnej pracy, w szczególności dzielenie się rozwiązaniami z innymi Zespołami, wprowadzanie rozwiązań uzyskanych od osób trzecich lub korzystanie z nieautoryzowanej pomocy."* ("The Organiser strongly condemns non-independent work, in particular sharing solutions with other Teams, submitting solutions obtained from third parties, or using unauthorised help.") Under §4.8 the organiser may demand a write-up of how a task was solved. Under §4.9 they may withhold the prize without giving a reason. "Unauthorised help" is vague, and the CTF itself has "AI challenges" in its theme. **We should ask on the CTF Discord or at the stand whether AI tools are allowed, before relying on them, and keep that answer as evidence.** Whoever plays must be able to explain every solve.
- **Scope:** attack only the challenge targets the platform provides. Never attack the platform, the HackYeah infrastructure or other players.
- **Chance:** low to moderate. With winner-takes-all, we compete with dedicated Polish CTF players who play for the full 24 h. The beginner-friendly design means many easy flags. The top spots will be decided on hard pwn/rev and on hardware and on-site tasks.
- **Human attention:** 1 person for registration, the Discord question, moving downloaded files and submitting flags, at roughly 10 min per hour. The hardware and on-site team game tasks need real presence. Explaining solves (§4.8) needs someone who understands them.
- **Can Claude grind it autonomously?** Partly, and well. Claude Code in a sandbox handles crypto, web (against the provided target only), rev and forensics, and AI or prompt-injection tasks. Run it as a background loop with one challenge directory each. pwn has a moderate success rate. Hardware and on-site tasks are out of reach. **Expected value:** about 5,000 PLN × maybe 5–10% ≈ 250–500 PLN. It is worth it only if the AI question gets a clear "OK" and someone has about 2 h of total attention to spare.

## 2. Prelint Challenge

- **Prize:** USD 5,000 in Prelint platform credits. There is **no cash**; the value depends on whether we would use Prelint afterwards.
- **What it asks:** "Build your HackYeah project using Prelint and show how it helped your team move quickly without losing control over the direction of your solution. The best project using Prelint will receive USD 5,000 in Prelint credits." Prelint records product and architecture decisions, reviews PRs for drift from them and gives AI agents the decision history. That fits our Claude-heavy workflow.
- **Registration/rules:** no rules PDF and no form in the CMS. The submission method is unknown. **Ask at the Prelint stand or ask Wojtek Szkutnik (founder, a speaker), today.** It is probably judged from our HubMI submission plus a mention or demo of Prelint use.
- **Team/AI:** it is the same project and the same team. AI is the point of the product, so it is clearly allowed.
- **Chance:** **moderate to good**, because few teams will bother. Judging is subjective.
- **Human attention:** about 30–45 min. Connect the repo and GitHub app, log the key decisions, then add one slide and one README section with screenshots of Prelint catching drift.
- **Can Claude do it autonomously?** Mostly. Claude can write the decision records and work PR by PR so that Prelint reviews happen naturally. A human has to set up the account and OAuth. **This is the best ratio of effort to prize, but the prize is credits, not money.**

## Not side contests
- **ImpactHer** (SheHacks successor) and the other open and partner tasks are main-track competitions judged by a jury. I did not check whether the general rules allow one team to enter two tracks. Either way, a second track would split our focus from HubMI.
- The 2025-era article "Join the HackYeah 2084 CTF" (hackyeah.pl) describes the previous edition (with Hacknite and Unshade, 5,000 PLN). It is the same format.

## Actions (now)
1. Pick a CTF player. Fill in the Google Form and get the platform link. Ask on Discord: "Is using AI assistants (LLMs) allowed in REENTRY CTF?"
2. Visit the Prelint stand: ask how to submit, and connect our repo today.
3. Walk the booths once to find any unlisted swag or booth contests (§4.13).
