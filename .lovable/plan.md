
## 1. The "instrument" concept (context for you)

In prompt engineering, a **structured evaluation instrument** is a named, published rubric the AI must follow when it judges something — exactly like WCAG for accessibility. It stops the model from inventing its own criteria and makes results defensible ("the AI flagged this because indicator #7 — *Sources cited* — failed").

For a fake-news system, the accepted equivalent is the **Credibility Coalition — Content Credibility Indicators** (developed with MIT, Meedan, Hacks/Hackers). 16 signals across three groups:

- **Content:** Title Representativeness, Clickbait Title, Quotes from Outside Experts, Citation of Organizations & Studies, Calibration of Confidence, Logical Fallacies, Tone, Inference.
- **Context:** Originality, Fact-Checked Elsewhere, Representative Citations, Reputation of Citations.
- **Publisher:** Number of Ads, Number of Social Calls, Author Expertise, Publisher's Reputation.

I'll cite it in the prompt by name (`Instrument: Credibility Coalition — Content Credibility Indicators v1.1`) so it's visible in your defense.

## 2. What changes

### A. Bake the instrument into the AI prompt
- Edit `src/lib/openai-client.ts` `SYSTEM_PROMPT`:
  - Add an **INSTRUMENT** section listing the 16 indicators grouped by Content / Context / Publisher, each with a one-line definition.
  - Require the AI to score every indicator as `pass | fail | mixed | not_applicable` with a one-sentence justification.
  - Verdict must be **derived** from the indicator scores (e.g. ≥4 fails on Content → `likely_fake`; 2–3 fails or mixed → `suspicious`; else `credible`).
- Extend `SCHEMA` and `AnalysisResult` (`src/lib/analysis-types.ts`) with a new `credibility_indicators` array: `{ id, group, name, score, justification }`.
- Update `AnalysisResultView.tsx` to render an "Instrument scorecard" section (grouped, color-coded chips) so the rubric is visible to the user.
- Keep every existing feature: search-first behavior, PH source priority, verification links, article reconstruction, clarification rules, no "where did you hear this" — all preserved, the instrument sits on top.

### B. Remove the account system
- Delete `src/routes/auth.tsx`, `src/components/UserMenu.tsx`, and the sign-in/out UI in `SiteChrome.tsx`.
- Remove Supabase auth calls from `ChatView`, `ConversationSidebar`, `c.$threadId.tsx`, and `conversations.ts`.
- Drop the `MissingKeyBanner` sign-in branches.
- Leave the Supabase tables alone (harmless; just unused). No DB migration needed.

### C. Local chat storage (threads, ChatGPT-style)
- New module `src/lib/local-chats.ts` — single source of truth over `localStorage`:
  - Key `crediscan.threads.v1` → `{ threads: ThreadMeta[], messages: Record<threadId, Message[]> }`.
  - API: `listThreads`, `createThread`, `renameThread`, `deleteThread`, `loadMessages`, `appendUserMessage`, `appendAssistantMessage`, `exportAll`, `importAll`, `clearAll`.
  - Auto-title a thread from the first user message (first ~40 chars).
- Rewrite `ConversationSidebar` to read from `local-chats` instead of Supabase — same visual design, plus:
  - **New chat** button (already present) creates a thread + navigates to `/c/:threadId`.
  - **Export** button → downloads `crediscan-chats-YYYY-MM-DD.json`.
  - **Import** button → file picker, merges (dedupe by thread id, newer `updated_at` wins), shows a toast summary.
  - **Clear all** button with confirm.
- Rewrite `ChatView` to persist through `local-chats` (drop-in swap; message shape unchanged).
- Update `c.$threadId.tsx` to drop `userId` and just pass `threadId`; if the thread id isn't in storage, create an empty one so refresh works.
- Update `routes/index.tsx` to redirect to the most recent thread on load, or create a fresh one.

### D. Fix the runtime `IndexSizeError`
Range/`setStart` crash comes from the phrase-highlighter in `AnalysisResultView` walking text nodes that have already been split. Guard the offset with `Math.min(offset, node.textContent?.length ?? 0)` before `setStart`/`setEnd`. Small, drive-by fix.

## 3. Files touched

```text
edit    src/lib/openai-client.ts         # instrument + scoring rules in prompt & schema
edit    src/lib/analysis-types.ts        # add CredibilityIndicator type
edit    src/components/AnalysisResultView.tsx  # scorecard UI + Range guard
new     src/lib/local-chats.ts           # localStorage thread store + export/import
edit    src/components/ConversationSidebar.tsx # local store, export/import/clear buttons
edit    src/components/ChatView.tsx      # persist via local-chats, drop auth
edit    src/routes/c.$threadId.tsx       # drop userId
edit    src/routes/index.tsx             # redirect to latest / create thread
edit    src/components/SiteChrome.tsx    # remove auth UI
edit    src/components/MissingKeyBanner.tsx    # drop sign-in variant
delete  src/routes/auth.tsx
delete  src/components/UserMenu.tsx
edit    src/lib/conversations.ts         # delete OR reduce to type re-exports (decide during build)
```

## 4. Out of scope
- No database migration (tables stay, unused).
- No server-side changes; everything runs client-side against Groq as today.
- No multi-device sync — export/import JSON covers manual transfer.
