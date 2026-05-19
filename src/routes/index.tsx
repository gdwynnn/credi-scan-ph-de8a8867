import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Link2, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AnalysisResultView } from "@/components/AnalysisResultView";
import { analyzeContent } from "@/lib/analyze.functions";
import { fetchUrlContent } from "@/lib/fetch-url.functions";
import type { AnalysisResult } from "@/lib/analysis-types";
import { supabase } from "@/integrations/supabase/client";
import { EXAMPLE_FAKE, EXAMPLE_GENUINE } from "@/lib/nlp-features";

export const Route = createFileRoute("/")({ component: Analyzer });

function Analyzer() {
  const analyze = useServerFn(analyzeContent);
  const fetchUrl = useServerFn(fetchUrlContent);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const counts = useMemo(() => {
    const chars = text.length;
    const words = (text.trim().match(/\b[\p{L}'-]+\b/gu) ?? []).length;
    return { chars, words };
  }, [text]);

  const handleAnalyze = async () => {
    const content = text.trim();
    if (content.length < 20 && !url.trim()) {
      toast.error("Paste at least 20 characters of text, or provide a URL.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      let analyzeText = content;
      let analyzeUrl: string | null = url.trim() || null;
      if (!analyzeText && analyzeUrl) {
        const fetched = await fetchUrl({ data: { url: analyzeUrl } });
        toast.success(`Fetched: ${fetched.title || "article"}`);
        analyzeText = fetched.text;
        analyzeUrl = fetched.url;
      }
      const res = await analyze({
        data: { text: analyzeText, url: analyzeUrl, save: !!userId, userId },
      });
      setResult(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <header className="flex items-start gap-4 pb-6 border-b border-border">
        <div className="h-12 w-12 rounded-md bg-foreground text-background grid place-items-center shrink-0">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Fake News Detection System</h1>
          <p className="text-sm text-muted-foreground mt-1">
            NLP-powered content verification and classification
          </p>
        </div>
      </header>

      {/* URL input */}
      <section className="mt-8 space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <Link2 className="h-4 w-4" /> Article URL
        </label>
        <Input
          placeholder="https://example.com/news/article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="bg-muted border-0 h-11"
        />
      </section>

      {/* Text input */}
      <section className="mt-6 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4" /> Input Text
          </label>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Try examples:</span>
            <Button size="sm" variant="outline" onClick={() => setText(EXAMPLE_FAKE)}>
              Fake News
            </Button>
            <Button size="sm" variant="outline" onClick={() => setText(EXAMPLE_GENUINE)}>
              Genuine News
            </Button>
          </div>
        </div>
        <Textarea
          placeholder="Paste a news article, Facebook post, or viral chain message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="bg-muted border-0 resize-y leading-relaxed"
        />
        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-xs text-muted-foreground">
            {counts.chars} characters, {counts.words} words
          </span>
          <Button onClick={handleAnalyze} disabled={loading} className="h-10 px-5">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Analyze
              </>
            )}
          </Button>
        </div>
      </section>

      {loading && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
          Running NLP analysis…
        </div>
      )}

      {result && (
        <div className="mt-10">
          <AnalysisResultView result={result} />
        </div>
      )}
    </div>
  );
}
