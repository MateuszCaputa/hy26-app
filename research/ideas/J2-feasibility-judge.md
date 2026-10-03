# J2: Feasibility judge (senior engineer, "never get stuck")

**Data checks**
- **`innowacje.json`:** 115 records, about 247k characters of Polish, so roughly 80–100k tokens if sent in full.
  - Only 26 records have a video and 33 have a PDF.
  - Every `authors` field contains HTML junk.
  - **No location field.** Only 14 records mention a gmina at all, so the "gmina that already ran it" claims (01, 04) have little data behind them.
- **BDL CSV:** not fetched yet. It takes about 10 requests, so run the script NOW and commit the CSV.
- **GeoJSON:** none in the repo. BDL unit IDs (12 digits) ≠ PRG TERYT codes (7 digits), so the two have to be mapped.

## 1. Ranking by deliverability

1. **05 Pośrednik.** Smallest core: one structured call over the cached library, with no vector DB.
   - Traps: the agent tool loop (allow 3h+; fake it with a deterministic step trace).
   - Tier-1 API limit is ~30k input tokens/minute, and an 80–100k-token prompt is refused outright.
   - The cache expires after 5 minutes, so the first call after a pause is slow (5–10s) and costs about $0.25–0.30 on Sonnet, not $0.03.
2. **04 Sadzonka.** One generator plus DOCX, so it's linear.
   - Traps: "map zooms to Słomniki" needs gmina GeoJSON (get it from PRG or GitHub, simplify with mapshaper, map BDL→TERYT): **3–4h**.
   - Cited budgets/KPIs invite hallucinated numbers.
3. **06 Pomost.** Good journey, but many surfaces.
   - Traps: voice, vision, PII redaction, SMS, a board PDF report and RBAC are each 1–2h, and the "ROPS mentor tests it at 19:00" step depends on people we don't control.
4. **07 Lupa.** Pure Next.js, but:
   - **Click-to-source highlighting** in react-pdf (text-layer coordinates) is a classic 4h sink.
   - We'd have to build 10 synthetic lab PDFs ourselves.
   - Its odds depend on a multi-submission ruling we don't have.
5. **01 MOST.** Widest scope.
   - BM25 + local e5 + Haiku rerank is three retrieval systems.
   - Web push needs a service worker and VAPID keys, and iOS requires a PWA install.
   - Resend only sends to verified domains or addresses.
   - Lighthouse 100 "everywhere" is unrealistic.
   - 4-role RBAC.
   - Filming a 70+ relative on Saturday depends on someone outside the team.
6. **02 Puls.** The live jury room is the trap.
   - Vercel serverless can't keep SSE connections or in-memory state, so it needs a hosted DB plus polling.
   - Jurors' phones depend on venue wifi or LTE and on the room rules.
   - Gmina choropleth: 3–4h, as above.
   - It costs half a dev-day and earns 0 module points.
7. **03 Tripwire.** Two stacks (FastAPI + Next).
   - **Streaming proxy passthrough** and **intercepting MCP** (stdio/HTTP) are both non-trivial.
   - Llama Guard 1B on Ollama takes 300–800ms; Prompt-Guard-86M is fine.
   - The real blocker isn't the build: it's a live security Q&A for a team with zero security knowledge. That's a guaranteed point to get stuck on stage.

**Cross-cutting traps**
- **SQLite on Vercel can't write** (read-only filesystem). Every inbox, CRUD or thread write breaks. Use Turso/Neon, or run locally behind a cloudflared tunnel. Decide this in hour 1.
- **Claude Code subscriptions ≠ API credits.** Get an API key now and top up past tier 1.
- **Three worktrees each running `shadcn add` / `npm i`** cause lockfile conflicts. Install everything in hour 1 and freeze `package.json`.
- **Web Speech API:** Chrome only, sends audio to Google (needs network), Firefox has nothing. Text input must always work.

## 2. False or overstated capability claims

- **Image generation (01, 02, 04, 06):** **Claude cannot generate images.** That needs a second provider. An SVG drawn by Claude is the only honest fallback.
- **05 "streams a filled DOCX":** a DOCX can't be streamed. Stream the HTML, then build the DOCX at the end.
- **05 "$0.03–0.05 uncached for 90k tokens":** wrong by about 6×. The brief's "$0.02/call" only holds for small prompts or cache reads.
- **01 "87% top-3 hit rate" and 05 "27/30":** these come from a Claude-written eval set, so they're circular. Label them as such.
- **01/04 "the gmina that already ran it":** the data has no field for this.
- **02 "1s SSE on Vercel":** not with serverless in-memory state.
- **01 "Lighthouse 100" / 06 "axe 100":** axe reports violations, not a score. Claim "0 violations" on the hero pages only.

## 3. Realistic 21h budget (best candidate: 05 engine + 04 "Posadź" package)

**Capacity:** 3 devs × ~14.5h awake ≈ 43 dev-hours. Take off ~25% for merges, debugging and deploys, leaving **~32 productive hours**.

| Feature | Hours |
|---|---|
| Hour-1 setup: repo, CLAUDE.md with rubric, `contract.ts`, all deps, hosted DB, deploy, cleaned seed + BDL JSON | 3 |
| Matcher: trimmed library (title, summary, problem, target group; ~40k tokens) cached; Haiku/Sonnet structured top-3 with `dlaczego` + quote; ID validation | 3 |
| Zasobnik (library browse/filter/detail, videos where present) | 2 |
| Gmina profile from BDL (65+ share vs regional average) + searchable table | 1.5 |
| "Posadź" package generator (streamed sections, citations); reused as the Middleman for an institution | 4 |
| DOCX via the `docx` npm package (print-CSS fallback) | 1.5 |
| Fiszka / idea creator | 2 |
| Admin: inbox, verify/publish, CRUD | 2.5 |
| Komunikacja: thread per case + status code, polling | 2 |
| Tester ratings | 1 |
| WCAG: font scale, contrast, keyboard, easy-read (Haiku), axe in Playwright | 3 |
| Voice (Chrome pl-PL, text fallback) | 1 |
| Replay/mock mode (`?replay=1`) | 1 |
| Eval page (30 cases) | 1.5 |
| Buffer | 3 |
| **Total** | **≈33** |

**CUT**
- gmina GeoJSON choropleth (use powiat SVG only if we're ahead at 01:00)
- QR jury room
- web push, real email and SMS
- image generation
- live agent loop
- local embeddings / Ollama
- MCP server (1h, post-freeze slide only)
- photo/vision intake (COULD)
- 4-role auth (use a role switcher, no passwords)

## 4. Verdict

**Winner: 05 Pośrednik's engine, with 04's "Posadź" package as the wow.** Run it on one Next.js app with a hosted DB, and keep a replay mode for when wifi or the API fails.

**Guaranteed MUST: end-to-end on the deployed URL by 19:00 Saturday**
1. **Input:** type a problem (voice optional) and pick a gmina from the BDL table.
2. **Match:** top-3 real innovations, with `dlaczego` and a verbatim quote. IDs are validated against the seed.
3. **Gmina card:** real 65+ share and population.
4. **"Posadź":** a streamed package that is saved as a fiszka.
5. **Admin:** the fiszka appears in the inbox. The admin replies, and the author sees the reply through a status code.
6. **Supporting pieces:**
   - Zasobnik list
   - WCAG toggle (font and contrast)
   - `?replay=1` recordings of 3 demo queries
7. **API budget:** API key funded past tier 1, and caching verified.

Everything else (DOCX, tester, eval, easy-read, admin CRUD) goes into the 19:00–01:00 window, one module per worktree.
