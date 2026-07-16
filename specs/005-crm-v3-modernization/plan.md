# Implementation Plan: CRM v3.1 Modernization (Phase 1)

**Branch**: `005-crm-v3-modernization` | **Date**: 2026-07-15 | **Spec**: [specs/005-crm-v3-modernization/spec.md](file:///c:/BnW_Prod/bnw-website/specs/005-crm-v3-modernization/spec.md)

## Summary

This plan details the technical transition for **Phase 1 (v2.0)** of the CRM modernization. It establishes the database schema for organizational cells, implements the new roles (`founder`, `cell_leader`, `expert`, `marketer`, `developer`), introduces the `funnels` configuration schema, and replaces the flat dashboard page with a nested routing folder structure under Next.js App Router.

---

## Technical Context

- **Language/Version**: TypeScript / Next.js 15+ (App Router)
- **Database**: Supabase PostgreSQL
- **Key Tables**: `public.cells` (New), `public.projects` (Modified), `public.funnels` (New), `public.profiles` (Roles expanded), `public.tasks` (New), `public.task_logs` (New)
- **Routing**: Next.js App Router nested folder routing replacing flat searchParams switching.

---

## Project Structure

### Documentation & Migrations
```text
specs/005-crm-v3-modernization/
├── spec.md              # Requirements specification
├── plan.md              # Implementation plan (this file)
└── migration_v2_0.sql   # SQL script for database updates
```

### Source Code
```text
src/
└── app/
    └── admin/
        └── (dashboard)/
            ├── page.tsx                 # Dynamic router based on user role
            ├── founder/
            │   └── page.tsx             # Level 1: Founder dashboard
            ├── cell/
            │   └── [cellId]/
            │       └── page.tsx         # Level 2: Cell Leader dashboard
            └── project/
                └── [projectId]/
                    ├── page.tsx         # Level 3: Project dashboard (tabs inside)
                    ├── tasks/
                    │   └── page.tsx     # Level 3 Tasks: Tasks list & anti-sabotage logs
                    └── funnel/
                        └── [funnelId]/
                            └── page.tsx # Level 4: Funnel deep dive
```

---

## Implementation Details

### Step 1: Database Migration (`migration_v2_0.sql`)
1. Create `public.cells` table mapping cells to `cell_leader_id` (`public.profiles.id`).
2. Add `cell_id` to `public.projects`.
3. Add financial parameters to `public.projects` (defaults: `UAH` currency, `50_50` revenue model, `50.00%` expert share, `0.00` fixed fee).
4. Create `public.funnels` table with project reference, start date, campaign_ids text[], landing_slugs text[], description.
5. Create `public.tasks` and `public.task_logs` tables. Enforce RLS.

### Step 2: Expand Role Mappings
1. Update `src/app/admin/actions.ts` (`getSessionAndAccess`, `checkProjectAccess`) to support the new roles: `founder`, `cell_leader`, `expert`, `marketer`, and `developer`.
2. Expand the sidebar impersonation roles array and update the role-label mapping logic in `src/app/admin/(dashboard)/Sidebar.tsx`.

### Step 3: Implement Nested Pages & Dynamic Redirects
1. **Dynamic Router (`src/app/admin/(dashboard)/page.tsx`)**:
   - Resolve user profile and role on load.
   - If role is `founder` or `superman` or `admin` ➔ Redirect to `/admin/founder`.
   - If role is `cell_leader` ➔ Fetch their `cell_id` and redirect to `/admin/cell/[cellId]`.
   - If role is `producer` or other project-level roles ➔ Fetch their first permitted project.
     - **Special Redirect Check**: If the user has exactly **one allowed project**, skip selection/list views and redirect directly to `/admin/project/[projectId]`.
2. **Founder Dashboard (`src/app/admin/(dashboard)/founder/page.tsx`)**:
   - Renders the global analytics center (former "Hub" tab) and leaderboard metrics.
3. **Cell Leader Dashboard (`src/app/admin/(dashboard)/cell/[cellId]/page.tsx`)**:
   - Renders cell metrics summary, projects assigned to the cell, and compared performance.
4. **Project Dashboard (`src/app/admin/(dashboard)/project/[projectId]/page.tsx`)**:
   - Refactors the project view, integrating individual project tabs (leads database, kanban, paylinks, analytics) into a single page context.
   - Renders **Funnels configuration tab**: creates a new funnel, selects date, links campaign_ids, and selects landing pages.

---

## Verification Plan

### Database verification
- Execute the migration queries inside `migration_v2_0.sql` using Supabase MCP `apply_migration`.
- Verify columns on `projects` and structure on `cells` and `funnels` tables.

### Manual UI Verification
- Log in and impersonate roles (`founder`, `cell_leader`, `expert`, `marketer`) and verify correct routing redirects:
  - `founder` ➔ `/admin/founder`
  - `cell_leader` ➔ `/admin/cell/[cellId]`
  - `producer` (with 1 project) ➔ directly to `/admin/project/[projectId]`
- Test that a `cell_leader` cannot view projects outside their assigned cell.
