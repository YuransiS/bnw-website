# Feature Specification: CRM Leads Dashboard UI & Interactions

**Feature Branch**: `003-leads-dashboard`

**Created**: 2026-07-13

**Status**: Implemented (Reverse-Engineered, Frontend Modularization Pending)

## User Scenarios & Testing

### User Story 1 - Kanban Pipeline Drag & Drop (Priority: P1)
As a sales manager, I want to drag leads between stages on a Kanban board to update their deal status instantly.

**Why this priority**: Core workflow tool for sales departments. Must be quick and intuitive.

**Independent Test**: Drag a client card from "Новий" to "В роботі" on the Kanban tab. Verify the card stays in place, a spinner appears briefly, and the database status updates.

**Acceptance Scenarios**:
1. **Given** a lead card in the Kanban view, **When** dragged to "В роботі", **Then** the system sends a Server Action to update `sales_status` in Supabase.
2. **Given** a lead with a payment status change in its database cluster, **When** the Kanban board loads, **Then** it automatically routes to the "Оплачено" or "Відмова" column based on the payment success.

---

### User Story 2 - Advanced Multi-Filter Search with URL Sync (Priority: P1)
As a marketer or salesperson, I want to search and filter leads by source sheets, date ranges, niche, and intent, and share the filtered URL with my colleagues.

**Why this priority**: Enables sharing specific cohorts (such as lost checkout intents) instantly across teams.

**Independent Test**: Enter search text, select a niche filter, copy the browser URL, open it in a new tab, and verify the same filters are pre-loaded.

**Acceptance Scenarios**:
1. **Given** selected filters on the leads page, **When** state changes, **Then** the URL query string is updated to match.
2. **Given** a visitor URL with parameters like `?status=unpaid_intent&search=John`, **When** the page loads, **Then** the leads grid and search boxes are pre-populated, and the database query is filtered.

---

### User Story 3 - Dynamic Questionnaire Parser (Priority: P2)
As a sales agent, I want to see detailed diagnostic questionnaire responses (Ankety) for each lead without writing custom code for every new form or question.

**Why this priority**: Speeds up lead qualification by showing direct goals, difficulties, and readiness to buy.

**Independent Test**: Select a lead in the Questionnaire (Ankety) tab. Verify that the answers in `raw_payload` (JSONB) are extracted and displayed with friendly Ukrainian labels.

**Acceptance Scenarios**:
1. **Given** a lead with questionnaire answers in `raw_payload`, **When** viewed in the master-detail panel, **Then** keys like `purpose`, `difficulties`, and `readiness` are mapped to labels like "Мета", "Складнощі", and "Готовність".
2. **Given** a lead from Victoria project, **When** loading the Questionnaire tab, **Then** only the permitted "rozbir" and "VSL-форма" questionnaire structures are displayed.

### Edge Cases
- **Zero Currency States**: In financial metrics or buttons, values default to UAH (₴) and hide empty fields to reduce visual clutter.
- **Unpaid Intent Cold Filter**: Identifies leads that started the checkout process or viewed payment pages but do not have a successful payment transaction recorded in their cluster.

## Requirements

### Functional Requirements
- **FR-001**: Dashboard MUST implement a modular tab structure: Center of Management (Superman), Leaders of OP (Superman), Analytics, Kanban Board, Leads Database, Questionnaires (Ankety), and Payment Buttons.
- **FR-002**: Kanban columns MUST support HTML5 drag and drop using `@dnd-kit/core`.
- **FR-003**: System MUST synchronize search keywords, niche selectors, sheet sources, and status filters with the URL query string.
- **FR-004**: System MUST parse `raw_payload` dynamically to extract form fields and map them to Ukrainian labels in the Questionnaire view.
- **FR-005**: System MUST implement a `unpaid_intent` status filter mapping clients with checkout entries but no success payment records.

### Key Entities
- **Kanban Board**: UI model divided into columns representing sales stages (`Новий`, `В роботі`, `Думає`, `Ждемо оплату`, `Оплачено`, `Відмова`).
- **Questionnaire Profile**: Object representing dynamically parsed user responses from `raw_payload`.

## Success Criteria

### Measurable Outcomes
- **SC-001**: State changes (search input, filters) reflect in the URL query string instantly.
- **SC-002**: Dragging a Kanban card triggers API persistence in < 300ms.
