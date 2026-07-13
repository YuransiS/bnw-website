# Feature Specification: Cross-Project Analytics, Spend Sync & QA Debug Panel

**Feature Branch**: `004-cross-project-analytics`

**Created**: 2026-07-13

**Status**: Implemented (Reverse-Engineered, DB-level Aggregations Optimization Pending)

## User Scenarios & Testing

### User Story 1 - Central Superman Executive Dashboard (Priority: P1)
As a Superman (Executive Administrator), I want to see a unified financial overview of all active projects in the холдинг, showing revenue, expenses, CPL, and ROI in three currencies (USD, UAH, EUR).

**Why this priority**: Crucial executive dashboard used to allocate budgets and identify underperforming projects.

**Independent Test**: Log in as `superman`, verify the "Center of Management" tab shows a list of active experts, expenses, and calculated ROIs. Confirm the summary changes when filtering dates.

**Acceptance Scenarios**:
1. **Given** multiple active projects with expenses in `daily_traffic_and_costs` and success orders in `unified_orders`, **When** Superman opens the CRM dashboard, **Then** the UI shows aggregated revenue, CPL, and ROI per project.
2. **Given** orders in USD, EUR, and UAH, **When** calculating project revenue, **Then** all currencies are normal/supported and aggregated independently rather than losing exchange-rate values.

---

### User Story 2 - Operational Producer Leaderboard (Priority: P2)
As a Superman, I want to see a leaderboard of Operational Producers showing their total revenue, ROI, and an automated badge for the top producer of the month.

**Why this priority**: Motivates staff and highlights high-performing managers.

**Independent Test**: Load the "Лідери ОП" tab and verify the manager with the highest ROI receives the crown icon (leader of the month).

**Acceptance Scenarios**:
1. **Given** multiple producers managing different projects, **When** loading the leaders tab, **Then** metrics are calculated per producer based on their assigned projects, and the top producer gets the Leader of the Month crown.

---

### User Story 3 - Duplicate-Free Advertising Spend Sync (Priority: P1)
As a marketing analyst, I want Meta ad expenses to sync daily without duplicate expense logs or unique constraint errors.

**Why this priority**: Prevents duplicate records from inflating cost metrics and ruining ROI accuracy.

**Independent Test**: Trigger the spend sync cron function twice for the same date/campaign and verify that no duplicate entries or Postgres SQL index errors occur.

**Acceptance Scenarios**:
1. **Given** an existing cost record with date and campaign ID in `daily_traffic_and_costs`, **When** the spend sync runs again with updated costs, **Then** the record is updated (`upsert` on conflict `unique_daily_spend`) rather than duplicated or throwing errors.

---

### User Story 4 - QA Debug Panel for Admins (Priority: P2)
As a developer or administrator, I want to trace a client's journey, check system health anomalies, and profile database response times in real-time.

**Why this priority**: Enables diagnosing data mismatch issues and debugging server latency on the fly.

**Independent Test**: Turn on QA Debug Mode or log in as Superman, expand the debugging panel below the charts, and inspect performance metrics and visitor uuid journeys.

**Acceptance Scenarios**:
1. **Given** an admin user, **When** they scroll under the charts, **Then** the QA Debug Panel is rendered, displaying `clientRequestMs`, `dbFetchMs`, and a list of tracking anomalies.

## Requirements

### Functional Requirements
- **FR-001**: System MUST compute gross revenue, CPL, and ROI dynamically across active projects.
- **FR-002**: System MUST render an OP Leaderboard ranking managers by yield, marking the leader with a crown badge.
- **FR-003**: System MUST execute Meta Spend updates using SQL upserts relying on the `unique_daily_spend` constraint `(project_id, date, utm_source, campaign_id, ad_id)`.
- **FR-004**: System MUST aggregate UTM clicks and lead metrics on the database level using RPC functions to prevent CPU/RAM overhead in Node.js.
- **FR-005**: System MUST render a QA Debug Panel for Supermen or dev environments, showing network latencies and tracking diagnostics.

### Key Entities
- **Daily Traffic & Costs**: Database table `daily_traffic_and_costs` containing campaign-level spends and traffic clicks counts.
- **RPC Metrics**: PostgreSQL functions returning structured rows of campaigns, leads, and financials.

## Success Criteria

### Measurable Outcomes
- **SC-001**: Financial summaries for 5+ projects are computed and returned in < 300ms using RPC functions.
- **SC-002**: Spend sync runs without causing Postgres index violations.
