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
  "confidence": number 0-100,
  "summary": string (2-3 sentence plain-English summary of the claim and assessment),
  "reasoning": string (1 short paragraph),
  "risk_factors": [ { "label": string, "severity": "low"|"medium"|"high", "excerpt": string (optional) } ],
  "highlighted_phrases": [ { "phrase": string (exact substring, max 12 words), "reason": string } ],
  "suggested_sources": [ { "name": string (must match a trusted source name), "url": string (that source's homepage URL), "category": "fact-checker"|"mainstream"|"government"|"international", "search_query": string } ],
  "verification_links": [ { "site_name": string (trusted source name), "label": string (short human-readable description of what the user will find, e.g. "Search Rappler for: MRT fare hike 2026"), "url": string (a WORKING url), "type": "supporting"|"debunking"|"context" } ]
}

CRITICAL rules for verification_links (this is the most important field):
- Generate 4-7 links the user can click to verify the claim themselves.
- Each "url" MUST be a real, working URL. Use Google site-restricted search URLs in this exact format:
  https://www.google.com/search?q=site%3A<domain>+<url-encoded-keywords>
  Example: https://www.google.com/search?q=site%3Arappler.com+MRT+fare+hike+2026
- Pick the most distinctive 3-6 keywords from the claim (names, places, numbers, dates). URL-encode spaces as "+".
- If verdict is "credible": link to MAINSTREAM PH outlets and GOVERNMENT sites where this news should appear if real (rappler.com, inquirer.net, news.abs-cbn.com, gmanetwork.com, philstar.com, mb.com.ph, pna.gov.ph, plus the relevant gov agency). type="supporting".
- If verdict is "likely_fake" or "suspicious": link primarily to FACT-CHECKERS (verafiles.org, tsek.ph, rappler.com/newsbreak/fact-check, factcheck.afp.com, snopes.com, reuters.com/fact-check) where this claim is likely already debunked or being tracked. type="debunking". Add 1-2 mainstream outlets as type="context".
- "label" must be human-readable like "Check VERA Files fact-check archive for: <keywords>" — never raw "site:" syntax.
- "site_name" should match a name from the trusted source list when possible.

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
