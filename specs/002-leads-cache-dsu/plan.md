# Implementation Plan: CRM Leads Database, DSU Clustering & Server-Side Cache

**Branch**: `002-leads-cache-dsu` | **Date**: 2026-07-13 | **Spec**: [specs/002-leads-cache-dsu/spec.md](file:///c:/BnW_Prod/bnw-website/specs/002-leads-cache-dsu/spec.md)

## Summary
Migrate heavy in-memory JS clustering logic to database-level pre-aggregations. Leverage pg_cron, Upstash QStash, and custom database functions (`swap_crm_leads_cache`) to implement non-blocking cache generation and atomic staging swaps.

## Technical Context
- **Language/Version**: TypeScript / SQL (PostgreSQL 14+)
- **Primary Dependencies**: `@upstash/qstash`, `supabase`
- **Storage**: Supabase PostgreSQL (tables: `victoria_leads`, `unified_orders`, `unified_customers`, `crm_leads_cache`, `daily_traffic_and_costs`)
- **Testing**: Upstash QStash log verification, SQL triggers profiling
- **Constraints**: Vercel execution timeout limits (<10 seconds). Database connection pool limit guards in parallel loops.

## Constitution Check
- **Centralized Server-Side Caching**: ✅ Heavy calculations offloaded from Next.js server runtime to PostgreSQL tables and asynchronous jobs.
- **Direct Cache Patching**: ✅ Operations such as status changes direct-patch the active cache immediately for instant UI feedback.

## Project Structure

### Documentation
```text
specs/002-leads-cache-dsu/
├── spec.md              # Requirements specification
└── plan.md              # Implementation plan (this file)
```

### Source Code
```text
src/
├── app/
│   ├── api/
│   │   ├── crm/
│   │   │   ├── leads/
│   │   │   │   └── route.ts         # Query router supporting HTTP QUERY & POST override
│   │   │   └── rebuild-cache/
│   │   │       └── route.ts         # QStash Webhook consumer for cache rebuilds
│   └── admin/
│       └── actions.ts               # Server actions (getUnifiedCRMData, traceVisitorUuidAction)
├── lib/
│   ├── statusMapper.ts              # Normalizes status fields (declined, closed_won, pending)
│   └── crmCache.ts                  # Cache management and DSU calculations
```

## Implementation Details

### 1. DSU Clustering and De-duplication Logic
- **DSU Graph Solver**: Groups items sharing common nodes (phone, social, email, visitor_uuid).
- **Ignored Lists**: Prevents merging on empty values or template lists (e.g. `'1234567'`, `'0000000'`, `'test'`, `'none'`).
- **30-Minute Transaction Window**: Transactions without an `order_id` are grouped if they share amount, project, and customer in a 30-minute window, selecting the successful status.

### 2. Upstash QStash & Shadow Swap Pipeline
- **Cron Rebuild Queue**: Upstash QStash initiates a webhook to `/api/crm/rebuild-cache` carrying project info.
- **Shadow Swap SQL**:
  1. Writes computed caches into `crm_leads_cache_staging`.
  2. Runs transaction-bound SQL to rename/swap `crm_leads_cache_staging` with the active `crm_leads_cache`.
  3. Ensures continuous read performance without tables locking.

### 3. Automated pg_cron Cleanup
- **`public.clean_up_test_records()`**: Triggers daily in Supabase at 01:00 UTC.
- Deletes records matching `test`, `tests`, `qa`, `q&a`, `gemini`, `antigravity`, `user` from all target project tables.
- Marks cache dirty to enqueue QStash rebuild.

## Verification Plan

### Automated & Database Tests
- Execute `select public.clean_up_test_records();` and verify deletion counts.
- Run QStash test request in Vercel logs and check rebuild completion logs.
