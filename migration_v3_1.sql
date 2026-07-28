-- v3.1 Migration Script: Funnels End Dates, Plan Metrics, and Custom Stages
-- Run this in your Supabase SQL Editor

-- 1. Add end_date column
ALTER TABLE public.funnels 
ADD COLUMN IF NOT EXISTS end_date DATE;

-- 2. Add planned_revenue column
ALTER TABLE public.funnels 
ADD COLUMN IF NOT EXISTS planned_revenue NUMERIC DEFAULT 0;

-- 3. Add planned_spend column
ALTER TABLE public.funnels 
ADD COLUMN IF NOT EXISTS planned_spend NUMERIC DEFAULT 0;

-- 4. Add stages column for custom customer journey paths
ALTER TABLE public.funnels 
ADD COLUMN IF NOT EXISTS stages JSONB DEFAULT '[]'::jsonb;

-- 5. Backfill existing funnels stages from description meta string if possible
DO $$
DECLARE
    f RECORD;
    meta_stages TEXT;
    stages_arr TEXT[];
    stages_json JSONB;
BEGIN
    FOR f IN SELECT id, description FROM public.funnels WHERE description LIKE '%[Stages:%' LOOP
        -- Extract the substring inside [Stages: ...]
        meta_stages := substring(f.description from '\[Stages:\s*([^\]]+)\]');
        IF meta_stages IS NOT NULL AND meta_stages != '' THEN
            -- Convert comma-separated string to text array
            stages_arr := string_to_array(meta_stages, ',');
            -- Convert text array to JSONB array of strings
            stages_json := to_jsonb(stages_arr);
            
            UPDATE public.funnels
            SET stages = stages_json
            WHERE id = f.id;
        END IF;
    END LOOP;
END $$;
