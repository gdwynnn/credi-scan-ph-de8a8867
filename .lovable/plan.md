## CrediScan — Fake News Detection for the Philippines

An NLP-powered web app inspired by your paper. Users paste a news article, social media post, or URL; the system analyzes it with AI tuned for Philippine context and returns a verdict, confidence score, the linguistic risk factors that triggered it, and links to legitimate PH outlets / fact-checkers where the claim can be verified.

### Pages / Routes

1. **`/` — Dashboard / Analyzer** (core)
   - Tabbed input: *Paste text* | *Paste URL*
   - Big textarea or URL field, "Analyze" button
   - Live result panel below: verdict badge (Credible / Suspicious / Likely Fake), confidence gauge (0–100%), summary
   - **Explainability**: highlighted excerpts showing which phrases triggered the score (sensational language, missing citations, emotional manipulation, etc.)
   - **Risk Factors** card: bulleted list of issues found
   - **Legit Check** card: list of recommended Philippine sources to verify against (auto-categorized: Fact-checkers → Mainstream → Government → International), each as an outbound link with a "search this claim" query
   - Save-to-history toggle

2. **`/history` — Past Checks**
   - Table of previous analyses (text snippet, verdict, confidence, date)
   - Click row → re-opens full result
   - Stats strip: total analyses, % flagged, most common risk factor

3. **`/about` — About CrediScan**
   - Project context (based on the paper's CrediScan framework), methodology in plain language, list of trusted PH sources, disclaimer that this is a decision-support tool

### How detection works (technical)

- **Lovable Cloud** enabled for: auth (optional anonymous + email), `analyses` table for history, server function for AI calls
- **TanStack server function** `analyzeContent.functions.ts` → calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with AI SDK `Output.object` for structured JSON
- **Server function** `fetchUrl.functions.ts` → fetches a URL server-side and extracts main text (simple readability heuristic, no external scraper dependency)
- The prompt is tuned for **Philippine context**: knows local outlets, common PH disinformation patterns (election narratives, health hoaxes, "viral" Facebook chain posts, Tagalog/Taglish red flags), and instructs the model to be conservative
- Structured output schema:
  ```
  verdict: "credible" | "suspicious" | "likely_fake"
  confidence: 0-100
  summary: string
  risk_factors: [{ label, severity, excerpt }]
  highlighted_phrases: [{ phrase, reason }]
  suggested_sources: [{ name, url, category, search_query }]
  reasoning: string
  ```
- Suggested sources are seeded from a curated PH list (Rappler, Inquirer, ABS-CBN, GMA, PhilStar, Manila Bulletin, VERA Files, Tsek.ph, Rappler Fact Check, PCIJ, PNA, AFP Fact Check, Reuters, Snopes) — the AI picks the most relevant ones for the topic and generates pre-filled search queries

### Database (Lovable Cloud)

- `analyses` table: id, user_id (nullable), input_text, input_url, verdict, confidence, risk_factors (jsonb), highlighted_phrases (jsonb), suggested_sources (jsonb), summary, created_at
- RLS: user sees only their own; anonymous sessions stored under a local session id

### Design — Trustworthy Newsroom

- Palette: deep navy `#0f1b3d`, ink `#1e3a5f`, blue accent `#3b6fa0`, paper `#e8edf3`
- Typography: serif headings (Instrument Serif or Libre Baskerville) + clean sans body (Inter) — editorial feel
- Verdict badges: green / amber / red against navy, no neon
- Confidence gauge: thin radial arc, restrained motion
- Layout: centered single column with generous whitespace; result panels as bordered "newspaper clipping" cards

### Out of scope for v1

- Actual BERT model training (uses AI gateway instead — addressed in the About page)
- Multi-user admin dashboard, SUS survey module, model-evaluation graphs from the paper's pipeline
- Image/video deepfake detection

When you approve, I'll build it in this order: scaffold routes & design tokens → Cloud + DB → server functions (analyze, fetchUrl) → analyzer page → result components (verdict, gauge, risk factors, sources, highlighting) → history → about.