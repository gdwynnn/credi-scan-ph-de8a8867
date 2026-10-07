import type { AnalysisResult, Verdict, VerificationLink } from "./analysis-types";
import { runAssistantServer } from "./assistant.functions";

// The OpenAI key lives on the server; the browser never sees it.
export const hasOpenAIKey = () => true;
export const hasGroqKey = hasOpenAIKey;
export const hasGeminiKey = hasOpenAIKey;

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

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function runAssistant(history: ChatTurn[], userQuery: string): Promise<AssistantTurn> {
  const { raw, cited } = await runAssistantServer({ data: { history, query: userQuery } });

  let parsed: AssistantTurn;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { assistant_message: raw.slice(0, 1500), article: null, analysis: null };
    parsed = JSON.parse(match[0]);
  }

  if (parsed.analysis) {
    const a = parsed.analysis;
    const allowed: Verdict[] = ["credible", "suspicious", "likely_fake"];
    if (!allowed.includes(a.verdict)) a.verdict = "suspicious";
    a.confidence = Math.max(0, Math.min(100, Math.round(Number(a.confidence) || 0)));
    a.risk_factors = Array.isArray(a.risk_factors) ? a.risk_factors.slice(0, 12) : [];
    a.highlighted_phrases = Array.isArray(a.highlighted_phrases) ? a.highlighted_phrases.slice(0, 12) : [];
    a.suggested_sources = Array.isArray(a.suggested_sources) ? a.suggested_sources.slice(0, 8) : [];
    let links: VerificationLink[] = Array.isArray(a.verification_links)
      ? a.verification_links.filter((l) => l && typeof l.url === "string" && /^https?:\/\//i.test(l.url))
      : [];
    // Add any real web-search citations the model did not list.
    const seen = new Set(links.map((l) => l.url.split("?")[0]));
    for (const c of cited) {
      const key = c.url.split("?")[0];
      if (seen.has(key)) continue;
      seen.add(key);
      let host = c.url;
      try { host = new URL(c.url).hostname.replace(/^www\./, ""); } catch { /* keep */ }
      links.push({ site_name: host, label: c.title || host, url: c.url, type: "context" });
    }
    a.verification_links = links.slice(0, 10);
    a.credibility_indicators = Array.isArray(a.credibility_indicators)
      ? a.credibility_indicators.filter((c) => c && typeof c.id === "string" && typeof c.name === "string").slice(0, 12)
      : [];
    a.input_text = parsed.article ? `${parsed.article.headline}\n\n${parsed.article.body}` : userQuery;
    a.input_url = userQuery.match(/https?:\/\/[^\s<>"')]+/i)?.[0] ?? null;
  }

  return parsed;
}
