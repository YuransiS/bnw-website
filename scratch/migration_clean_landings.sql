-- SQL Migration to clean and standardize landing URLs in unified_orders
-- Can be run in the Supabase SQL Editor

-- 1. Create or replace URL cleaning helper function
CREATE OR REPLACE FUNCTION public.fn_clean_url(raw_url text)
RETURNS text AS $$
DECLARE
  cleaned text;
BEGIN
  IF raw_url IS NULL OR raw_url = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove query parameters
  cleaned := raw_url;
  IF position('?' in cleaned) > 0 THEN
    cleaned := substring(cleaned from 1 for position('?' in cleaned) - 1);
  END IF;
  
  -- Remove hash fragment
  IF position('#' in cleaned) > 0 THEN
    cleaned := substring(cleaned from 1 for position('#' in cleaned) - 1);
  END IF;

  -- Strip protocol
  cleaned := regexp_replace(cleaned, '^https?://', '', 'i');
  
  -- Strip www.
  cleaned := regexp_replace(cleaned, '^www\.', '', 'i');
  
  -- Strip trailing slash
  cleaned := regexp_replace(cleaned, '/+$', '');
  
  -- Convert to lowercase and trim
  cleaned := lower(trim(cleaned));
  
  -- Standardize domains (Vercel preview subdomains, aliases)
  -- Face Detox previews
  IF cleaned LIKE 'facedetox-%.vercel.app%' THEN
    cleaned := 'facedetox.vercel.app' || substring(cleaned from position('.vercel.app' in cleaned) + 11);
  END IF;
  
  -- Pix AI previews
  IF cleaned LIKE 'pix-%.vercel.app%' THEN
    cleaned := 'pix-ai-ua.vercel.app' || substring(cleaned from position('.vercel.app' in cleaned) + 11);
  END IF;

  -- Clean-klinom previews
  IF cleaned LIKE 'clean-klinom-%.vercel.app%' THEN
    cleaned := 'clean-klinom.vercel.app' || substring(cleaned from position('.vercel.app' in cleaned) + 11);
  END IF;

  -- Aliases: svetlanatape -> svitlanatape
  IF cleaned LIKE 'svetlanatape.vercel.app%' THEN
    cleaned := 'svitlanatape.vercel.app' || substring(cleaned from position('svetlanatape.vercel.app' in cleaned) + 23);
  END IF;
  
  RETURN 'https://' || cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Fix project ID crossover: clean-klinom URLs synced to Svitlana
UPDATE public.unified_orders
SET project_id = 'a8374d9e-5678-1234-abcd-ef0123456789'
WHERE project_id = 'c9876e4c-1234-4567-89ab-cdef01234567'
  AND (
    page_url ILIKE '%clean-klinom%' 
    OR metadata->>'page_url' ILIKE '%clean-klinom%' 
    OR metadata->>'pageUrl' ILIKE '%clean-klinom%'
  );

-- 3. Clean and standardize existing page_url column values
UPDATE public.unified_orders
SET page_url = public.fn_clean_url(page_url)
WHERE page_url IS NOT NULL AND page_url != '';

-- Also clean page_url in metadata JSONB if it exists
UPDATE public.unified_orders
SET metadata = jsonb_set(
  metadata, 
  '{page_url}', 
  to_jsonb(public.fn_clean_url(metadata->>'page_url'))
)
WHERE metadata->>'page_url' IS NOT NULL AND metadata->>'page_url' != '';

UPDATE public.unified_orders
SET metadata = jsonb_set(
  metadata, 
  '{pageUrl}', 
  to_jsonb(public.fn_clean_url(metadata->>'pageUrl'))
)
WHERE metadata->>'pageUrl' IS NOT NULL AND metadata->>'pageUrl' != '';

