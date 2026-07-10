-- v1.4 Migration & Optimization Script

-- 1. Add parent_lead_id to raw tables for incremental webhook updates
ALTER TABLE public.unified_orders ADD COLUMN IF NOT EXISTS parent_lead_id UUID REFERENCES public.unified_orders(id);
ALTER TABLE public.unified_customers ADD COLUMN IF NOT EXISTS parent_customer_id UUID REFERENCES public.unified_customers(id);

-- 2. Populate parent_lead_id using the current DSU clusters from crm_leads_cache
-- This script sets the parent_lead_id for all orders inside the same DSU cluster 
-- to be the first order_id in the order_ids array of that cluster.
DO $$
DECLARE
    cache_row RECORD;
    primary_order_id UUID;
    order_uuid UUID;
BEGIN
    FOR cache_row IN SELECT id, order_ids FROM public.crm_leads_cache WHERE order_ids IS NOT NULL AND jsonb_array_length(order_ids) > 0 LOOP
        -- The primary order for this cluster is the first one in the array
        primary_order_id := (cache_row.order_ids->>0)::UUID;
        
        -- Update all orders in this cluster to point to the primary_order_id
        FOR order_uuid IN SELECT jsonb_array_elements_text(cache_row.order_ids)::UUID LOOP
            IF order_uuid != primary_order_id THEN
                UPDATE public.unified_orders 
                SET parent_lead_id = primary_order_id 
                WHERE id = order_uuid AND parent_lead_id IS NULL;
            END IF;
        END LOOP;
    END LOOP;
END $$;


