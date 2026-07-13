# Feature Specification: CRM Leads Database, DSU Clustering & Server-Side Cache

**Feature Branch**: `002-leads-cache-dsu`

**Created**: 2026-07-13

**Status**: Implemented (Reverse-Engineered)

## User Scenarios & Testing

### User Story 1 - Unified Customer Profile via DSU Stitching (Priority: P1)
As a sales manager, I want to see a single client card with their entire history of page views, forms, and transactions combined, even if they filled them out on different landing pages with different details.

**Why this priority**: Prevents sales agents from calling the same person multiple times and gives them full context on the customer's journey.

**Independent Test**: Create two separate leads: Lead A with phone `+380931112233` and visitor_uuid `UUID-A`, and Lead B with the same phone and visitor_uuid `UUID-B`. Verify that both leads are grouped into a single DSU cluster with a shared history.

**Acceptance Scenarios**:
1. **Given** two leads sharing the same phone number or telegram handle, **When** the database cache is built, **Then** they are merged under a single unified cluster.
2. **Given** a lead with a blacklisted phone like `1111111` or telegram `test`, **When** the DSU runs, **Then** they are NOT merged to prevent false positives.

---

### User Story 2 - Instant Dashboard Load via Centralized Cache (Priority: P1)
As an operator, I want the dashboard to load under 200ms without freeze states, even with tens of thousands of historical leads.

**Why this priority**: In-memory clustering on heavy page loads freezes the UI and causes browser memory crashes.

**Independent Test**: Load the Leads Dashboard and verify the response size and fetch time on the QA Debug panel.

**Acceptance Scenarios**:
1. **Given** a project with 10,000 leads, **When** an operator filters leads, **Then** the server returns pre-computed cache records via the HTTP QUERY route in under 150ms.

---

### User Story 3 - Shadow-Swap Database Swapping (Priority: P2)
As a system administrator, I want cache updates to run asynchronously in the background without locking tables or showing empty lists to active operators.

**Why this priority**: Avoids data downtime or read-locks during long cache recalculation cycles.

**Independent Test**: Trigger a cache rebuild while continuously refreshing the leads grid. Verify that no empty screens or missing records occur.

**Acceptance Scenarios**:
1. **Given** an active cache update, **When** records are computed, **Then** they are inserted into a staging table, and an atomic SQL function swaps the staging table with the active cache table.

---

### User Story 4 - Automated Test Data Purge (Priority: P2)
As a developer, I want all mock test leads containing 'QA', 'Gemini', or 'test' to be cleaned up nightly, keeping the production database clean.

**Why this priority**: Prevents test runs from polluting real financial analytics and leaderboard reports.

**Independent Test**: Create a lead with name `QA Test Lead` and verify it is deleted after running the `clean_up_test_records` procedure.

**Acceptance Scenarios**:
1. **Given** a scheduled pg_cron job at 01:00 UTC, **When** it executes, **Then** all tables are searched for test masks, mock records are deleted, and the cache queue is marked dirty.

### Edge Cases
- **Transactions without `order_id`**: Grouped and de-duplicated by comparing the timestamp and sum within a 30-minute window to prevent duplicate invoicing counts.
- **Upstash QStash webhook validation**: Webhooks for rebuilding the cache must verify signature headers to block anonymous triggering.

## Requirements

### Functional Requirements
- **FR-001**: System MUST cluster leads into sets sharing normalized `phone`, `telegram`, `email`, or `visitor_uuid`.
- **FR-002**: System MUST ignore empty/template strings and blacklisted telephone sequences in DSU computations.
- **FR-003**: System MUST execute the cache rebuild asynchronously using Upstash QStash to bypass Vercel serverless execution limits.
- **FR-004**: System MUST perform cache swaps atomically in PostgreSQL.
- **FR-005**: System MUST map payment statuses (e.g., WayForPay transaction events) to three normalized statuses: `closed_won`, `declined`, or `pending`.
- **FR-006**: System MUST run pg_cron nightly cleanups to delete records matching test masks.

### Key Entities
- **Lead Cache (`crm_leads_cache`)**: Persistent pre-computed records with flattened client profiles, UTM histories, and payment indicators.
- **Staging Cache**: Parallel staging table used to populate new data before the atomic swap.

## Success Criteria

### Measurable Outcomes
- **SC-001**: Page loads and lead searches return in < 150ms.
- **SC-002**: 0% data loss/empty dashboards during active cache regenerations.
- **SC-003**: 100% of testing leads matching database masks are purged nightly.
