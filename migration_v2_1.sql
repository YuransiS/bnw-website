-- v2.1 Migration Script: Funnel ID, Indexes, and Daily Aggregation Cache
-- Run this in your Supabase SQL Editor

-- 1. Add funnel_id to unified_orders table
ALTER TABLE public.unified_orders 
ADD COLUMN IF NOT EXISTS funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL;

-- 2. Add funnel_id to daily_traffic_and_costs table
ALTER TABLE public.daily_traffic_and_costs 
ADD COLUMN IF NOT EXISTS funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL;

-- 3. Create composite index on daily_traffic_and_costs (project_id, funnel_id, date)
CREATE INDEX IF NOT EXISTS idx_daily_traffic_project_funnel_date 
ON public.daily_traffic_and_costs (project_id, funnel_id, date);

-- 4. Create composite index on unified_orders (project_id, funnel_id, created_at, status)
CREATE INDEX IF NOT EXISTS idx_unified_orders_project_funnel_created 
ON public.unified_orders (project_id, funnel_id, created_at, status);


-- 5. Create project_daily_analytics_cache table
CREATE TABLE IF NOT EXISTS public.project_daily_analytics_cache (
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    spend_usd NUMERIC DEFAULT 0,
    spend_uah NUMERIC DEFAULT 0,
    spend_eur NUMERIC DEFAULT 0,
    clicks INT DEFAULT 0,
    impressions INT DEFAULT 0,
    leads_count INT DEFAULT 0,
    sales_count INT DEFAULT 0,
    revenue_usd NUMERIC DEFAULT 0,
    revenue_uah NUMERIC DEFAULT 0,
    revenue_eur NUMERIC DEFAULT 0,
    PRIMARY KEY (project_id, date, funnel_id)
);

-- 6. Function to recalculate a specific day's metrics
CREATE OR REPLACE FUNCTION public.recalculate_daily_analytics_cache(
    p_project_id UUID,
    p_funnel_id UUID,
    p_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_spend_usd NUMERIC := 0;
    v_spend_uah NUMERIC := 0;
    v_spend_eur NUMERIC := 0;
    v_clicks INT := 0;
    v_impressions INT := 0;
    v_leads_count INT := 0;
    v_sales_count INT := 0;
    v_revenue_usd NUMERIC := 0;
    v_revenue_uah NUMERIC := 0;
    v_revenue_eur NUMERIC := 0;
BEGIN
    -- Aggregated daily costs
    SELECT 
        COALESCE(SUM(spend_usd), 0),
        COALESCE(SUM(spend_uah), 0),
        COALESCE(SUM(spend_eur), 0),
        COALESCE(SUM(clicks), 0),
        COALESCE(SUM(impressions), 0)
    INTO 
        v_spend_usd, v_spend_uah, v_spend_eur, v_clicks, v_impressions
    FROM public.daily_traffic_and_costs
    WHERE project_id = p_project_id 
      AND date = p_date
      AND (funnel_id = p_funnel_id OR (funnel_id IS NULL AND p_funnel_id IS NULL));

    -- Aggregated daily leads & revenue
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN status IN ('closed_won', 'approved', 'aprooved', 'оплачено', 'купив курс', 'купив_курс', 'купив трипвайєр', 'купив трипвайер', 'купив(-ла) трипвайер', 'оплачено полностью') THEN 1 END),
        COALESCE(SUM(CASE WHEN status IN ('closed_won', 'approved', 'aprooved', 'оплачено', 'купив курс', 'купив_курс', 'купив трипвайєр', 'купив трипвайер', 'купив(-ла) трипвайер', 'оплачено полностью') THEN COALESCE((metadata->>'usd_amount')::NUMERIC, amount) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status IN ('closed_won', 'approved', 'aprooved', 'оплачено', 'купив курс', 'купив_курс', 'купив трипвайєр', 'купив трипвайер', 'купив(-ла) трипвайер', 'оплачено полностью') THEN COALESCE((metadata->>'uah_amount')::NUMERIC, amount * 41) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status IN ('closed_won', 'approved', 'aprooved', 'оплачено', 'купив курс', 'купив_курс', 'купив трипвайєр', 'купив трипвайер', 'купив(-ла) трипвайер', 'оплачено полностью') THEN COALESCE((metadata->>'eur_amount')::NUMERIC, amount * 1.08) ELSE 0 END), 0)
    INTO 
        v_leads_count, v_sales_count, v_revenue_usd, v_revenue_uah, v_revenue_eur
    FROM public.unified_orders
    WHERE project_id = p_project_id 
      AND DATE(created_at) = p_date
      AND (funnel_id = p_funnel_id OR (funnel_id IS NULL AND p_funnel_id IS NULL));

    -- Upsert into cache
    INSERT INTO public.project_daily_analytics_cache (
        project_id, funnel_id, date,
        spend_usd, spend_uah, spend_eur, clicks, impressions,
        leads_count, sales_count, revenue_usd, revenue_uah, revenue_eur
    )
    VALUES (
        p_project_id, p_funnel_id, p_date,
        v_spend_usd, v_spend_uah, v_spend_eur, v_clicks, v_impressions,
        v_leads_count, v_sales_count, v_revenue_usd, v_revenue_uah, v_revenue_eur
    )
    ON CONFLICT (project_id, date, funnel_id)
    DO UPDATE SET
        spend_usd = EXCLUDED.spend_usd,
        spend_uah = EXCLUDED.spend_uah,
        spend_eur = EXCLUDED.spend_eur,
        clicks = EXCLUDED.clicks,
        impressions = EXCLUDED.impressions,
        leads_count = EXCLUDED.leads_count,
        sales_count = EXCLUDED.sales_count,
        revenue_usd = EXCLUDED.revenue_usd,
        revenue_uah = EXCLUDED.revenue_uah,
        revenue_eur = EXCLUDED.revenue_eur;
