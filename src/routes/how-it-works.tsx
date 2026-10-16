import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How SURI Works — Hybrid Fake News Detection Pipeline" },
      { name: "description", content: "The SURI pipeline: claim extraction, live web search, source vetting, and a hybrid Credibility Coalition + NewsGuard scorecard." },
      { property: "og:title", content: "How SURI Works" },
      { property: "og:description", content: "Role Prompting + Structured Evidence-Guided Prompting with a hybrid credibility instrument." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HowItWorks,
});

const STEPS = [
  ["Understand the claim", "You write naturally in English, Filipino or Taglish, or paste a link. SURI extracts the core claim: who, what, where, when. Follow-up questions in the same investigation are understood using earlier answers."],
  ["Open the link", "Pasted links are opened directly. SURI reports if a page is readable, needs a login, is private, deleted, or unreachable."],
  ["Search the web itself", "No list of websites is needed. The AI searches live for government, LGU, school, news and fact-checker coverage in English and Filipino."],
  ["Vet every source", "Each website found is checked for legitimacy, including look-alike or impostor domains."],
  ["Score the hybrid instrument", "Layer A scores the text (Credibility Coalition). Layer B scores the publishing website (NewsGuard)."],
  ["Give the verdict", "Likely Credible, Suspicious, or Likely Fake, with a confidence %, evidence summary, risk factors, and direct links to the articles found."],
];

const LAYER_A = ["Title is representative, not clickbait", "Avoids sensational or emotional language", "Avoids excessive CAPS and !!!", "Cites named sources or experts", "Includes verifiable specifics", "Corroborated by outside sources", "Free of fallacies and manipulative framing", "Does not urge immediate sharing"];
const LAYER_B = [["Does not repeatedly publish false content", 22], ["Gathers and presents information responsibly", 18], ["Regularly corrects errors", 12.5], ["Separates news and opinion", 12.5], ["Avoids deceptive headlines", 10], ["Discloses ownership and financing", 7.5], ["Clearly labels advertising", 7.5], ["Reveals who's in charge", 5], ["Names content creators", 5]] as const;

