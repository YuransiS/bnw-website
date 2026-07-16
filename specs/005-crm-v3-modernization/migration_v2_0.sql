-- 1. Обновление ограничений на роли в таблице public.profiles
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'superman', 'founder', 'cell_leader', 'producer', 'rop', 'sales', 'expert', 'marketer', 'developer', 'pending'));

-- 2. Создание таблицы Ячеек (cells)
CREATE TABLE IF NOT EXISTS public.cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cell_leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Связывание проектов с ячейками и добавление финансовых настроек
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS cell_id UUID REFERENCES public.cells(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) DEFAULT 'UAH' CHECK (default_currency IN ('UAH', 'USD', 'EUR')),
ADD COLUMN IF NOT EXISTS revenue_model VARCHAR(20) DEFAULT '50_50' CHECK (revenue_model IN ('50_50', '70_30', 'FIX')),
ADD COLUMN IF NOT EXISTS expert_share_percent NUMERIC(5,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS fixed_fee_amount NUMERIC(12,2) DEFAULT 0.00;

-- 4. Создание таблицы Воронки (funnels)
CREATE TABLE IF NOT EXISTS public.funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    campaign_ids VARCHAR(255)[] DEFAULT '{}'::VARCHAR(255)[], -- Связанные названия/ID кампаний
    landing_slugs VARCHAR(255)[] DEFAULT '{}'::VARCHAR(255)[], -- Связанные страницы/лендинги
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Создание таблицы Задачи (tasks)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    funnel_id UUID REFERENCES public.funnels(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Создание таблицы Журнал переносов задач (task_logs)
CREATE TABLE IF NOT EXISTS public.task_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES public.profiles(id),
    old_due_date DATE NOT NULL,
    new_due_date DATE NOT NULL,
    postponement_reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Включение RLS для новых таблиц
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;

-- Создание политик безопасности RLS для cells
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cells' AND policyname = 'Allow all actions for authenticated'
    ) THEN
        CREATE POLICY "Allow all actions for authenticated" ON public.cells
            FOR ALL TO authenticated USING (true);
    END IF;
END
$$;

-- Создание политик безопасности RLS для funnels
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'funnels' AND policyname = 'Allow all actions for authenticated'
    ) THEN
        CREATE POLICY "Allow all actions for authenticated" ON public.funnels
            FOR ALL TO authenticated USING (true);
    END IF;
END
$$;

-- Создание политик безопасности RLS для tasks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tasks' AND policyname = 'Allow all actions for authenticated'
    ) THEN
        CREATE POLICY "Allow all actions for authenticated" ON public.tasks
            FOR ALL TO authenticated USING (true);
    END IF;
END
$$;

-- Создание политик безопасности RLS для task_logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'task_logs' AND policyname = 'Allow all actions for authenticated'
    ) THEN
        CREATE POLICY "Allow all actions for authenticated" ON public.task_logs
            FOR ALL TO authenticated USING (true);
    END IF;
END
$$;
