import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listThreads, loadMessages, subscribe } from "@/lib/local-chats";
import { VERDICT_META, type Verdict } from "@/lib/analysis-types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Live Search Dashboard — SURI" },
      { name: "description", content: "Search and review every claim you've checked with SURI: verdicts, confidence, and trends." },
      { property: "og:title", content: "SURI Live Search Dashboard" },
      { property: "og:description", content: "Search and review every claim you've checked." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

interface Row { threadId: string; title: string; claim: string; verdict: Verdict; confidence: number; date: string; source?: string }

const TONE: Record<Verdict, string> = { credible: "text-success", suspicious: "text-warning", likely_fake: "text-danger" };

function collect(): Row[] {
  const rows: Row[] = [];
  for (const t of listThreads()) {
    for (const m of loadMessages(t.id)) {
      const a = m.analysis?.analysis;
      if (m.role !== "assistant" || !a?.verdict) continue;
      rows.push({
        threadId: t.id, title: t.title,
        claim: m.analysis?.article?.headline || a.input_text || t.title,
        verdict: a.verdict, confidence: a.confidence ?? 0, date: m.created_at,
        source: m.analysis?.article?.source,
      });
    }
  }
  return rows.sort((x, y) => y.date.localeCompare(x.date));
}

function Dashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Verdict | "all">("all");
  useEffect(() => { setRows(collect()); return subscribe(() => setRows(collect())); }, []);

  const shown = useMemo(() => rows.filter((r) =>
    (filter === "all" || r.verdict === filter) &&
    (`${r.claim} ${r.title} ${r.source ?? ""}`).toLowerCase().includes(q.toLowerCase())), [rows, q, filter]);

  const count = (v: Verdict) => rows.filter((r) => r.verdict === v).length;
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.confidence, 0) / rows.length) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-6 py-10 space-y-8">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Dashboard</div>
        <h1 className="font-serif text-4xl">Live search dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Every claim you've checked on this device. Updates as you investigate.</p>
      </header>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <Stat label="Claims checked" value={rows.length} />
        <Stat label="Likely credible" value={count("credible")} tone="text-success" />
        <Stat label="Suspicious" value={count("suspicious")} tone="text-warning" />
        <Stat label="Likely fake" value={count("likely_fake")} tone="text-danger" />
        <Stat label="Avg. confidence" value={`${avg}%`} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your checked claims…" className="pl-9" />
        </div>
        <div className="flex gap-1">
          {(["all", "credible", "suspicious", "likely_fake"] as const).map((v) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`rounded-md px-3 py-1.5 text-sm border ${filter === v ? "bg-foreground text-background" : "hover:bg-muted"}`}>
              {v === "all" ? "All" : VERDICT_META[v].label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          {rows.length === 0 ? <>No checks yet. <Link to="/" className="underline text-foreground">Start an investigation</Link>.</> : "No claims match your search."}
        </Card>
      ) : (
        <ul className="space-y-2">
          {shown.map((r, i) => (
            <li key={i}>
              <Link to="/c/$threadId" params={{ threadId: r.threadId }} className="block">
                <Card className="p-4 hover:border-foreground transition-colors flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.claim}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.source ? `${r.source} · ` : ""}{new Date(r.date).toLocaleString()}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-medium ${TONE[r.verdict]}`}>{VERDICT_META[r.verdict].label}</div>
                    <div className="text-xs text-muted-foreground">{r.confidence}% confidence</div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <Card className="p-4">
      <div className={`text-2xl font-serif ${tone ?? ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}
