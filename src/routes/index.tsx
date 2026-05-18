import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AnalysisResultView } from "@/components/AnalysisResultView";
import { analyzeContent } from "@/lib/analyze.functions";
import { fetchUrlContent } from "@/lib/fetch-url.functions";
import type { AnalysisResult } from "@/lib/analysis-types";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({ component: Analyzer });

function Analyzer() {
  const analyze = useServerFn(analyzeContent);
  const fetchUrl = useServerFn(fetchUrlContent);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [save, setSave] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const runAnalysis = async (inputText: string, inputUrl: string | null) => {
    if (inputText.trim().length < 20) {
      toast.error("Please provide at least 20 characters of content to analyze.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await analyze({
        data: { text: inputText.trim(), url: inputUrl, save: save && !!userId, userId },
      });
      setResult(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUrlAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const fetched = await fetchUrl({ data: { url: url.trim() } });
      toast.success(`Fetched: ${fetched.title || "article"}`);
      await runAnalysis(fetched.text, fetched.url);
    } catch (e) {
      setLoading(false);
      toast.error(e instanceof Error ? e.message : "Could not fetch URL");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-3">
          <Sparkles className="h-3.5 w-3.5" /> NLP-Powered · Tuned for the Philippines
        </div>
        <h1 className="font-serif text-4xl md:text-5xl mb-3">Is this news real?</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Paste a news article, social media post, or chain message. CrediScan analyzes the language,
          flags deceptive patterns, and points you to trusted Philippine sources for verification.
        </p>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="text">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="text">Paste text</TabsTrigger>
            <TabsTrigger value="url">From URL</TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="space-y-4">
            <Textarea
              placeholder="Paste a news article, Facebook post, or viral message here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              className="resize-none font-serif"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Switch id="save" checked={save} onCheckedChange={setSave} disabled={!userId} />
                <Label htmlFor="save" className="text-xs text-muted-foreground">
                  {userId ? "Save to history" : "Sign in to save history"}
                </Label>
              </div>
              <Button onClick={() => runAnalysis(text, null)} disabled={loading || text.length < 20}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="url" className="space-y-4">
            <Input
              placeholder="https://www.example.com/news/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                We fetch the page, extract the article text, and analyze it.
              </p>
              <Button onClick={handleUrlAnalyze} disabled={loading || !url.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch & analyze"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {loading && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
          Running NLP analysis...
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
