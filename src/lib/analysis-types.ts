import type { SourceCategory } from "./trusted-sources";

export type Verdict = "credible" | "suspicious" | "likely_fake";

export interface RiskFactor {
  label: string;
  severity: "low" | "medium" | "high";
  excerpt?: string;
}

export interface HighlightedPhrase {
  phrase: string;
  reason: string;
}

export interface SuggestedSource {
  name: string;
  url: string;
  category: SourceCategory;
  search_query: string;
}

export type VerificationLinkType = "supporting" | "debunking" | "context";

export interface VerificationLink {
  site_name: string;
  label: string;
  url: string;
  type: VerificationLinkType;
}

// ---------------------------------------------------------------------------
// NewsGuard Rating Process — 9 Journalistic Criteria (source/website trust).
// https://www.newsguardtech.com/ratings/rating-process-criteria/
// Legacy groups kept so older saved chats still render.

export type IndicatorGroup = "credibility" | "transparency" | "content" | "context" | "publisher";
export type IndicatorScore = "pass" | "fail" | "mixed" | "not_applicable";

export interface CredibilityIndicator {
  id: string;
  group: IndicatorGroup;
  name: string;
  score: IndicatorScore;
  justification: string;
}

export const INSTRUMENT_NAME = "NewsGuard Rating Process — 9 Journalistic Criteria";

export const CRITERIA_WEIGHTS: Record<string, number> = {
  N1: 22, N2: 18, N3: 12.5, N4: 12.5, N5: 10, N6: 7.5, N7: 7.5, N8: 5, N9: 5,
};

/** Source trust score (0-100) over applicable criteria; null if not computable. */
export function sourceTrustScore(ind: CredibilityIndicator[]): number | null {
  let got = 0, max = 0;
  for (const i of ind) {
    const w = CRITERIA_WEIGHTS[i.id];
    if (!w || i.score === "not_applicable") continue;
    max += w;
    if (i.score === "pass") got += w;
    else if (i.score === "mixed") got += w / 2;
  }
  return max > 0 ? Math.round((got / max) * 100) : null;
}

// ---------------------------------------------------------------------------

export interface AnalysisResult {
  id?: string;
  verdict: Verdict;
  confidence: number;
  summary: string;
  reasoning?: string;
  risk_factors: RiskFactor[];
  highlighted_phrases: HighlightedPhrase[];
  suggested_sources: SuggestedSource[];
  verification_links?: VerificationLink[];
  credibility_indicators?: CredibilityIndicator[];
  input_text: string;
  input_url?: string | null;
  created_at?: string;
}

export const VERDICT_META: Record<Verdict, { label: string; tone: "success" | "warning" | "danger"; description: string }> = {
  credible: {
    label: "Likely Credible",
    tone: "success",
    description: "No major deceptive patterns detected. Still verify with primary sources.",
  },
  suspicious: {
    label: "Suspicious",
    tone: "warning",
    description: "Mixed or unclear signals. Cross-check before sharing.",
  },
  likely_fake: {
    label: "Likely Fake",
    tone: "danger",
    description: "Multiple deceptive patterns detected. Do not share without verification.",
  },
};
