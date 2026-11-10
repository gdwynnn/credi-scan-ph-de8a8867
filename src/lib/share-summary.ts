import type { AnalysisResult } from "./analysis-types";
import { VERDICT_META, contentCredibilityScore, sourceTrustScore } from "./analysis-types";

export type SourceTier = "gov" | "factcheck" | "media" | "academic" | "other";

export const TIER_META: Record<SourceTier, { label: string; color: string }> = {
  gov: { label: "Gov / Official", color: "var(--color-primary)" },
  factcheck: { label: "Fact-Checker", color: "var(--color-warning)" },
  media: { label: "Mainstream Media", color: "var(--color-success)" },
  academic: { label: "Academic / Educational", color: "var(--color-accent)" },
  other: { label: "Other Public Source", color: "var(--color-muted-foreground)" },
};

const FACT = ["verafiles", "tsek.ph", "factsfirst", "factcheck", "snopes", "politifact", "fullfact", "afp.com"];
const MEDIA = ["inquirer", "philstar", "gmanetwork", "abs-cbn", "rappler", "mb.com.ph", "manilatimes", "pna.gov.ph", "cnnphilippines", "bworldonline", "sunstar", "businessmirror", "news5", "tv5", "onenews", "pep.ph", "reuters", "apnews", "bbc.", "cnn.com", "nytimes", "theguardian", "aljazeera"];

export function sourceTier(url: string): SourceTier {
  let host = "";
  try { host = new URL(url).hostname.toLowerCase(); } catch { return "other"; }
  const path = url.toLowerCase();
  if (FACT.some((f) => host.includes(f)) || /fact-?check/.test(path)) return "factcheck";
  if (host === "pna.gov.ph" || host.endsWith(".pna.gov.ph")) return "media";
  if (/\.gov(\.[a-z]{2})?$/.test(host) || host.endsWith(".mil.ph") || host.includes("officialgazette")) return "gov";
  if (/\.edu(\.[a-z]{2})?$/.test(host) || host.endsWith(".ac.uk") || host.includes("up.edu")) return "academic";
  if (MEDIA.some((m) => host.includes(m))) return "media";
  return "other";
}

export function buildSummaryText(r: AnalysisResult): string {
  const meta = VERDICT_META[r.verdict];
  const ind = r.credibility_indicators ?? [];
  const c = contentCredibilityScore(ind);
  const s = sourceTrustScore(ind);
  const lines = [
    `SURI Verification Result: ${meta.label.toUpperCase()} (${r.confidence}% confidence)`,
    c !== null || s !== null ? `Content credibility: ${c ?? "n/a"}/100 | Source trust: ${s ?? "n/a"}/100` : "",
    "",
  ];
  if (r.claim_statement) lines.push(`Claim: ${r.claim_statement}`);
  if (r.reality_statement) lines.push(`Reality: ${r.reality_statement}`);
  if (r.summary) lines.push("", r.summary);
  const links = (r.verification_links ?? []).slice(0, 5);
  if (links.length) {
    lines.push("", "Sources:");
    links.forEach((l) => lines.push(`- ${l.site_name}: ${l.url}`));
  }
  lines.push("", "Checked with SURI - System for Unbiased Research and Information verification");
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    if (out.length >= maxLines) break;
  }
  if (line && out.length < maxLines) out.push(line);
  if (out.length === maxLines && words.join(" ").length > out.join(" ").length) out[maxLines - 1] = out[maxLines - 1].replace(/\s*\S*$/, "…");
  return out;
}

export function downloadSummaryImage(r: AnalysisResult) {
  const W = 1080, H = 1080;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  const tone = VERDICT_META[r.verdict].tone;
  const accent = tone === "success" ? "#16a34a" : tone === "warning" ? "#d97706" : "#dc2626";
  ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = accent; ctx.fillRect(0, 0, W, 16);
  const F = "system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = "#94a3b8"; ctx.font = `600 28px ${F}`;
  ctx.fillText("SURI · VERIFICATION RESULT", 72, 100);
  ctx.fillStyle = accent; ctx.font = `800 84px ${F}`;
  ctx.fillText(VERDICT_META[r.verdict].label, 72, 200);
  ctx.fillStyle = "#e2e8f0"; ctx.font = `500 32px ${F}`;
  const ind = r.credibility_indicators ?? [];
  const c = contentCredibilityScore(ind), s = sourceTrustScore(ind);
  ctx.fillText(`Confidence ${r.confidence}%${c !== null ? `  ·  Content ${c}/100` : ""}${s !== null ? `  ·  Source ${s}/100` : ""}`, 72, 260);
  let y = 340;
  const block = (title: string, text: string, color: string, lines: number) => {
    ctx.fillStyle = color; ctx.font = `700 26px ${F}`; ctx.fillText(title, 72, y); y += 44;
    ctx.fillStyle = "#f1f5f9"; ctx.font = `400 32px ${F}`;
    for (const ln of wrap(ctx, text, W - 144, lines)) { ctx.fillText(ln, 72, y); y += 44; }
    y += 30;
  };
  if (r.claim_statement) block("THE CLAIM", r.claim_statement, "#f87171", 4);
  if (r.reality_statement) block("THE REALITY", r.reality_statement, "#34d399", 5);
  if (!r.claim_statement && r.summary) block("SUMMARY", r.summary, "#94a3b8", 9);
  ctx.fillStyle = "#64748b"; ctx.font = `400 24px ${F}`;
  ctx.fillText("Always verify before you share.  ·  System for Unbiased Research and Information verification", 72, H - 60);
  const a = document.createElement("a");
  a.download = `SURI-result-${Date.now()}.png`;
  a.href = cv.toDataURL("image/png");
  a.click();
}
