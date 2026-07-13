<!--
Sync Impact Report:
- Version change: none -> v1.0.0
- List of modified principles:
  - PRINCIPLE 1 -> I. SaaS Minimalist UI
  - PRINCIPLE 2 -> II. Centralized Server-Side Caching (Shadow Swap)
  - PRINCIPLE 3 -> III. Row Level Security & RBAC Enforcement
  - PRINCIPLE 4 -> IV. Identity Stitching & Unified Analytics
  - PRINCIPLE 5 -> V. Direct Cache Patching
- Added sections: Technology Stack & Standards, Development & Testing Workflows
- Removed sections: None
- Templates requiring updates:
  - ✅ plan-template.md
  - ✅ spec-template.md
  - ✅ tasks-template.md
- Follow-up TODOs: None
-->

# B&W CRM Constitution

## Core Principles

### I. SaaS Minimalist UI
Deliver premium, slate/zinc monochrome visual interfaces. Leverages 21st.dev Shadcn-compatible components and Tailwind CSS instead of drafting intricate animations or elements from scratch. Transitions and micro-interactions must feel responsive and clean. Avoid chaotic neon gradients or excess visual noise. Maintain light/dark themes saved to local storage.

### II. Centralized Server-Side Caching (Shadow Swap)
Heavy data processing, transitive DSU (Disjoint Set Union) graph traversals, and multi-currency metrics aggregation MUST NOT be performed in Node.js on-the-fly inside page renders or Server Actions. Data must be aggregated on the database level and synchronized to `crm_leads_cache`. Rebuilding this cache must use a staging table to allow an atomic shadow-swap without zero-data downtime, triggered asynchronously by Upstash QStash.

### III. Row Level Security & RBAC Enforcement
Enforce Supabase Row Level Security (RLS) policies at the database level. Application controllers and Next.js layout structures must strictly verify user roles (`superman` / `admin`, `producer`, `rop`, `sales`, `pending`). Access is blocked for any user with the `pending` role. Ensure special isolation for the `bw_main` project, which restricts access even for Supermen unless explicitly permitted.

### IV. Identity Stitching & Unified Analytics
Implement robust client-side session telemetry tracking visitor_uuid, UTM tags, and navigation paths. A server-side Lead Stitching algorithm must join incoming submissions to a unified customer profile based on normalized phone or social media handles. Avoid false positives by blacklisting template phone numbers and generic telegram handles.

### V. Direct Cache Patching
When an operator modifies a lead status or currency inside the Kanban board or database grids, the system must perform a Direct Cache Patch directly to the cache tables. The UI must reflect the updated state immediately rather than waiting for the next background QStash/cron re-caching cycle.

## Technology Stack & Standards

- **Framework**: Next.js (App Router, Server Actions)
- **Database & Auth**: Supabase (PostgreSQL, Auth, Row Level Security)
- **Deployment**: Vercel Serverless Platform
- **Asynchronous Tasking**: Upstash QStash for background jobs
- **Styling**: Tailwind CSS with Slate/Zinc SaaS Minimalism
- **Data Querying**: API routes support HTTP QUERY (RFC 10008) with POST override fallback (`X-HTTP-Method-Override`)

## Development & Testing Workflows

- **Test Cleanup**: Automatic nightly testing data cleanup via `nightly-crm-test-cleanup` pg_cron job in Supabase to purge mock data containing 'test', 'Gemini', 'Antigravity', etc.
- **Performance Profiling**: Mandatory QA Debug Panel displaying performance metrics (`clientRequestMs`, `dbFetchMs`, `cacheRebuildMs`) to prevent performance regression.
- **Complexity Guard**: Do not write monolithic components; split page views into modular tabs and sub-components to optimize re-renders.

## Governance
This constitution is the supreme authority on coding standards, system boundaries, and architectural patterns. All future features must be specified and planned in compliance with these principles. Any amendments require a version increment (MAJOR.MINOR.PATCH) and updates to all templates.

**Version**: 1.0.0 | **Ratified**: 2026-07-13 | **Last Amended**: 2026-07-13
