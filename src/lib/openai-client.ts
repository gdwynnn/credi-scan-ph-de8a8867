import type { AnalysisResult, Verdict } from "./analysis-types";

// NOTE: Filename kept for backward compatibility — this module now talks to
// Groq's OpenAI-compatible API (free tier, ~30 RPM / 14.4k RPD).
export const GROQ_API_KEY = (import.meta.env.VITE_GROQ_API_KEY as string | undefined) ?? "";
export const GROQ_MODEL = (import.meta.env.VITE_GROQ_MODEL as string | undefined) || "llama-3.3-70b-versatile";

// Legacy aliases (other files may still import these names)
export const OPENAI_API_KEY = GROQ_API_KEY;
export const OPENAI_MODEL = GROQ_MODEL;
export const GEMINI_API_KEY = GROQ_API_KEY;
export const GEMINI_MODEL = GROQ_MODEL;

export const hasGroqKey = () => GROQ_API_KEY.trim().length > 0;
export const hasOpenAIKey = hasGroqKey;
export const hasGeminiKey = hasGroqKey;

export interface AssistantArticle {
  headline: string;
  source: string;
  published?: string;
  body: string;
}

export interface AssistantTurn {
  assistant_message: string;
  article: AssistantArticle | null;
  analysis: AnalysisResult | null;
  needs_clarification?: boolean;
}

const SYSTEM_PROMPT = `You are CrediScan, an investigative research assistant for verifying news circulating in the Philippines (Tagalog, English, Taglish, Bisaya).

The user will speak to you naturally. They will NOT paste a URL or article. They'll say things like "Totoo ba na…?", "Did Marcos approve…?", "I heard…".

Your job, every turn:
1. Decide whether the user is asking you to verify a specific factual claim about Philippine news.
2. If YES: imagine the most likely real news article they're referring to. Write a plausible reconstruction (headline, source, date, 4-8 sentences of body) based on what such an article would say if it existed. Use your knowledge of Philippine outlets (Rappler, Inquirer, GMA, ABS-CBN, Philstar, Manila Bulletin, PNA, government agencies) and recent events. Then analyze the CLAIM for credibility — not the reconstruction.
3. If the request is too vague to map to a specific claim (e.g. "what's the news today?"), set needs_clarification=true, ask a short clarifying question in assistant_message, and leave article/analysis null.
4. If the user is making small talk / greetings, just reply briefly in assistant_message with article=null, analysis=null.

Detection: be conservative. Use "suspicious" when in doubt, not "likely_fake". Reputable PH outlets writing about real controversial topics are still credible.

verification_links MUST be real working URLs using Google site-restricted search format:
  https://www.google.com/search?q=site%3A<domain>+<url-encoded-keywords>
Examples: site:rappler.com, site:verafiles.org, site:tsek.ph, site:doh.gov.ph, site:factcheck.afp.com
- credible verdict → 4-6 supporting links to mainstream PH outlets + relevant government agency
- suspicious / likely_fake → 4-6 debunking links to fact-checkers, plus 1-2 context links to mainstream outlets

Always respond with ONLY a single JSON object matching the schema. No prose, no markdown fences.`;

const SCHEMA = `Schema:
{
  "assistant_message": string (1-3 sentences, conversational reply),
  "needs_clarification": boolean (true ONLY when you need to ask a clarifying question),
  "article": null | {
    "headline": string,
    "source": string (PH outlet name),
    "published": string (e.g. "2026-06-15" or "June 2026"),
    "body": string (4-8 sentences, the reconstructed article text)
  },
  "analysis": null | {
    "verdict": "credible" | "suspicious" | "likely_fake",
    "confidence": number 0-100,
    "summary": string (2-3 sentences),
    "reasoning": string (1 short paragraph),
    "risk_factors": [{ "label": string, "severity": "low"|"medium"|"high", "excerpt": string }],
    "highlighted_phrases": [{ "phrase": string, "reason": string }],
    "suggested_sources": [{ "name": string, "url": string, "category": "fact-checker"|"mainstream"|"government"|"international", "search_query": string }],
    "verification_links": [{ "site_name": string, "label": string, "url": string, "type": "supporting"|"debunking"|"context" }]
  }
}

If article and analysis are non-null, both must be filled. If you cannot map the request to a verifiable claim, set both to null and explain in assistant_message.`;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// --- Light pacing + retry to stay friendly with Groq free tier --------------
const MIN_INTERVAL_MS = 1200; // ~50 req/min ceiling, well under 30 RPM after jitter
let chain: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = Math.max(0, lastCallAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      return await task();
    } finally {
      lastCallAt = Date.now();
    }
  });
  chain = run.catch(() => {});
  return run as Promise<T>;
}

