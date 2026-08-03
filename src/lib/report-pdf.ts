import { jsPDF } from "jspdf";
import type { AnalysisResult } from "./analysis-types";
import { INSTRUMENT_NAME, VERDICT_META } from "./analysis-types";

export interface ReportArticle {
  headline: string;
  source: string;
  published?: string;
  body: string;
}

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const M = 48; // margin
const CONTENT_W = PAGE_W - M * 2;

type RGB = [number, number, number];

const INK: RGB = [24, 28, 38];
const MUTED: RGB = [110, 118, 132];
const LINE: RGB = [222, 226, 234];
const TONE: Record<"success" | "warning" | "danger", RGB> = {
  success: [21, 128, 61],
  warning: [180, 120, 8],
  danger: [190, 40, 40],
};

/** jsPDF core fonts are Latin-1 only — replace anything outside it. */
function ascii(input: string): string {
  return (input ?? "")
    .replace(/[₱]/g, "PHP ")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[•]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\n]/g, "");
}

export function buildReportPdf(
  result: AnalysisResult,
  article?: ReportArticle | null,
  assistantMessage?: string,
): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const meta = VERDICT_META[result.verdict];
  const accent = TONE[meta.tone];
  let y = M;

  const setColor = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);

  function ensure(space: number) {
    if (y + space > PAGE_H - M - 24) {
      doc.addPage();
      y = M;
    }
  }

  function text(
    body: string,
    opts: { size?: number; bold?: boolean; color?: RGB; gap?: number; x?: number; width?: number } = {},
  ) {
    const size = opts.size ?? 10;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    setColor(opts.color ?? INK);
    const width = opts.width ?? CONTENT_W;
    const lines = doc.splitTextToSize(ascii(body), width) as string[];
    const lh = size * 1.45;
    for (const ln of lines) {
      ensure(lh);
      doc.text(ln, opts.x ?? M, y + size);
      y += lh;
    }
    y += opts.gap ?? 0;
  }

  function heading(label: string) {
    ensure(78);
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setColor(INK);
    doc.text(ascii(label), M, y + 12);
    y += 20;
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.8);
    doc.line(M, y, M + CONTENT_W, y);
    y += 10;
  }

  // ---- Header -------------------------------------------------------------
  doc.setFillColor(INK[0], INK[1], INK[2]);
  doc.rect(0, 0, PAGE_W, 74, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("CREDISCAN", M, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(196, 202, 214);
  doc.text("Fake News Detection Report - Philippine Information Ecosystem", M, 57);
  const stamp = new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  doc.text(ascii(stamp), PAGE_W - M, 57, { align: "right" });
  y = 100;

  // ---- Verdict card -------------------------------------------------------
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const summaryLines = doc.splitTextToSize(ascii(result.summary || ""), CONTENT_W - 44) as string[];
  const cardH = 96 + summaryLines.length * 14;
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(1.2);
  doc.roundedRect(M, y, CONTENT_W, cardH, 8, 8, "S");
  doc.rect(M, y, 5, cardH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setColor(accent);
  doc.text(`${result.confidence}%  ${ascii(meta.label)}`, M + 20, y + 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setColor(MUTED);
  doc.text(ascii(meta.description), M + 20, y + 50);

  // confidence bar
  const barY = y + 62;
  doc.setFillColor(232, 234, 240);
  doc.roundedRect(M + 20, barY, CONTENT_W - 40, 7, 3.5, 3.5, "F");
  doc.setFillColor(accent[0], accent[1], accent[2]);
  const w = Math.max(4, ((CONTENT_W - 40) * Math.min(100, result.confidence)) / 100);
  doc.roundedRect(M + 20, barY, w, 7, 3.5, 3.5, "F");

  doc.setFontSize(10);
  setColor(INK);
  summaryLines.forEach((ln, i) => doc.text(ln, M + 20, barY + 26 + i * 14));
  y += cardH + 8;

  // ---- Assistant message --------------------------------------------------
  if (assistantMessage?.trim()) {
    heading("Assistant Finding");
    text(assistantMessage, { size: 10, color: INK });
  }

  // ---- Reconstructed article ---------------------------------------------
  if (article) {
    heading("Claim Under Review");
    text(article.headline, { size: 11.5, bold: true });
    text(
      [article.source, article.published].filter(Boolean).join("  -  "),
      { size: 9, color: MUTED, gap: 4 },
    );
    text(article.body, { size: 10, color: INK });
  }

  // ---- Reasoning ----------------------------------------------------------
  if (result.reasoning) {
    heading("Analysis Summary");
    text(result.reasoning, { size: 10 });
  }

  // ---- Risk factors -------------------------------------------------------
  if (result.risk_factors?.length) {
    heading("Risk Factors Detected");
    for (const r of result.risk_factors) {
      text(`- [${r.severity.toUpperCase()}] ${r.label}`, { size: 10, bold: true });
      if (r.excerpt) text(`  "${r.excerpt}"`, { size: 9, color: MUTED });
      y += 2;
    }
  }

  // ---- Credibility instrument --------------------------------------------
  const inds = result.credibility_indicators ?? [];
  if (inds.length) {
    heading("Credibility Instrument Scorecard");
    text(`Instrument: ${INSTRUMENT_NAME}`, { size: 8.5, color: MUTED, gap: 6 });

    for (const ind of inds) {
      const scoreColor: RGB =
        ind.score === "pass" ? TONE.success : ind.score === "fail" ? TONE.danger : ind.score === "mixed" ? TONE.warning : MUTED;
      const label = `${ind.id}  ${ind.name.replace(/_/g, " ")}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const just = doc.splitTextToSize(ascii(ind.justification || ""), CONTENT_W - 96) as string[];
      ensure(16 + just.length * 12);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      setColor(INK);
      doc.text(ascii(label), M, y + 9);

      doc.setFontSize(8.5);
      setColor(scoreColor);
      doc.text(ind.score.replace(/_/g, " ").toUpperCase(), M + CONTENT_W, y + 9, { align: "right" });
      y += 14;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setColor(MUTED);
      for (const ln of just) {
        doc.text(ln, M + 12, y + 8);
        y += 12;
      }
      y += 4;
    }
  }

  // ---- Verification links -------------------------------------------------
  const links = result.verification_links ?? [];
  const supporting = links.filter((l) => l.type !== "debunking");
  const debunking = links.filter((l) => l.type === "debunking");

  function linkList(title: string, list: typeof links) {
    if (!list.length) return;
    heading(title);
    for (const l of list) {
      ensure(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      setColor(INK);
      doc.text(`- ${ascii(l.site_name)}`, M, y + 9);
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setColor([37, 99, 235]);
      const urlLines = doc.splitTextToSize(ascii(l.url), CONTENT_W - 14) as string[];
      for (const ln of urlLines) {
        doc.textWithLink(ln, M + 12, y + 8, { url: l.url });
        y += 11;
      }
      setColor(MUTED);
      doc.setFontSize(8.5);
      const lbl = doc.splitTextToSize(ascii(l.label || ""), CONTENT_W - 14) as string[];
      for (const ln of lbl) {
        doc.text(ln, M + 12, y + 8);
        y += 11;
      }
      y += 4;
    }
  }

  linkList("Find Credible Sources", supporting);
  linkList("Verify with Fact-Checkers", debunking);

  // ---- Footers ------------------------------------------------------------
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.8);
    doc.line(M, PAGE_H - M + 6, PAGE_W - M, PAGE_H - M + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor(MUTED);
    doc.text(
      "CrediScan is a decision-support tool. Always cross-check with primary sources.",
      M,
      PAGE_H - M + 20,
    );
    doc.text(`Page ${p} of ${total}`, PAGE_W - M, PAGE_H - M + 20, { align: "right" });
  }

  return doc;
}

export function downloadReportPdf(
  result: AnalysisResult,
  article?: ReportArticle | null,
  assistantMessage?: string,
) {
  const doc = buildReportPdf(result, article, assistantMessage);
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`CrediScan-Report-${date}.pdf`);
}