-- 4. Backfill empty page_url values based on sheet metadata
-- A. Victoria Project
UPDATE public.unified_orders
SET page_url = CASE 
  WHEN metadata->>'original_sheet' = 'Практикум' THEN 'https://victoria-mc.vercel.app/practicum'
  WHEN metadata->>'original_sheet' = 'VSL 1 етап' THEN 'https://victoria-mc.vercel.app/free-lection'
  WHEN metadata->>'original_sheet' = 'VSL Форма' THEN 'https://victoria-mc.vercel.app/free-lection/vsl-form'
  WHEN metadata->>'original_sheet' = 'Бронювання' THEN 'https://victoria-mc.vercel.app/price'
  ELSE 'https://victoria-mc.vercel.app'
END
WHERE project_id = 'b526cfcf-2856-43b9-a299-65239e0f6c27'
  AND (page_url IS NULL OR page_url = '');

-- B. Sofia Project
UPDATE public.unified_orders
SET page_url = CASE 
  WHEN metadata->>'target_sheet' = 'Заявки на практикум' OR metadata->>'original_sheet' = 'Заявки на практикум' THEN 'https://sofifinsight.vercel.app/price'
  WHEN metadata->>'target_sheet' = 'Заявки на інтенсив' THEN 'https://sofifinsight.vercel.app/intensive'
  WHEN metadata->>'original_sheet' = 'Лиды Вебинар' THEN 'https://sofifinsight.vercel.app/web'
  WHEN metadata->>'original_sheet' = 'Заявки на урок' THEN 'https://sofifinsight.vercel.app/sofia-invest/lesson'
  WHEN metadata->>'original_sheet' IN ('VSL Трафик', 'VLS Урок') THEN 'https://sofifinsight.vercel.app/sofia-invest'
  WHEN metadata->>'original_sheet' = 'Анкети після уроку' THEN 'https://sofifinsight.vercel.app/sofia-invest/lesson'
  ELSE 'https://sofifinsight.vercel.app'
END
WHERE project_id = 'd4bf0cb1-b851-460d-85fa-80df4fcf85c7'
  AND (page_url IS NULL OR page_url = '');

-- C. Valeria Project
UPDATE public.unified_orders
SET page_url = CASE 
  WHEN metadata->>'original_sheet' = 'Practicum_Leads' THEN 'https://pix-ai-ua.vercel.app/office'
  ELSE 'https://pix-ai-ua.vercel.app'
END
WHERE project_id = '16bcdebf-4375-450a-8bf8-ff7d9b99616e'
  AND (page_url IS NULL OR page_url = '');

-- D. Svitlana Project
UPDATE public.unified_orders
SET page_url = CASE 
  WHEN metadata->>'original_sheet' IN ('Заявки ленд Веб', 'ВЕБ (бот)', 'новый веб') THEN 'https://svitlana3web.vercel.app'
  ELSE 'https://svitlanatape.vercel.app'
END
WHERE project_id = 'c9876e4c-1234-4567-89ab-cdef01234567'
  AND (page_url IS NULL OR page_url = '');

-- 5. Backfill page_path based on page_url path component
UPDATE public.unified_orders
SET page_path = CASE 
  WHEN page_url LIKE '%/practicum%' THEN '/practicum'
  WHEN page_url LIKE '%/free-lection/vsl-form%' THEN '/free-lection/vsl-form'
  WHEN page_url LIKE '%/free-lection%' THEN '/free-lection'
  WHEN page_url LIKE '%/price%' THEN '/price'
  WHEN page_url LIKE '%/intensive%' THEN '/intensive'
  WHEN page_url LIKE '%/web%' THEN '/web'
  WHEN page_url LIKE '%/sofia-invest/lesson%' THEN '/sofia-invest/lesson'
  WHEN page_url LIKE '%/sofia-invest%' THEN '/sofia-invest'
  WHEN page_url LIKE '%/minicourse%' THEN '/minicourse'
  WHEN page_url LIKE '%/office%' THEN '/office'
  WHEN page_url LIKE '%/moms%' THEN '/moms'
  WHEN page_url LIKE '%/beauty%' THEN '/beauty'
  WHEN page_url LIKE '%/teen%' THEN '/teen'
  WHEN page_url LIKE '%/parents%' THEN '/parents'
  ELSE '/'
END
WHERE page_path IS NULL OR page_path = '' OR page_path = '/';
