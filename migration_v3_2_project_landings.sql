-- v3.2 Migration Script: Dynamic Project Landings & URL Parameter Tracking
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.project_landings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    path TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'free', -- 'free' | 'paid' | 'quiz' | 'thank_you' | 'other'
    parameters JSONB NOT NULL DEFAULT '[]'::jsonb,
    badge_color TEXT DEFAULT 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_ping_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_project_path UNIQUE (project_id, path)
);

CREATE INDEX IF NOT EXISTS idx_project_landings_project_id ON public.project_landings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_landings_path ON public.project_landings(path);

-- Enable RLS
ALTER TABLE public.project_landings ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'project_landings' AND policyname = 'Allow public read project_landings'
    ) THEN
        CREATE POLICY "Allow public read project_landings" ON public.project_landings
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'project_landings' AND policyname = 'Allow service role all project_landings'
    ) THEN
        CREATE POLICY "Allow service role all project_landings" ON public.project_landings
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
