import type { AnalysisResult } from "./analysis-types";
import { VERDICT_META, contentCredibilityScore, sourceTrustScore, CONTENT_INSTRUMENT, SOURCE_INSTRUMENT } from "./analysis-types";
import { classifyTopic, TOPIC_META } from "./topics";

interface BriefArticle { headline?: string; source?: string; published?: string }

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const MARK: Record<string, string> = { pass: "✔ Pass", fail: "✘ Fail", mixed: "◐ Mixed", not_applicable: "— N/A" };

/** Opens a printer-friendly one-page summary of a result. Returns false if pop-ups are blocked. */
export function openDefenseBrief(a: AnalysisResult, article: BriefArticle | null): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  const ind = a.credibility_indicators ?? [];
  const cs = contentCredibilityScore(ind);
  const ss = sourceTrustScore(ind);
  const topic = TOPIC_META[classifyTopic(`${a.claim_statement ?? ""} ${a.input_text}`, a.topic_category)];
  const rows = (g: (id: string) => boolean) =>
    ind.filter((i) => g(i.id)).map((i) => `<tr><td>${esc(i.id)}</td><td>${esc(i.name.replace(/_/g, " "))}</td><td class="m">${MARK[i.score] ?? esc(i.score)}</td></tr>`).join("");
  const links = (a.verification_links ?? []).slice(0, 6)
    .map((l) => `<li><b>${esc(l.site_name)}</b> (${esc(l.type)}) — ${esc(l.label)}<br><span class="u">${esc(l.url)}</span></li>`).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>SURI Defense Brief</title><style>
  @page{size:A4;margin:14mm}body{font:11px/1.45 Georgia,serif;color:#111;margin:0 auto;max-width:780px;padding:16px}
  h1{font-size:18px;margin:0}h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #999;margin:12px 0 6px;padding-bottom:2px}
  .sub{color:#555;font-size:10px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}
  .box{border:1px solid #bbb;padding:6px;text-align:center}.box b{display:block;font-size:16px}
  table{width:100%;border-collapse:collapse;font-size:10px}td{border-bottom:1px solid #ddd;padding:2px 4px}.m{white-space:nowrap;text-align:right}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}ul{margin:0;padding-left:16px}.u{color:#555;word-break:break-all;font-size:9px}
  .noprint{margin-bottom:10px}@media print{.noprint{display:none}}</style></head><body>
  <div class="noprint"><button onclick="print()">Print / Save as PDF</button></div>
  <h1>SURI — Investigation Brief</h1>
  <div class="sub">System for Unbiased Research and Information verification · ${esc(new Date(a.created_at ?? Date.now()).toLocaleString())} · ${topic.label}</div>
  <h2>Claim</h2><div>${esc(a.claim_statement || article?.headline || a.input_text)}</div>
  ${article?.source ? `<div class="sub">Circulating on: ${esc(article.source)}${article.published ? ` · ${esc(article.published)}` : ""}</div>` : ""}
  <div class="grid">
    <div class="box">Verdict<b>${esc(VERDICT_META[a.verdict].label)}</b></div>
    <div class="box">Confidence<b>${esc(a.confidence)}%</b></div>
    <div class="box">Content score<b>${cs ?? "—"}</b></div>
    <div class="box">Source trust<b>${ss ?? "—"}</b></div>
  </div>
  <h2>Reality</h2><div>${esc(a.reality_statement || a.summary)}</div>
  <h2>Reasoning</h2><div>${esc(a.reasoning || a.summary)}</div>
  <div class="cols">
    <div><h2>${esc(CONTENT_INSTRUMENT)}</h2><table>${rows((id) => id.startsWith("C")) || "<tr><td>No content indicators</td></tr>"}</table></div>
    <div><h2>${esc(SOURCE_INSTRUMENT)}</h2><table>${rows((id) => id.startsWith("N")) || "<tr><td>No source criteria</td></tr>"}</table></div>
  </div>
  <h2>Evidence trail</h2>${links ? `<ul>${links}</ul>` : "<div>No matching coverage was found from legitimate sources.</div>"}
  <div class="sub" style="margin-top:10px">Scores: Content = (pass + 0.5×mixed) / applicable × 100 · Source = weighted NewsGuard criteria over applicable items.</div>
  </body></html>`);
  w.document.close();
  return true;
}
