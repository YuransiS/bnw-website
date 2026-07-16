-- B&W CRM v3.1 Modernization - Migration v2.1
-- Role Pruning & Constraints Update

-- 1. Migrate old roles to new roles
UPDATE public.profiles SET role = 'founder' WHERE role IN ('superman', 'admin');
UPDATE public.profiles SET role = 'pending' WHERE role IN ('rop', 'sales', 'expert', 'marketer', 'manager');

-- 2. Update check constraint on role column
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('founder', 'cell_leader', 'producer', 'developer', 'pending'));
