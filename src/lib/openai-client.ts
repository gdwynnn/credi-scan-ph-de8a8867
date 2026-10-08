import type { AnalysisResult, Verdict, VerificationLink } from "./analysis-types";
import { runAssistantServer } from "./assistant.functions";
import { jsonrepair } from "jsonrepair";

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

function stripCitations(v: unknown): unknown {
  if (typeof v === "string") {
    return v
      .replace(/\s*\(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\)/g, "")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1")
      .replace(/\?utm_source=openai/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  if (Array.isArray(v)) return v.map(stripCitations);
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      // keep real URL fields intact
      o[k] = k === "url" && typeof val === "string" ? val.replace(/\?utm_source=openai$/, "") : stripCitations(val);
    }
    return o;
  }
  return v;
}

function parseLoose(raw: string): AssistantTurn | null {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  try { return JSON.parse(s); } catch { /* try repair */ }
  try { return JSON.parse(jsonrepair(s)); } catch { /* try quote fix */ }
  const fixed = escapeInnerQuotes(s);
  try { return JSON.parse(fixed); } catch { /* */ }
  try { return JSON.parse(jsonrepair(fixed)); } catch { /* */ }
  // Last resort: salvage the chat message so the user still gets an answer.
  const msg = s.match(/"assistant_message"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:article|analysis|needs_clarification)"/)?.[1];
  if (msg) return { assistant_message: msg.replace(/\\n/g, "\n").replace(/\\"/g, '"'), article: null, analysis: null };
  return null;
}

// Escape stray double quotes that appear inside string values
// (e.g. quoted statements from officials).
function escapeInnerQuotes(s: string): string {
  let out = "";
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && inStr) { out += ch + (s[i + 1] ?? ""); i++; continue; }
    if (ch === '"') {
      if (!inStr) { inStr = true; out += ch; continue; }
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j])) j++;
      const next = s[j];
      if (next === undefined || next === "," || next === "}" || next === "]" || next === ":") {
        inStr = false; out += ch;
      } else out += '\\"';
      continue;
    }
    if (inStr && (ch === "\n" || ch === "\r")) { out += " "; continue; }
    out += ch;
  }
  return out;
}

export async function runAssistant(history: ChatTurn[], userQuery: string): Promise<AssistantTurn> {
  const { raw, cited } = await runAssistantServer({ data: { history, query: userQuery } });

  const loose = parseLoose(raw);
  if (!loose) {
    return {
      assistant_message: "The analysis came back in an unreadable format. Please send your message again.",
      article: null,
      analysis: null,
    };
  }
  const parsed = stripCitations(loose) as AssistantTurn;

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
