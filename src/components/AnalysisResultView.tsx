import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import type { AnalysisResult } from "@/lib/analysis-types";
import { VERDICT_META } from "@/lib/analysis-types";
import { CATEGORY_LABELS, PH_TRUSTED_SOURCES, type SourceCategory } from "@/lib/trusted-sources";

function ConfidenceGauge({ value, tone }: { value: number; tone: "success" | "warning" | "danger" }) {
  const color =
    tone === "success" ? "var(--color-success)" : tone === "warning" ? "var(--color-warning)" : "var(--color-danger)";
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2 w-40 rounded-full bg-muted overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-mono">{value}%</span>
    </div>
  );
}

function highlightText(text: string, phrases: { phrase: string; reason: string }[]) {
  if (!phrases.length) return <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>;
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(${phrases.map((p) => escape(p.phrase)).filter(Boolean).join("|")})`, "gi");
  const parts = text.split(pattern);
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((part, i) => {
        const match = phrases.find((p) => p.phrase.toLowerCase() === part.toLowerCase());
        return match ? (
          <mark
            key={i}
            title={match.reason}
            className="bg-warning/30 text-foreground px-0.5 rounded cursor-help"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </p>
  );
}

export function AnalysisResultView({ result }: { result: AnalysisResult }) {
  const meta = VERDICT_META[result.verdict];
  const Icon = meta.tone === "success" ? ShieldCheck : meta.tone === "warning" ? ShieldAlert : AlertTriangle;
  const toneClass =
    meta.tone === "success"
      ? "bg-success text-success-foreground"
      : meta.tone === "warning"
        ? "bg-warning text-warning-foreground"
        : "bg-danger text-danger-foreground";

  // Group sources by category
  const grouped: Record<SourceCategory, typeof result.suggested_sources> = {
    "fact-checker": [],
    mainstream: [],
    government: [],
    international: [],
  };
  for (const s of result.suggested_sources) {
    if (grouped[s.category]) grouped[s.category].push(s);
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 border-2">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-lg grid place-items-center ${toneClass}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Verdict</div>
              <h2 className="font-serif text-2xl">{meta.label}</h2>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Confidence</div>
            <ConfidenceGauge value={result.confidence} tone={meta.tone} />
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{meta.description}</p>
        <p className="mt-3 text-sm leading-relaxed">{result.summary}</p>
        {result.reasoning && (
          <p className="mt-3 text-xs text-muted-foreground italic border-l-2 border-border pl-3">{result.reasoning}</p>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-serif text-lg mb-3">Risk Factors</h3>
          {result.risk_factors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notable risk factors detected.</p>
          ) : (
            <ul className="space-y-3">
              {result.risk_factors.map((r, i) => (
                <li key={i} className="border-l-2 pl-3" style={{ borderColor: r.severity === "high" ? "var(--color-danger)" : r.severity === "medium" ? "var(--color-warning)" : "var(--color-muted-foreground)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.label}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{r.severity}</Badge>
                  </div>
                  {r.excerpt && <p className="text-xs text-muted-foreground mt-1">"{r.excerpt}"</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-serif text-lg mb-3">Annotated Content</h3>
          <div className="max-h-80 overflow-y-auto pr-2">
            {highlightText(result.input_text, result.highlighted_phrases)}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Hover highlighted phrases to see why they were flagged.</p>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-serif text-lg mb-1">Legit Check — Verify with trusted sources</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Cross-reference this content against established Philippine outlets and fact-checkers before sharing.
        </p>
        <div className="space-y-5">
          {(Object.keys(grouped) as SourceCategory[]).map((cat) =>
            grouped[cat].length === 0 ? null : (
              <div key={cat}>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{CATEGORY_LABELS[cat]}</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {grouped[cat].map((s, i) => {
                    const directory = PH_TRUSTED_SOURCES.find((d) => d.name === s.name);
                    const homeHref = directory ? directory.url : s.url;
                    return (
                      <a
                        key={i}
                        href={homeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group border border-border rounded-md p-3 hover:border-accent hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{s.name}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {directory?.description ?? homeHref}
                        </p>
                      </a>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </div>
      </Card>
    </div>
  );
}
