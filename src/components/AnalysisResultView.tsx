import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Globe,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import type { AnalysisResult, CredibilityIndicator, VerificationLink } from "@/lib/analysis-types";
import { INSTRUMENT_NAME, VERDICT_META, sourceTrustScore } from "@/lib/analysis-types";
import { PH_TRUSTED_SOURCES } from "@/lib/trusted-sources";
import { extractFeatures } from "@/lib/nlp-features";

function verdictAccent(tone: "success" | "warning" | "danger") {
  return tone === "success"
    ? "var(--color-success)"
    : tone === "warning"
      ? "var(--color-warning)"
      : "var(--color-danger)";
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function SourceCard({
  name,
  description,
  url,
  accent,
}: {
  name: string;
  description: string;
  url: string;
  accent?: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg border bg-card p-4 transition-colors hover:border-foreground"
      style={accent ? { borderColor: accent } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{name}</div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
        </div>
        <ExternalLink
          className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground"
          style={accent ? { color: accent } : undefined}
        />
      </div>
    </a>
  );
}

export function AnalysisResultView({ result }: { result: AnalysisResult }) {
  const meta = VERDICT_META[result.verdict];
  const Icon = meta.tone === "success" ? ShieldCheck : meta.tone === "warning" ? ShieldAlert : AlertCircle;
  const accent = verdictAccent(meta.tone);

  const features = useMemo(() => extractFeatures(result.input_text), [result.input_text]);

  // Group verification links by type for the two grids
  const debunkingLinks = (result.verification_links ?? []).filter(
    (l) => l.type === "debunking" || l.type === "context",
  );
  const supportingLinks = (result.verification_links ?? []).filter((l) => l.type === "supporting");

  // Build a credible-sources grid from the trusted source directory + suggested_sources
  const credibleNames = new Set(
    result.suggested_sources
      .filter((s) => s.category === "mainstream" || s.category === "government")
      .map((s) => s.name),
  );
  const credibleSources =
    credibleNames.size > 0
      ? PH_TRUSTED_SOURCES.filter((s) => credibleNames.has(s.name))
      : PH_TRUSTED_SOURCES.filter((s) => s.category === "mainstream").slice(0, 6);

  const factCheckerSources = PH_TRUSTED_SOURCES.filter(
    (s) => s.category === "fact-checker" || (s.country === "PH" && s.category === "mainstream" && ["Rappler", "Manila Bulletin", "Inquirer.net"].includes(s.name)),
  ).slice(0, 4);

  // Behavioral chart data
  const chartData = [
    { name: "Clickbait", value: features.indicators.clickbait },
    { name: "Sentiment", value: features.indicators.sentiment },
    { name: "Capitalization", value: features.indicators.capitalization },
    { name: "Punctuation", value: features.indicators.punctuation },
  ];
  const barColor = (v: number) =>
    v >= 50 ? "var(--color-danger)" : v >= 25 ? "var(--color-warning)" : "var(--color-success)";

  return (
    <div className="space-y-10">
      {/* Classification Result */}
      <section>
        <SectionTitle title="Classification Result" />
        <Card
          className="p-5 border-2"
          style={{
            borderColor: accent,
            backgroundColor: `color-mix(in oklab, ${accent} 6%, var(--color-card))`,
          }}
        >
          <div className="flex items-start gap-4">
            <Icon className="h-7 w-7 shrink-0" style={{ color: accent }} />
            <div className="flex-1">
              <div className="font-bold text-lg">{meta.label}</div>
              <p className="text-sm text-muted-foreground">{meta.description}</p>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium">Confidence Score</span>
                  <span className="font-mono font-semibold">{result.confidence}%</span>
                </div>
                <Progress
                  value={result.confidence}
                  className="h-2 bg-muted"
                  style={{ ["--progress-color" as never]: accent }}
                />
              </div>
              {result.summary && (
                <p className="text-sm mt-4 leading-relaxed">{result.summary}</p>
              )}
            </div>
          </div>
        </Card>
      </section>

      {/* Credibility Instrument Scorecard */}
      {result.credibility_indicators && result.credibility_indicators.length > 0 && (
        <IndicatorScorecard indicators={result.credibility_indicators} />
      )}

      {/* Risk Factors */}
      {result.risk_factors.length > 0 && (
        <section>
          <SectionTitle title="Risk Factors Detected" />
          <div className="space-y-2">
            {result.risk_factors.map((r, i) => {
              const sevColor =
                r.severity === "high"
                  ? "var(--color-danger)"
                  : r.severity === "medium"
                    ? "var(--color-warning)"
                    : "var(--color-muted-foreground)";
              const sevBg =
                r.severity === "high"
                  ? "color-mix(in oklab, var(--color-danger) 12%, transparent)"
                  : r.severity === "medium"
                    ? "color-mix(in oklab, var(--color-warning) 18%, transparent)"
                    : "var(--color-muted)";
              return (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: sevColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{r.label}</div>
                      {r.excerpt && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.excerpt}</p>
                      )}
                    </div>
                    <Badge
                      className="uppercase text-[10px] font-semibold border-0"
                      style={{ backgroundColor: sevBg, color: sevColor }}
                    >
                      {r.severity}
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Analysis Summary */}
      {result.reasoning && (
        <section>
          <SectionTitle title="Analysis Summary" />
          <Card className="p-5">
            <ul className="space-y-2 text-sm">
              {result.reasoning
                .replace(/\(?\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\)?/g, "$1")
                .replace(/https?:\/\/\S+/g, "")
                .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý0-9"“(₱])|\n+/)
                .map((s) => s.trim().replace(/[.\s]+$/, ""))
                .filter((s) => s.length > 4)
                .slice(0, 8)
                .map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>{s}.</span>
                  </li>
                ))}
            </ul>
          </Card>
        </section>
      )}

      {/* Source */}
      {result.input_url && (
        <section>
          <SectionTitle title="Source" />
          <Card className="p-4">
            <a
              href={result.input_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-accent hover:underline truncate"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span className="truncate">{result.input_url}</span>
            </a>
          </Card>
        </section>
      )}

      {/* Verify with Fact-Checkers */}
      <section>
        <SectionTitle
          title="Verify with Fact-Checkers"
          subtitle="Use these trusted fact-checking resources to verify claims and find debunking evidence"
        />
        <div className="grid sm:grid-cols-2 gap-3">
          {debunkingLinks.length > 0
            ? debunkingLinks.slice(0, 4).map((l: VerificationLink, i) => (
                <SourceCard
                  key={i}
                  name={l.site_name}
                  description={l.label}
                  url={l.url}
                  accent="var(--color-danger)"
                />
              ))
            : factCheckerSources.map((s, i) => (
                <SourceCard
                  key={i}
                  name={s.name}
                  description={s.description}
                  url={s.url}
                  accent="var(--color-danger)"
                />
              ))}
        </div>
      </section>

      {/* Find Credible Sources */}
      <section>
        <SectionTitle
          title="Find Credible Sources"
          subtitle="Search these reputable news organizations for accurate reporting on this topic"
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {supportingLinks.length > 0
            ? supportingLinks.slice(0, 6).map((l, i) => (
                <SourceCard key={i} name={l.site_name} description={l.label} url={l.url} />
              ))
            : credibleSources.map((s, i) => (
                <SourceCard key={i} name={s.name} description={s.description} url={s.url} />
              ))}
        </div>
      </section>

      {/* Detail tabs */}
      <section>
        <Tabs defaultValue="nlp">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="nlp">
              <Sparkles className="h-4 w-4 mr-2" /> NLP Features
            </TabsTrigger>
            <TabsTrigger value="url">
              <Globe className="h-4 w-4 mr-2" /> URL Analysis
            </TabsTrigger>
            <TabsTrigger value="model">
              <Layers className="h-4 w-4 mr-2" /> Model Layers
            </TabsTrigger>
          </TabsList>

          {/* NLP FEATURES */}
          <TabsContent value="nlp" className="mt-6 space-y-6">
            <div>
              <SectionTitle
                title="NLP Feature Extraction"
                subtitle="Linguistic and statistical features extracted from the text"
              />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Total Words" value={features.totalWords} />
                <StatCard label="Unique Words" value={features.uniqueWords} />
                <StatCard label="Sentences" value={features.sentences} />
                <StatCard label="Avg Word Length" value={features.avgWordLength.toFixed(1)} />
              </div>
            </div>

            <div>
              <SectionTitle title="Behavioral Indicators" />
              <Card className="p-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((d, i) => (
                          <Cell key={i} fill={barColor(d.value)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <SectionTitle title="Top Tokens" />
                <Card className="p-4">
                  {features.topTokens.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Not enough content.</p>
                  ) : (
                    <ul className="space-y-2">
                      {features.topTokens.map((t) => (
                        <li key={t.token} className="flex items-center justify-between text-sm">
                          <span className="font-mono">{t.token}</span>
                          <span className="text-muted-foreground font-mono">×{t.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>

              <div>
                <SectionTitle title="Linguistic Metrics" />
                <Card className="p-4">
                  <ul className="space-y-3">
                    <MetricRow label="Exclamations" value={features.exclamations} />
                    <MetricRow label="Questions" value={features.questions} />
                    <MetricRow
                      label="Sentiment"
                      value={features.sentiment.toFixed(2)}
                      tone={features.sentiment < -0.2 ? "danger" : features.sentiment > 0.2 ? "success" : undefined}
                    />
                    <MetricRow label="Vocabulary Diversity" value={`${features.vocabularyDiversity}%`} />
                  </ul>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* URL ANALYSIS */}
          <TabsContent value="url" className="mt-6">
            <Card className="p-5">
              {result.input_url ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground tracking-wider">Submitted URL</div>
                    <a href={result.input_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline break-all">
                      {result.input_url}
                    </a>
                  </div>
                  <UrlBreakdown url={result.input_url} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No URL was submitted for this analysis.</p>
              )}
            </Card>
          </TabsContent>

          {/* MODEL LAYERS */}
          <TabsContent value="model" className="mt-6">
            <Card className="p-5">
              <SectionTitle title="Detection Pipeline" subtitle="Layers used to produce this verdict" />
              <ol className="space-y-3 text-sm">
                <ModelLayer
                  step={1}
                  title="Preprocessing & Tokenization"
                  desc="Text normalization, sentence segmentation, Tagalog/English token handling."
                />
                <ModelLayer
                  step={2}
                  title="Linguistic Feature Extraction"
                  desc="Sensational lexicon, punctuation/capitalization stats, sentiment, diversity."
                />
                <ModelLayer
                  step={3}
                  title="Live Web Search + Evidence Gathering"
                  desc="OpenAI model (Role Prompting + Structured Evidence-Guided Prompting) opens your link and searches the web itself for coverage, vetting each website it finds."
                />
                <ModelLayer
                  step={4}
                  title="Source Trust Instrument"
                  desc={`The publishing website is scored against the ${INSTRUMENT_NAME} (weighted to 100 points). The verdict comes from the evidence; the instrument adjusts confidence.`}
                />
                <ModelLayer
                  step={5}
                  title="Direct Evidence Links"
                  desc="Lists the real article links found — supporting, debunking, or context."
                />
              </ol>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </Card>
  );
}

function MetricRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "success" | "danger";
}) {
  const color = tone === "danger" ? "var(--color-danger)" : tone === "success" ? "var(--color-success)" : undefined;
  return (
    <li className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <span className="font-mono font-semibold" style={color ? { color } : undefined}>
        {value}
      </span>
    </li>
  );
}

function UrlBreakdown({ url }: { url: string }) {
  try {
    const u = new URL(url);
    const govTld = u.hostname.endsWith(".gov") || u.hostname.endsWith(".gov.ph");
    return (
      <div className="grid sm:grid-cols-2 gap-3 mt-2">
        <Field label="Protocol" value={u.protocol.replace(":", "")} />
        <Field label="Domain" value={u.hostname} />
        <Field label="Path" value={u.pathname || "/"} />
        <Field label="TLD signal" value={govTld ? "Government domain" : "Standard domain"} />
      </div>
    );
  } catch {
    return <p className="text-sm text-muted-foreground">Could not parse URL.</p>;
  }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className="text-sm font-mono mt-1 break-all">{value}</div>
    </div>
  );
}

function ModelLayer({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <li className="flex gap-3">
      <div className="h-7 w-7 rounded-full bg-foreground text-background grid place-items-center text-xs font-bold shrink-0">
        {step}
      </div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Credibility Coalition — Content Credibility Indicators scorecard

const GROUP_META: Record<CredibilityIndicator["group"], { label: string; blurb: string }> = {
  credibility: { label: "Credibility", blurb: "Is the website's reporting accurate and responsible?" },
  transparency: { label: "Transparency", blurb: "Does the website disclose who runs and funds it?" },
  content: { label: "Content", blurb: "Signals from the article itself" },
  context: { label: "Context", blurb: "How the claim sits in the wider ecosystem" },
  publisher: { label: "Publisher", blurb: "Who is publishing and their track record" },
};

const SCORE_META: Record<
  CredibilityIndicator["score"],
  { label: string; color: string; bg: string }
> = {
  pass: {
    label: "Pass",
    color: "var(--color-success)",
    bg: "color-mix(in oklab, var(--color-success) 14%, transparent)",
  },
  mixed: {
    label: "Mixed",
    color: "var(--color-warning)",
    bg: "color-mix(in oklab, var(--color-warning) 18%, transparent)",
  },
  fail: {
    label: "Fail",
    color: "var(--color-danger)",
    bg: "color-mix(in oklab, var(--color-danger) 14%, transparent)",
  },
  not_applicable: {
    label: "N/A",
    color: "var(--color-muted-foreground)",
    bg: "var(--color-muted)",
  },
};

function humanizeName(name: string) {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function IndicatorScorecard({ indicators }: { indicators: CredibilityIndicator[] }) {
  const groups: CredibilityIndicator["group"][] = ["credibility", "transparency", "content", "context", "publisher"];
  const passes = indicators.filter((i) => i.score === "pass").length;
  const fails = indicators.filter((i) => i.score === "fail").length;
  const mixed = indicators.filter((i) => i.score === "mixed").length;
  const trust = sourceTrustScore(indicators);

  return (
    <section>
      <SectionTitle
        title="Source Trust Scorecard"
        subtitle={`The website where this content was published, scored against the ${INSTRUMENT_NAME}. 60+ points = generally trustworthy.`}
      />
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2 mb-5 text-xs">
          {trust !== null && (
            <Badge className="border-0 bg-foreground text-background">
              Source trust: {trust}/100
            </Badge>
          )}
          <Badge
            className="border-0"
            style={{ backgroundColor: SCORE_META.pass.bg, color: SCORE_META.pass.color }}
          >
            {passes} Pass
          </Badge>
          <Badge
            className="border-0"
            style={{ backgroundColor: SCORE_META.mixed.bg, color: SCORE_META.mixed.color }}
          >
            {mixed} Mixed
          </Badge>
          <Badge
            className="border-0"
            style={{ backgroundColor: SCORE_META.fail.bg, color: SCORE_META.fail.color }}
          >
            {fails} Fail
          </Badge>
        </div>

        <div className="space-y-6">
          {groups.map((g) => {
            const items = indicators.filter((i) => i.group === g);
            if (items.length === 0) return null;
            return (
              <div key={g}>
                <div className="mb-2">
                  <div className="text-sm font-semibold">{GROUP_META[g].label}</div>
                  <div className="text-xs text-muted-foreground">{GROUP_META[g].blurb}</div>
                </div>
                <ul className="space-y-2">
                  {items.map((ind) => {
                    const s = SCORE_META[ind.score] ?? SCORE_META.not_applicable;
                    return (
                      <li
                        key={ind.id}
                        className="flex items-start gap-3 rounded-md border p-3"
                      >
                        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground pt-0.5 w-8 shrink-0">
                          {ind.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{humanizeName(ind.name)}</div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ind.justification}
                          </p>
                        </div>
                        <Badge
                          className="uppercase text-[10px] font-semibold border-0 shrink-0"
                          style={{ backgroundColor: s.bg, color: s.color }}
                        >
                          {s.label}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
