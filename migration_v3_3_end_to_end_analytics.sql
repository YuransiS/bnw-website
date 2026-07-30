-- v3.3 Migration Script: Enterprise End-to-End Analytics, Offer/Promo Attribution, and Project Isolation
-- Run this in your Supabase SQL Editor

-- 1. Add offer_id, promo_id, query_params to traffic_clicks
ALTER TABLE public.traffic_clicks
ADD COLUMN IF NOT EXISTS offer_id TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS promo_id TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS query_params JSONB DEFAULT '{}'::jsonb;

-- 2. Add offer_id, promo_id, query_params to unified_orders
ALTER TABLE public.unified_orders
ADD COLUMN IF NOT EXISTS offer_id TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS promo_id TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS query_params JSONB DEFAULT '{}'::jsonb;

-- 3. Create high-performance enterprise composite indexes
CREATE INDEX IF NOT EXISTS idx_traffic_clicks_proj_visitor ON public.traffic_clicks (project_id, visitor_uuid, created_at);
CREATE INDEX IF NOT EXISTS idx_traffic_clicks_proj_offer ON public.traffic_clicks (project_id, offer_id);
CREATE INDEX IF NOT EXISTS idx_unified_orders_proj_offer ON public.unified_orders (project_id, offer_id);
CREATE INDEX IF NOT EXISTS idx_unified_orders_proj_promo ON public.unified_orders (project_id, promo_id);
CREATE INDEX IF NOT EXISTS idx_unified_orders_visitor ON public.unified_orders (visitor_uuid, created_at);

-- 4. Enterprise High-Speed RPC Function for Project-Isolated Journey Tracing
CREATE OR REPLACE FUNCTION public.get_customer_journey_scoped(
    p_project_id UUID DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_visitor_uuid UUID DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_limit INT DEFAULT 100
)
RETURNS TABLE (
    event_id UUID,
    event_type TEXT,
    project_id UUID,
    status TEXT,
    amount NUMERIC,
    page_path TEXT,
    page_url TEXT,
    offer_id TEXT,
    promo_id TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    query_params JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH customer_orders AS (
        SELECT 
            uo.id as event_id,
            'order'::text as event_type,
            uo.project_id,
            uo.status::text,
            uo.amount,
            uo.page_path::text,
            uo.page_url::text,
            COALESCE(uo.offer_id, uo.metadata->>'offer_id', uo.metadata->>'o', '')::text as offer_id,
            COALESCE(uo.promo_id, uo.metadata->>'promo_id', uo.metadata->>'p', '')::text as promo_id,
            uo.utm_source::text,
            uo.utm_medium::text,
            uo.utm_campaign::text,
            uo.utm_content::text,
            uo.utm_term::text,
            COALESCE(uo.query_params, '{}'::jsonb) as query_params,
            COALESCE(uo.metadata, '{}'::jsonb) as metadata,
            uo.created_at
        FROM public.unified_orders uo
        WHERE (p_project_id IS NULL OR uo.project_id = p_project_id)
          AND (
              (p_customer_id IS NOT NULL AND uo.customer_id = p_customer_id)
              OR (p_visitor_uuid IS NOT NULL AND uo.visitor_uuid = p_visitor_uuid)
          )
    ),
    customer_clicks AS (
        SELECT 
            tc.id as event_id,
            'click'::text as event_type,
            tc.project_id,
            tc.status::text,
            0.00::numeric as amount,
            tc.page_path::text,
            tc.page_url::text,
            COALESCE(tc.offer_id, tc.metadata->>'offer_id', tc.metadata->>'o', '')::text as offer_id,
            COALESCE(tc.promo_id, tc.metadata->>'promo_id', tc.metadata->>'p', '')::text as promo_id,
            tc.utm_source::text,
            tc.utm_medium::text,
            tc.utm_campaign::text,
            tc.utm_content::text,
            tc.utm_term::text,
            COALESCE(tc.query_params, '{}'::jsonb) as query_params,
            COALESCE(tc.metadata, '{}'::jsonb) as metadata,
            tc.created_at
        FROM public.traffic_clicks tc
        WHERE (p_project_id IS NULL OR tc.project_id = p_project_id)
          AND (p_visitor_uuid IS NOT NULL AND tc.visitor_uuid = p_visitor_uuid)
    )
    SELECT * FROM customer_orders
    UNION ALL
    SELECT * FROM customer_clicks
    ORDER BY created_at ASC
    LIMIT p_limit;
END;
$$;