-- 3. Atomic Cache Patching (Direct Cache Patching)
CREATE OR REPLACE FUNCTION public.update_lead_status_atomic(
    p_order_id UUID, 
    p_project_id UUID, 
    p_new_status VARCHAR, 
    p_manager_comment TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Update the raw unified_orders table
    UPDATE public.unified_orders 
    SET status = p_new_status 
    WHERE id = p_order_id;
    
    -- Update unified_customers if manager_comment is provided
    IF p_manager_comment IS NOT NULL THEN
        UPDATE public.unified_customers uc
        SET manager_comment = p_manager_comment
        FROM public.unified_orders uo
        WHERE uo.customer_id = uc.id AND uo.id = p_order_id;
    END IF;

    -- 2. Update the crm_leads_cache table (Direct Patch)
    -- We need to check if the order belongs to a cluster (using order_ids array)
    UPDATE public.crm_leads_cache
    SET 
        status = p_new_status,
        manager_comment = COALESCE(p_manager_comment, manager_comment)
    WHERE project_id = p_project_id 
      AND order_ids @> to_jsonb(p_order_id);

    -- Note: If this was an incremental webhook, it would use parent_lead_id. 
    -- But for manual status updates, the cache row already contains the order_id.
END;
$$;


-- 4. Superman Global Hub RPC (Replacing JS In-Memory reduce)
CREATE OR REPLACE FUNCTION public.get_superman_summary()
RETURNS TABLE (
    project_id UUID,
    project_name VARCHAR,
    project_slug VARCHAR,
    spend NUMERIC,
    leads_count INT,
    cpl NUMERIC,
    usd_revenue NUMERIC,
    uah_revenue NUMERIC,
    eur_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH proj_spends AS (
        SELECT d.project_id, SUM(COALESCE(d.spend_usd, d.spend, 0)) as total_spend
        FROM public.daily_traffic_and_costs d
        GROUP BY d.project_id
    ),
    paid_orders AS (
        SELECT 
            o.project_id,
            COUNT(DISTINCT o.customer_id) as l_count,
            SUM(CASE WHEN LOWER(TRIM(COALESCE(o.metadata->>'currency', o.metadata->'lead'->>'currency', ''))) IN ('usd', '$') THEN o.amount ELSE 0 END) as usd_rev,
            SUM(CASE WHEN LOWER(TRIM(COALESCE(o.metadata->>'currency', o.metadata->'lead'->>'currency', ''))) IN ('uah', '₴') THEN o.amount ELSE 0 END) as uah_rev,
            SUM(CASE WHEN LOWER(TRIM(COALESCE(o.metadata->>'currency', o.metadata->'lead'->>'currency', ''))) IN ('eur', '€') THEN o.amount ELSE 0 END) as eur_rev
        FROM public.unified_orders o
        -- Exclude clicks
        WHERE o.status NOT IN ('Клик', 'КликФормы')
          AND o.amount > 0
          -- Exclude tripwires based on original_sheet (simplification of JS logic)
          AND NOT (
              COALESCE(o.metadata->>'original_sheet', o.metadata->'lead'->>'original_sheet', '') IN ('Практикум', 'Practicum_Leads', 'Заявки на практикум', 'Miні-курс')
              OR COALESCE(o.metadata->>'target_sheet', o.metadata->'lead'->>'target_sheet', '') IN ('Практикум', 'Practicum_Leads', 'Заявки на практикум', 'Miні-курс')
          )
        GROUP BY o.project_id
    ),
    total_leads AS (
        SELECT o.project_id, COUNT(DISTINCT o.customer_id) as total_customers
        FROM public.unified_orders o
        WHERE o.status NOT IN ('Клик', 'КликФормы')
        GROUP BY o.project_id
    )
    SELECT 
        p.id,
        p.name,
        p.slug,
        COALESCE(s.total_spend, 0) as spend,
        COALESCE(tl.total_customers, 0)::INT as leads_count,
        CASE WHEN COALESCE(tl.total_customers, 0) > 0 THEN COALESCE(s.total_spend, 0) / tl.total_customers ELSE 0 END as cpl,
        COALESCE(po.usd_rev, 0) as usd_revenue,
        COALESCE(po.uah_rev, 0) as uah_revenue,
        COALESCE(po.eur_rev, 0) as eur_revenue
    FROM public.projects p
    LEFT JOIN proj_spends s ON p.id = s.project_id
    LEFT JOIN paid_orders po ON p.id = po.project_id
    LEFT JOIN total_leads tl ON p.id = tl.project_id
    WHERE p.is_active = true
    ORDER BY usd_revenue DESC, uah_revenue DESC;
END;
$$;


-- 5. Producer Leaderboard RPC
CREATE OR REPLACE FUNCTION public.get_producers_leaderboard()
RETURNS TABLE (
    producer_id UUID,
    email VARCHAR,
    name VARCHAR,
    avatar_url VARCHAR,
    project_names TEXT,
    spend NUMERIC,
    leads_count INT,
    cpl NUMERIC,
    usd_revenue NUMERIC,
    uah_revenue NUMERIC,
    eur_revenue NUMERIC,
    blended_revenue NUMERIC,
    profit NUMERIC,
    roi NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Using EXECUTE ... USING internally if needed for dynamic date filtering in future, 
    -- but for standard leaderboard, static SQL is fine and safe from SQLi.
    RETURN QUERY
    WITH producer_projects AS (
        SELECT pp.profile_id, array_agg(pp.project_id) as proj_ids, string_agg(p.name, ', ') as proj_names
        FROM public.profile_projects pp
        JOIN public.projects p ON pp.project_id = p.id
        WHERE p.is_active = true
        GROUP BY pp.profile_id
    ),
    prod_spends AS (
        SELECT pp.profile_id, SUM(COALESCE(d.spend_usd, d.spend, 0)) as total_spend
        FROM producer_projects pp
        JOIN public.daily_traffic_and_costs d ON d.project_id = ANY(pp.proj_ids)
        GROUP BY pp.profile_id
    ),
    prod_orders AS (
        SELECT 
            pp.profile_id,
            COUNT(DISTINCT o.customer_id) as l_count,
            SUM(CASE WHEN LOWER(TRIM(COALESCE(o.metadata->>'currency', o.metadata->'lead'->>'currency', ''))) IN ('usd', '$') THEN o.amount ELSE 0 END) as usd_rev,
            SUM(CASE WHEN LOWER(TRIM(COALESCE(o.metadata->>'currency', o.metadata->'lead'->>'currency', ''))) IN ('uah', '₴') THEN o.amount ELSE 0 END) as uah_rev,
            SUM(CASE WHEN LOWER(TRIM(COALESCE(o.metadata->>'currency', o.metadata->'lead'->>'currency', ''))) IN ('eur', '€') THEN o.amount ELSE 0 END) as eur_rev
        FROM producer_projects pp
        JOIN public.unified_orders o ON o.project_id = ANY(pp.proj_ids)
        WHERE o.status NOT IN ('Клик', 'КликФормы')
          AND o.amount > 0
          AND status IN ('closed_won', 'Купив курс', 'Купив(-ла) Трипвайер')
        GROUP BY pp.profile_id
    ),
    prod_total_leads AS (
        SELECT pp.profile_id, COUNT(DISTINCT o.customer_id) as total_customers
        FROM producer_projects pp
        JOIN public.unified_orders o ON o.project_id = ANY(pp.proj_ids)
        WHERE o.status NOT IN ('Клик', 'КликФормы')
        GROUP BY pp.profile_id
    )
    SELECT 
        pr.id,
        pr.email::VARCHAR,
        COALESCE(pr.full_name, pr.email)::VARCHAR,
        COALESCE(pr.avatar_url, '')::VARCHAR,
        COALESCE(pp.proj_names, '—'),
        COALESCE(ps.total_spend, 0),
        COALESCE(ptl.total_customers, 0)::INT,
        CASE WHEN COALESCE(ptl.total_customers, 0) > 0 THEN COALESCE(ps.total_spend, 0) / ptl.total_customers ELSE 0 END,
        COALESCE(po.usd_rev, 0),
        COALESCE(po.uah_rev, 0),
        COALESCE(po.eur_rev, 0),
        (COALESCE(po.usd_rev, 0) + (COALESCE(po.uah_rev, 0) / 41.0) + (COALESCE(po.eur_rev, 0) * 1.08)) as blended,
        (COALESCE(po.usd_rev, 0) + (COALESCE(po.uah_rev, 0) / 41.0) + (COALESCE(po.eur_rev, 0) * 1.08)) - COALESCE(ps.total_spend, 0),
        CASE WHEN COALESCE(ps.total_spend, 0) > 0 THEN ((COALESCE(po.usd_rev, 0) + (COALESCE(po.uah_rev, 0) / 41.0) + (COALESCE(po.eur_rev, 0) * 1.08)) / ps.total_spend) * 100 ELSE 0 END
    FROM public.profiles pr
    JOIN producer_projects pp ON pr.id = pp.profile_id
    LEFT JOIN prod_spends ps ON pr.id = ps.profile_id
    LEFT JOIN prod_orders po ON pr.id = po.profile_id
    LEFT JOIN prod_total_leads ptl ON pr.id = ptl.profile_id
    WHERE pr.role = 'producer'
    ORDER BY blended DESC;
END;
$$;
