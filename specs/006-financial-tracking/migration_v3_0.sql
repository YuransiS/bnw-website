-- 1. Alter projects table to add baseline financial parameters
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS contract_model TEXT DEFAULT '50/50_profit',
ADD COLUMN IF NOT EXISTS target_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS traffic_budget_plan NUMERIC DEFAULT 0;

-- 2. Create project accounts table
CREATE TABLE IF NOT EXISTS public.project_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'UAH',
    starting_balance NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on accounts table
ALTER TABLE public.project_accounts ENABLE ROW LEVEL SECURITY;

-- 3. Create project custom categories table
CREATE TABLE IF NOT EXISTS public.project_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, name, type)
);

-- Enable RLS on categories table
ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;

-- 4. Create financial transactions table
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    description TEXT,
    account_id UUID NOT NULL REFERENCES public.project_accounts(id) ON DELETE CASCADE,
    currency TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    exchange_rate NUMERIC NOT NULL DEFAULT 1.0,
    amount_usd NUMERIC NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on transactions table
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security (RLS) Policies

-- project_accounts: Select policy
CREATE POLICY select_project_accounts ON public.project_accounts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      p.role IN ('admin', 'superman', 'founder', 'developer')
      OR EXISTS (
        SELECT 1 FROM public.profile_projects pp
        WHERE pp.profile_id = p.id AND pp.project_id = project_accounts.project_id
      )
      OR EXISTS (
        SELECT 1 FROM public.projects proj
        JOIN public.cells c ON c.id = proj.cell_id
        WHERE proj.id = project_accounts.project_id AND c.cell_leader_id = p.id
      )
    )
  )
);

-- project_accounts: Mutation policy
CREATE POLICY write_project_accounts ON public.project_accounts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      p.role IN ('admin', 'superman', 'founder', 'developer')
      OR EXISTS (
        SELECT 1 FROM public.profile_projects pp
        WHERE pp.profile_id = p.id AND pp.project_id = project_accounts.project_id
      )
    )
  )
);

-- project_categories: Select policy
CREATE POLICY select_project_categories ON public.project_categories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      p.role IN ('admin', 'superman', 'founder', 'developer')
      OR EXISTS (
        SELECT 1 FROM public.profile_projects pp
        WHERE pp.profile_id = p.id AND pp.project_id = project_categories.project_id
      )
      OR EXISTS (
        SELECT 1 FROM public.projects proj
        JOIN public.cells c ON c.id = proj.cell_id
        WHERE proj.id = project_categories.project_id AND c.cell_leader_id = p.id
      )
    )
  )
);

-- project_categories: Mutation policy
CREATE POLICY write_project_categories ON public.project_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      p.role IN ('admin', 'superman', 'founder', 'developer')
      OR EXISTS (
        SELECT 1 FROM public.profile_projects pp
        WHERE pp.profile_id = p.id AND pp.project_id = project_categories.project_id
      )
    )
  )
);

-- financial_transactions: Select policy
CREATE POLICY select_financial_transactions ON public.financial_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      p.role IN ('admin', 'superman', 'founder', 'developer')
      OR EXISTS (
        SELECT 1 FROM public.profile_projects pp
        WHERE pp.profile_id = p.id AND pp.project_id = financial_transactions.project_id
      )
      OR EXISTS (
        SELECT 1 FROM public.projects proj
        JOIN public.cells c ON c.id = proj.cell_id
        WHERE proj.id = financial_transactions.project_id AND c.cell_leader_id = p.id
      )
    )
  )
);

-- financial_transactions: Mutation policy
CREATE POLICY write_financial_transactions ON public.financial_transactions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      p.role IN ('admin', 'superman', 'founder', 'developer')
      OR EXISTS (
        SELECT 1 FROM public.profile_projects pp
        WHERE pp.profile_id = p.id AND pp.project_id = financial_transactions.project_id
      )
    )
  )
);