function HowItWorks() {
  return (
    <div className="mx-auto max-w-4xl px-4 md:px-6 py-12 space-y-14">
      <header className="space-y-3">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Methodology</div>
        <h1 className="font-serif text-4xl md:text-5xl">How SURI works</h1>
        <p className="text-muted-foreground max-w-2xl">
          SURI combines <strong className="text-foreground">Role Prompting</strong> (the AI acts as a senior fact-checker) with{" "}
          <strong className="text-foreground">Structured Evidence-Guided Prompting</strong> (it must gather and list evidence, score it, and only then decide).
        </p>
      </header>

      <section>
        <h2 className="font-serif text-2xl mb-5">The pipeline</h2>
        <ol className="grid gap-3 md:grid-cols-2">
          {STEPS.map(([t, d], i) => (
            <Card key={t} className="p-5">
              <div className="font-mono text-xs text-muted-foreground">STEP {i + 1}</div>
              <div className="font-medium mt-1">{t}</div>
              <p className="text-sm text-muted-foreground mt-1">{d}</p>
            </Card>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="font-serif text-2xl mb-2">The hybrid instrument</h2>
        <p className="text-sm text-muted-foreground mb-5">Fake news can be well written on a fake site, or badly written on a real one. Scoring both the text and the source closes each instrument's blind spot.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Layer A · the text</div>
            <div className="font-medium mt-1">Credibility Coalition Content Indicators</div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {LAYER_A.map((x, i) => <li key={x}><span className="font-mono text-xs text-muted-foreground mr-2">C{i + 1}</span>{x}</li>)}
            </ul>
            <p className="text-xs text-muted-foreground mt-3">Pass = 1, Mixed = ½, Fail = 0 → content score /100.</p>
          </Card>
          <Card className="p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Layer B · the source</div>
            <div className="font-medium mt-1">NewsGuard 9 Journalistic Criteria</div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {LAYER_B.map(([x, w], i) => <li key={x} className="flex justify-between gap-2"><span><span className="font-mono text-xs text-muted-foreground mr-2">N{i + 1}</span>{x}</span><span className="text-muted-foreground">{w}</span></li>)}
            </ul>
            <p className="text-xs text-muted-foreground mt-3">Weighted to 100 points. 60+ = generally trustworthy site.</p>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl mb-4">How the verdict is decided</h2>
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <Card className="p-4"><div className="font-medium text-success">Likely Credible</div><p className="text-muted-foreground mt-1">Confirmed by an official source or two independent legitimate outlets.</p></Card>
          <Card className="p-4"><div className="font-medium text-warning">Suspicious</div><p className="text-muted-foreground mt-1">Uncorroborated, outdated, partly true, or mixed evidence.</p></Card>
          <Card className="p-4"><div className="font-medium text-danger">Likely Fake</div><p className="text-muted-foreground mt-1">Debunked, from an impostor site, or uncorroborated with strong deceptive signals.</p></Card>
        </div>
        <p className="text-sm text-muted-foreground mt-4">The evidence decides the verdict; the two scores raise or lower the confidence.</p>
      </section>

      <section className="animate-enter-up">
        <h2 className="font-serif text-2xl mb-2">The grading formula</h2>
        <p className="text-sm text-muted-foreground mb-5">
          SURI first collects evidence from the web, then marks each indicator. The marks are turned into two scores out of 100, and the evidence plus both scores decide the verdict.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5 lift">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Layer A · Content score</div>
            <div className="formula mt-3">S<sub>content</sub> = (P + 0.5 × M) ÷ A × 100</div>
            <ul className="text-xs text-muted-foreground mt-3 space-y-1">
              <li><b className="text-foreground">P</b> = indicators C1–C8 marked Pass</li>
              <li><b className="text-foreground">M</b> = indicators marked Mixed (half credit)</li>
              <li><b className="text-foreground">A</b> = applicable indicators (N/A ones are skipped)</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">Example: 5 pass, 2 mixed, 1 fail → (5 + 1) ÷ 8 × 100 = <b className="text-foreground">75</b></p>
          </Card>
          <Card className="p-5 lift">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Layer B · Source score</div>
            <div className="formula mt-3">S<sub>source</sub> = Σ(w<sub>j</sub> × v<sub>j</sub>) ÷ Σw<sub>j</sub> × 100</div>
            <ul className="text-xs text-muted-foreground mt-3 space-y-1">
              <li><b className="text-foreground">w<sub>j</sub></b> = NewsGuard weight of criterion N<sub>j</sub> (22, 18, 12.5…)</li>
              <li><b className="text-foreground">v<sub>j</sub></b> = 1 Pass, 0.5 Mixed, 0 Fail</li>
              <li>Only applicable criteria count. 60+ = generally trustworthy</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">Example: fails N5 (10) and N7 (7.5) → (100 − 17.5) ÷ 100 × 100 = <b className="text-foreground">82.5</b></p>
          </Card>
        </div>
        <Card className="p-5 mt-4 lift">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Verdict rules</div>
          <div className="mt-3 grid gap-2 text-sm">
            <div><span className="font-medium text-success">Likely Credible</span> — confirmed by evidence, S<sub>content</sub> ≥ 70 and S<sub>source</sub> ≥ 60 → confidence 75–97%</div>
            <div><span className="font-medium text-danger">Likely Fake</span> — directly debunked (75–97%), or uncorroborated with S<sub>content</sub> &lt; 50 and S<sub>source</sub> &lt; 60 (65–90%)</div>
            <div><span className="font-medium text-warning">Suspicious</span> — uncorroborated, outdated, partly true, or mixed → confidence 40–70%</div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Confidence means how sure SURI is, not the chance the story is true. It is high when the proof is direct (an official advisory, a fact-check) and drops when proof is indirect or the two scores disagree. When they disagree, the evidence wins.
          </p>
        </Card>
      </section>

      <Link to="/" className="btn-pop inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Start an investigation</Link>
    </div>
  );
}
