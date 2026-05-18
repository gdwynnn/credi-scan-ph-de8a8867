import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AnalysisResult } from "@/lib/analysis-types";

export const listMyAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AnalysisResult[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("analyses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      verdict: row.verdict as AnalysisResult["verdict"],
      confidence: row.confidence,
      summary: row.summary,
      reasoning: row.reasoning ?? undefined,
      risk_factors: (row.risk_factors as unknown as AnalysisResult["risk_factors"]) ?? [],
      highlighted_phrases:
        (row.highlighted_phrases as unknown as AnalysisResult["highlighted_phrases"]) ?? [],
      suggested_sources:
        (row.suggested_sources as unknown as AnalysisResult["suggested_sources"]) ?? [],
      input_text: row.input_text,
      input_url: row.input_url,
      created_at: row.created_at,
    }));
  });

export const deleteAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("analyses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
