import { useEffect, useState } from "react";
import { Check, Search, Globe, Scale, BarChart3 } from "lucide-react";

const STAGES = [
  { icon: Search, title: "Extracting the claim", detail: "Finding the main statement, people, places and dates" },
  { icon: Globe, title: "Searching trusted sources", detail: "Government portals, PH newsrooms and fact-checkers" },
  { icon: Scale, title: "Scoring with the hybrid instrument", detail: "Credibility Coalition (content) + NewsGuard (source)" },
  { icon: BarChart3, title: "Building the verdict", detail: "Confidence score, risk factors and evidence summary" },
];
// Approximate pacing (ms) at which each stage starts; last stage waits for the real answer.
const STARTS = [0, 4000, 16000, 26000];

export function InvestigationStepper() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - t0), 250);
    return () => clearInterval(id);
  }, []);
  const active = STARTS.reduce((acc, s, i) => (elapsed >= s ? i : acc), 0);

  return (
    <div className="rounded-xl border bg-card p-4 animate-enter-up">
      <div className="flex items-center justify-between mb-3">
        <span className="shimmer-text text-sm font-semibold">Investigating sources</span>
        <span className="font-mono text-xs text-muted-foreground">{(elapsed / 1000).toFixed(0)}s</span>
      </div>
      <ol className="space-y-3">
        {STAGES.map((s, i) => {
          const done = i < active;
          const now = i === active;
          const Icon = s.icon;
          return (
            <li key={s.title} className={`flex items-start gap-3 transition-opacity duration-500 ${i > active ? "opacity-40" : "opacity-100"}`}>
              <span
                className={`relative grid place-items-center h-7 w-7 shrink-0 rounded-full border transition-colors duration-500 ${
                  done ? "bg-success text-background border-success" : now ? "border-accent text-accent" : "text-muted-foreground"
                }`}
              >
                {now && <span className="absolute inset-0 rounded-full bg-accent/25 animate-ping" />}
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 pt-0.5">
                <div className="text-sm font-medium flex items-center gap-2">
                  {s.title}
                  {now && (
                    <span className="flex gap-1">
                      <span className="dot" />
                      <span className="dot" style={{ animationDelay: "150ms" }} />
                      <span className="dot" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{s.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