async function callGroqOnce(body: string): Promise<Response> {
  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body,
  });
}

export async function runAssistant(history: ChatTurn[], userQuery: string): Promise<AssistantTurn> {
  if (!hasGroqKey()) {
    throw new Error("Missing VITE_GROQ_API_KEY. Add it to your .env file and restart the dev server.");
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: `${SCHEMA}\n\nUser request:\n"""\n${userQuery}\n"""` },
  ];

  const body = JSON.stringify({
    model: GROQ_MODEL,
    messages,
    temperature: 0.4,
    response_format: { type: "json_object" },
  });

  const res = await enqueue(async () => {
    const MAX_ATTEMPTS = 4;
    let lastBody = "";
    let lastStatus = 0;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const r = await callGroqOnce(body);
      if (r.ok) return r;
      lastStatus = r.status;
      lastBody = await r.text();

      if (r.status === 401 || r.status === 403) {
        throw new Error("Groq rejected the API key. Check VITE_GROQ_API_KEY at console.groq.com/keys.");
      }
      if (r.status === 429 || r.status === 503) {
        if (attempt === MAX_ATTEMPTS) break;
        // Honor Retry-After header when present, otherwise exponential backoff
        const retryAfter = Number(r.headers.get("retry-after")) * 1000;
        const backoff = retryAfter > 0 ? retryAfter + 500 : 1500 * 2 ** (attempt - 1);
        await new Promise((res2) => setTimeout(res2, Math.min(backoff, 30_000)));
        continue;
      }
      break;
    }
    if (lastStatus === 429) {
      throw new Error("Groq rate limit hit. Free tier allows ~30 requests/min — wait a moment and try again.");
    }
    throw new Error(`Groq error [${lastStatus}]: ${lastBody.slice(0, 300)}`);
  });

  const json = await res.json();
  const raw: string | undefined = json?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty response from Groq.");

  let parsed: AssistantTurn;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Assistant returned malformed JSON.");
    parsed = JSON.parse(match[0]);
  }

  if (parsed.analysis) {
    const allowed: Verdict[] = ["credible", "suspicious", "likely_fake"];
    if (!allowed.includes(parsed.analysis.verdict)) parsed.analysis.verdict = "suspicious";
    parsed.analysis.confidence = Math.max(0, Math.min(100, Math.round(Number(parsed.analysis.confidence) || 0)));
    parsed.analysis.risk_factors = Array.isArray(parsed.analysis.risk_factors) ? parsed.analysis.risk_factors.slice(0, 12) : [];
    parsed.analysis.highlighted_phrases = Array.isArray(parsed.analysis.highlighted_phrases) ? parsed.analysis.highlighted_phrases.slice(0, 12) : [];
    parsed.analysis.suggested_sources = Array.isArray(parsed.analysis.suggested_sources) ? parsed.analysis.suggested_sources.slice(0, 8) : [];
    parsed.analysis.verification_links = Array.isArray(parsed.analysis.verification_links)
      ? parsed.analysis.verification_links.filter((l) => l && typeof l.url === "string" && /^https?:\/\//i.test(l.url)).slice(0, 8)
      : [];
    if (parsed.article) {
      parsed.analysis.input_text = `${parsed.article.headline}\n\n${parsed.article.body}`;
      parsed.analysis.input_url = null;
    } else {
      parsed.analysis.input_text = userQuery;
      parsed.analysis.input_url = null;
    }
  }

  return parsed;
}
