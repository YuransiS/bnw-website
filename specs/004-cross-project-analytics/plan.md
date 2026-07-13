# Implementation Plan: Cross-Project Analytics, Spend Sync & QA Debug Panel

**Branch**: `004-cross-project-analytics` | **Date**: 2026-07-13 | **Spec**: [specs/004-cross-project-analytics/spec.md](file:///c:/BnW_Prod/bnw-website/specs/004-cross-project-analytics/spec.md)

## Summary
Optimize financial aggregations by migrating Node.js in-memory summaries to PostgreSQL RPC functions. Enforce unique index constraints in the advertising spend synchronizer, and embed a comprehensive QA debugging suite in the analytics container.

## Technical Context
- **Language/Version**: TypeScript / SQL (PostgreSQL 14+)
- **Primary Dependencies**: `recharts`, `supabase`
- **Storage**: Supabase PostgreSQL (tables: `daily_traffic_and_costs`, `unified_orders`, `unified_customers`)
- **Testing**: Manual query profiling, console tracing
- **Constraints**: BigQuery SQL/RPC response times must remain below 300ms.

## Constitution Check
- **Centralized Server-Side Caching**: ✅ UTM click maps and cost metrics are resolved on the DB level using SQL RPC functions rather than loading raw lists into Node.js.
- **SaaS Minimalist UI**: ✅ Recharts area and bar charts use slate/zinc variables, simple grids, and clean tooltips.

## Project Structure

### Documentation
```text
specs/004-cross-project-analytics/
├── spec.md              # Requirements specification
└── plan.md              # Implementation plan (this file)
```

### Source Code
```text
src/
├── app/
│   ├── api/
│   │   └── sync-spend/
│   │       └── route.ts         # Meta Spend Sync webhook / cron receiver
│   └── admin/
│       ├── LeadsDashboard.tsx   # Contains the tab selectors
│       ├── BwMainDashboard.tsx  # Admin dashboard for bw_main
│       ├── actions.ts           # Server actions (getUnifiedCRMData, traceVisitorUuidAction)
│       └── LeadsDashboard/
│           └── tabs/
│               ├── ManagementTab.tsx # Global Hub (revenue, ROI, multi-currency support)
│               ├── LeadersTab.tsx    # Producer rankings and OP of the month
│               └── AnalyticsTab.tsx  # Charts & QA Debug Panel
```

## Implementation Details

### 1. Database-Level SQL RPC Aggregations
- **`get_projects_summary()`**: Joins active projects, orders, and daily costs, returning revenue per currency, leads, and ROI.
- **`get_campaigns_summary()`**: Agrees ROI metrics per UTM campaign while ignoring designated tripwire sources.
- **Meta Spend Sync UNIQUE Constraint**:
  - Unique index `unique_daily_spend` is applied to columns `(project_id, date, utm_source, campaign_id, ad_id)`.
  - The synchronization routine performs an `.upsert(payload, { onConflict: 'project_id,date,utm_source,campaign_id,ad_id' })` to prevent duplicates.

### 2. QA Debug Panel
- Implemented inside `AnalyticsTab.tsx`.
- Displays stopwatch metrics:
  - `clientRequestMs`: Latency roundtrip for client-action invocation.
  - `dbFetchMs`: Latency of database SQL querying inside Server Actions.
  - `cacheRebuildMs`: Duration of caching builds.
- Diagnostic check features a tracking tool using a Server Action `traceVisitorUuidAction` to trace logs and timeline records.

## Verification Plan

### Automated & Database Tests
- Run `select * from public.get_projects_summary();` to verify financial totals.
- Inspect network requests: Confirm payload size does not exceed 100KB.