END;
$$;

-- 7. Triggers to automatically call recalculation on orders/costs updates
CREATE OR REPLACE FUNCTION public.trigger_refresh_daily_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recalculate_daily_analytics_cache(
            OLD.project_id,
            OLD.funnel_id,
            COALESCE(OLD.date, DATE(OLD.created_at))
        );
    ELSE
        PERFORM public.recalculate_daily_analytics_cache(
            NEW.project_id,
            NEW.funnel_id,
            COALESCE(NEW.date, DATE(NEW.created_at))
        );
        -- If project_id, funnel_id, or date changed, recalculate the old day as well
        IF TG_OP = 'UPDATE' AND (
            OLD.project_id != NEW.project_id OR 
            COALESCE(OLD.funnel_id, '00000000-0000-0000-0000-000000000000'::uuid) != COALESCE(NEW.funnel_id, '00000000-0000-0000-0000-000000000000'::uuid) OR 
            COALESCE(OLD.date, DATE(OLD.created_at)) != COALESCE(NEW.date, DATE(NEW.created_at))
        ) THEN
            PERFORM public.recalculate_daily_analytics_cache(
                OLD.project_id,
                OLD.funnel_id,
                COALESCE(OLD.date, DATE(OLD.created_at))
            );
        END IF;
    END IF;
    RETURN NULL;
END;
$$;

-- Drop triggers if they exist to prevent duplication errors
DROP TRIGGER IF EXISTS trg_refresh_analytics_costs ON public.daily_traffic_and_costs;
DROP TRIGGER IF EXISTS trg_refresh_analytics_orders ON public.unified_orders;

CREATE TRIGGER trg_refresh_analytics_costs
AFTER INSERT OR UPDATE OR DELETE ON public.daily_traffic_and_costs
FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_daily_analytics();

CREATE TRIGGER trg_refresh_analytics_orders
AFTER INSERT OR UPDATE OR DELETE ON public.unified_orders
FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_daily_analytics();
