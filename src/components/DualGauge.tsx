import { useEffect, useState } from "react";

function tone(v: number | null, threshold: number) {
  if (v === null) return "var(--color-muted-foreground)";
  if (v >= threshold) return "var(--color-success)";
  if (v >= threshold - 25) return "var(--color-warning)";
  return "var(--color-danger)";
}

function Ring({ value, label, sub, threshold }: { value: number | null; label: string; sub: string; threshold: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value ?? 0));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const r = 42;
  const c = 2 * Math.PI * r;
  const color = tone(value, threshold);
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="9" />
          <circle
            cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - (c * shown) / 100}
            style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div>
            <div className="font-mono text-2xl font-bold" style={{ color }}>{value ?? "—"}</div>
            <div className="text-[10px] text-muted-foreground">/ 100</div>
          </div>
        </div>
      </div>
      <div className="mt-2 text-sm font-semibold">{label}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

export function DualGauge({
  content, source, verdictLabel, confidence, accent,
}: { content: number | null; source: number | null; verdictLabel: string; confidence: number; accent: string }) {
  const agree =
    content !== null && source !== null ? (content >= 50) === (source >= 60) : null;
  return (
    <div className="rounded-xl border bg-card p-5 animate-enter-up">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Ring value={content} label="Content Credibility" sub="Text layer · Credibility Coalition C1–C8" threshold={50} />
        <div className="flex flex-col items-center text-center px-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Verdict</span>
          <span className="mt-1 rounded-full px-3 py-1 text-xs font-bold border-2" style={{ borderColor: accent, color: accent }}>
            {verdictLabel}
          </span>
          <span className="mt-1 font-mono text-xs">{confidence}%</span>
        </div>
        <Ring value={source} label="Source Trust" sub="Publisher layer · NewsGuard N1–N9" threshold={60} />
      </div>
      <p className="mt-4 text-xs text-muted-foreground text-center">
        {agree === null
          ? "One layer could not be scored, so the verdict relies more on the evidence found."
          : agree
            ? "Both layers agree — the text and its publisher point the same way."
            : "The layers disagree — the evidence found decides the verdict, with lower confidence."}
      </p>
    </div>
  );
}
