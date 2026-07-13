# Implementation Plan: User Authentication & Role-Based Access Control (RBAC)

**Branch**: `001-auth-rbac` | **Date**: 2026-07-13 | **Spec**: [specs/001-auth-rbac/spec.md](file:///c:/BnW_Prod/bnw-website/specs/001-auth-rbac/spec.md)

## Summary
Implement a secure gateway using Next.js App Router middleware, Supabase Auth, and Row-Level Security (RLS) policies. Access levels are managed dynamically via roles mapped in a database-level profile schema.

## Technical Context
- **Language/Version**: TypeScript / Next.js 15+ (App Router)
- **Primary Dependencies**: `@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`
- **Storage**: Supabase PostgreSQL (tables: `profiles`, `profile_projects`)
- **Testing**: Manual testing, RLS policy validation scripts
- **Constraints**: Security boundary checked at edge/middleware layer to block unapproved access.

## Constitution Check
- **SaaS Minimalist UI**: ✅ Settings and login UI are built using slate/zinc colors and simple layouts.
- **RLS & RBAC Enforcement**: ✅ Implemented at database level with PostgreSQL triggers and server-side checks.

## Project Structure

### Documentation
```text
specs/001-auth-rbac/
├── spec.md              # Requirements specification
└── plan.md              # Implementation plan (this file)
```

### Source Code
```text
src/
├── app/
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx        # Login page (Google OAuth & Auth)
│   │   ├── pending/
│   │   │   └── page.tsx        # Pending state roadblock page
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx      # Dashboard layout protecting paths
│   │   │   ├── Sidebar.tsx     # Dynamic sidebar with RBAC filtering
│   │   │   └── settings/
│   │   │       ├── page.tsx    # Superman-only settings routing
│   │   │       └── SettingsForm.tsx # User management UI
│   │   └── actions.ts          # Server Actions
```

## Implementation Details

### 1. Database Schema & Policies
- **Trigger `on_auth_user_created`**: Automates role assignment to `pending` upon OAuth signup or traditional email registration.
- **Row Level Security (RLS)**:
  - Enabled on `profiles` and `profile_projects`.
  - Policies allow read access to active operators and restrict update permissions strictly to Service Role / Supermen.

### 2. Frontend Guards & Layout Redirections
- **Dashboard Layout Guard**: Checks the session on server rendering. If `profiles.role` is `pending`, redirects the client immediately to `/admin/pending`.
- **Project Filtering**: Reads `profile_projects` and filters out the `vova_win` project from the sidebar list unless the user is explicitly authorized.
- **bw_main Guard**: Restricts access to main telemetry metrics from non-assigned profiles.

## Verification Plan

### Manual Verification
- Register a test account: Verify redirect to `/admin/pending`.
- Change role in Supabase dashboard to `sales`: Verify visibility of permitted projects only.
- Navigate to `/admin/settings` as a `sales` user: Verify that a redirection or access block is enforced.
