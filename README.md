# CrediScan — Conversational PH Fake News Detector

CrediScan is an investigative-research AI assistant that helps users verify
news claims circulating in the Philippines. Ask a question in plain English
or Tagalog ("Totoo bang…", "Did Marcos really…"), and the assistant finds
the most likely matching article, runs it through an NLP/LLM credibility
pipeline, and returns a full report.

## Quick start

```bash
git clone <this-repo>
cd <repo>
bun install   # or: npm install
cp .env.example .env
# edit .env and set VITE_OPENAI_API_KEY=sk-...
bun run dev   # or: npm run dev
```

Open <http://localhost:8080>.

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_OPENAI_API_KEY` | OpenAI API key used by the in-browser assistant. **Required.** |
| `VITE_OPENAI_MODEL` | Optional. Defaults to `gpt-4o-mini`. |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Lovable Cloud — used for auth and chat history. Auto-provisioned on Lovable. |

If `VITE_OPENAI_API_KEY` is missing, the app does **not** crash — it shows a
friendly setup screen with instructions.

> ⚠️ The OpenAI key is bundled into the browser. Use a personal/dev key for
> local use only. For production, put the call behind a server function.

## Production

```bash
bun run build
bun run start
```

## Features

- Conversational chat UI ("What news would you like me to investigate?")
- Automatic article matching (no need to paste URLs)
- Full credibility report: verdict, confidence, risk factors, NLP features,
  trusted-source verification links
- Per-user chat history persisted in Lovable Cloud
