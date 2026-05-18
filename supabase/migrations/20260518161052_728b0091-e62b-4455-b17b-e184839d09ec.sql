
CREATE TABLE public.analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  input_url TEXT,
  verdict TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  summary TEXT NOT NULL,
  reasoning TEXT,
  risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  highlighted_phrases JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses or anonymous ones"
  ON public.analyses FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Anyone can insert analyses"
  ON public.analyses FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON public.analyses FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_analyses_user_id_created_at ON public.analyses(user_id, created_at DESC);
