import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PH_TRUSTED_SOURCES } from "@/lib/trusted-sources";
import type { AnalysisResult } from "@/lib/analysis-types";

const INPUT_SCHEMA = z.object({
  text: z.string().min(20).max(20000),
  url: z.string().url().max(2000).optional().nullable(),
  save: z.boolean().optional(),
  userId: z.string().uuid().nullable().optional(),
});

const SOURCE_DIRECTORY = PH_TRUSTED_SOURCES.map(
  (s) => `- ${s.name} (${s.category}): ${s.url} — ${s.description}`,
).join("\n");

const SYSTEM_PROMPT = `You are CrediScan, an NLP-based fake news detector tuned for Philippine context.
You analyze news articles, social media posts, and viral chain messages (Tagalog, English, Taglish, Bisaya).

You know common Philippine disinformation patterns:
- Election narratives and political smear campaigns
- Health hoaxes ("miracle cure", anti-vax, herbal scams)
- Viral Facebook chain posts ("Share to 10 groups!")
- Fake quotes attributed to politicians or celebrities
- Doctored screenshots of mainstream PH outlets (Rappler, ABS-CBN, GMA, Inquirer)
- "Breaking" claims about OFWs, lotto winners, government dole-outs
- Religious/end-times conspiracy content
- Anti-media "biased mainstream" framing

Linguistic red flags to weigh: ALL CAPS, excessive exclamation, urgency ("MUST READ", "before they delete this"),
unnamed "sources", missing dates/locations, emotional manipulation, conspiracy framing, "they don't want you to know".

Be CONSERVATIVE: when in doubt label "suspicious", not "likely_fake". Reputable PH outlets writing about controversial
topics are still credible — judge style and verifiability, not topic.

Trusted PH sources you may recommend:
${SOURCE_DIRECTORY}

Always respond with ONLY a valid JSON object matching the schema. No prose, no markdown fences.`;

const SCHEMA_PROMPT = `Schema:
{
  "verdict": "credible" | "suspicious" | "likely_fake",
  "confidence": number 0-100 (your confidence in the verdict),
  "summary": string (2-3 sentence plain-English summary of what the content claims and your assessment),
  "reasoning": string (1 short paragraph explaining how you reached the verdict),
  "risk_factors": [ { "label": string, "severity": "low"|"medium"|"high", "excerpt": string (optional short quote from the input) } ],
  "highlighted_phrases": [ { "phrase": string (exact substring from the input, max 12 words), "reason": string } ],
  "suggested_sources": [ { "name": string (must match one from the trusted list), "url": string (the URL of that source), "category": "fact-checker"|"mainstream"|"government"|"international", "search_query": string (a focused query a user can paste into that source's search) } ]
}

Pick 3-6 suggested_sources most relevant to the topic. Always include at least 1 fact-checker.`;

export const analyzeContent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => INPUT_SCHEMA.parse(input))
  .handler(async ({ data }): Promise<AnalysisResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const userMessage = `${SCHEMA_PROMPT}\n\nContent to analyze${data.url ? ` (from ${data.url})` : ""}:\n"""\n${data.text}\n"""`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Rate limited. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error(`AI gateway error [${res.status}]: ${body.slice(0, 300)}`);
    }

    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty AI response");

    let parsed: AnalysisResult;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("AI returned malformed JSON");
    }

    // Normalize & sanity-check
    const allowedVerdicts = ["credible", "suspicious", "likely_fake"] as const;
    if (!allowedVerdicts.includes(parsed.verdict)) parsed.verdict = "suspicious";
    parsed.confidence = Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0)));
    parsed.risk_factors = Array.isArray(parsed.risk_factors) ? parsed.risk_factors.slice(0, 12) : [];
    parsed.highlighted_phrases = Array.isArray(parsed.highlighted_phrases)
      ? parsed.highlighted_phrases.slice(0, 12)
      : [];
    parsed.suggested_sources = Array.isArray(parsed.suggested_sources)
      ? parsed.suggested_sources.slice(0, 8)
      : [];
    parsed.input_text = data.text;
    parsed.input_url = data.url ?? null;

    if (data.save) {
      const { data: row, error } = await supabaseAdmin
        .from("analyses")
        .insert({
          user_id: data.userId ?? null,
          input_text: data.text,
          input_url: data.url ?? null,
          verdict: parsed.verdict,
          confidence: parsed.confidence,
          summary: parsed.summary,
          reasoning: parsed.reasoning ?? null,
          risk_factors: JSON.parse(JSON.stringify(parsed.risk_factors)),
          highlighted_phrases: JSON.parse(JSON.stringify(parsed.highlighted_phrases)),
          suggested_sources: JSON.parse(JSON.stringify(parsed.suggested_sources)),
        })
        .select("id, created_at")
        .single();
      if (!error && row) {
        parsed.id = row.id;
        parsed.created_at = row.created_at;
      }
    }

    return parsed;
  });
