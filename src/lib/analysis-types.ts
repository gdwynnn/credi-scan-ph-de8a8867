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
// Credibility Coalition — Content Credibility Indicators (v1.1)
// Published rubric ("instrument") the AI must score every claim against.
// https://credibilitycoalition.org/credco-schema/

export type IndicatorGroup = "content" | "context" | "publisher";
export type IndicatorScore = "pass" | "fail" | "mixed" | "not_applicable";

export interface CredibilityIndicator {
  id: string;
  group: IndicatorGroup;
  name: string;
  score: IndicatorScore;
  justification: string;
}

export const INSTRUMENT_NAME =
  "Credibility Coalition — Content Credibility Indicators (v1.1)";

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
