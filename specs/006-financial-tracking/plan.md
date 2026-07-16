# Implementation Plan: CRM Premium Financial Subsystem

This plan details the technical steps to build and integrate the interactive P&L and Cashflow tracking module.

## Technical Architecture

### 1. Database Migrations (migration_v3_0.sql)
- **Tables:** Create `project_accounts`, `project_categories`, and `financial_transactions`.
- **Alterations:**
  - Add `contract_model`, `target_currency`, and `traffic_budget_plan` columns to `projects`.
  - Add `funnel_id` optional foreign key reference to `financial_transactions` mapping.
- **Seed Data:** Seed starting accounts (WayForPay, PayPal, FОП-1) for project Sofia to match the spreadsheet mock data.
- **RLS & Security Policies:**
  - Read access allowed for `founder`, `developer`, assigned cell leaders, and assigned producers.
  - Write access allowed for `founder`, `developer`, and assigned producers.

---

### 2. Backend Server Actions
Create a new file `src/app/admin/(dashboard)/project/financeActions.ts` or append to `src/app/admin/actions.ts`:
- **`getFinanceSummary(projectId, startDate, endDate)`**:
  - Fetches project settings, accounts, and transactions.
  - Aggregates income vs opex to build P&L data dynamically.
  - Calculates starting balance + incomes - expenses to determine current balances.
- **`createTransaction(payload)`**: Inserts a transaction record, precalculating the USD value using exchange rates.
- **`updateTransaction(id, payload)`**
- **`deleteTransaction(id)`**
- **`createCustomCategory(projectId, name, type)`**: Inserts a custom category into `project_categories` to save presets.

---

### 3. Interactive UI Components & Wizard Modal
We will add a parent tab **"Фінанси"** (Finance) in `LeadsDashboard/index.tsx`. The interface will consist of:
- **Quick-Add Wizard Modal (`AddTransactionModal.tsx`):**
  - Animated step-by-step modal.
  - Select transaction type (Income/Expense).
  - Badge buttons for quick category presets (including custom options).
  - Badge selectors for project accounts and funnel bindings.
  - Numeric input field for amounts and custom exchange rate.
- **Visual Analytics Dashboard (`FinanceDashboardTab.tsx`):**
  - Custom visual cards featuring glowing colored borders (emerald for income, rose for costs, amber/zinc for net profit).
  - Concentric or radial SVG progress tracker for the advertising traffic budget.
  - Visual visual contract profit split board.
- **Cashflow Timeline Feed (`CashflowFeed.tsx`):**
  - Replaces dense tables with a modern feed.
  - Category icon badges (e.g. `Megaphone`, `UserCheck`, `CreditCard`) representing transaction records.
- **Directories and Settings Panel:** Easy configuration of accounts and project split ratios.

---

### 4. Quality Guardrails & Performance
- All calculations are processed on the server to prevent CPU overhead on low-end client devices.
- Cashflow calculations use integer multiplication/division (stored as decimals in Postgres) to prevent floating-point precision issues.
