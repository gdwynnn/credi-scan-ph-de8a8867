import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About SURI — Fake News Detection Using NLP" },
      { name: "description", content: "SURI: an intelligent system for fake news detection using natural language processing, jointly developed by God Wyn Ferrer, Jaziella Mari Millares, and John Vincent Oriel." },
      { property: "og:title", content: "About SURI" },
      { property: "og:description", content: "Jointly developed by God Wyn Ferrer, Jaziella Mari Millares, and John Vincent Oriel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

const TEAM = ["God Wyn Ferrer", "Jaziella Mari Millares", "John Vincent Oriel"];

function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 py-12 space-y-10">
      <header className="space-y-3">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">About</div>
        <h1 className="font-serif text-5xl md:text-6xl text-gradient-ink animate-enter-up">SURI</h1>
        <p className="text-lg font-medium animate-enter-up" style={{ animationDelay: "80ms" }}>System for Unbiased Research and Information verification</p>
        <p className="text-muted-foreground animate-enter-up" style={{ animationDelay: "160ms" }}>An intelligent system for fake news detection using natural language processing. "Suri" is Filipino for "to examine closely."</p>
      </header>
      <p className="leading-relaxed">
        SURI helps Filipinos, and anyone worldwide, check whether a news story, post, or rumor is real before sharing it.
        Just ask in your own words or paste a link. The system searches trusted sources on its own, checks that those websites are
        legitimate, scores both the text and the source with a hybrid credibility instrument, and returns a clear verdict with
        direct links to the evidence.
      </p>
      <section>
        <h2 className="font-serif text-2xl mb-4">Developers</h2>
        <p className="text-sm text-muted-foreground mb-4">This system was jointly developed by:</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {TEAM.map((n) => (
            <Card key={n} className="p-5 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary text-primary-foreground grid place-items-center font-serif text-lg">
                {n.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
              <div className="mt-3 font-medium">{n}</div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
