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

export interface AnalysisResult {
  id?: string;
  verdict: Verdict;
  confidence: number;
  summary: string;
  reasoning?: string;
  risk_factors: RiskFactor[];
  highlighted_phrases: HighlightedPhrase[];
  suggested_sources: SuggestedSource[];
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
