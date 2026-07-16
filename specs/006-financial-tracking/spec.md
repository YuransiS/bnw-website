# Specification: CRM Premium Financial Subsystem (P&L & Cashflow)

This specification defines the interactive layout, interface rules, and database schema for the financial management subsystem.

## 1. UI Contexts & Entry Points

Financial transactions are recorded and managed at two hierarchical levels within a project:

### Context A: Global Project Workspace (Finance Tab)
- Located in the project dashboard tabs.
- Displays consolidated stats, P&L breakdown, accounts balance list, and the global transaction history.
- Allows recording transactions. You can:
  - **Bind to a specific marketing funnel** (via a select dropdown mapping active project funnels).
  - **Leave unbound (Global project expense)**.

### Context B: Specific Marketing Funnel View
- Located directly inside the management panel of a specific funnel.
- Allows adding expenses (such as ad spends) pre-bound to this funnel.
- Displays metrics (Revenue, Spend, ROI) restricted to this specific funnel.

---

## 2. Calculation Rules & Opex Splitting

To ensure correct ROI calculations:
1. **Direct Expenses:** Expenses bound to a specific funnel (`funnel_id IS NOT NULL`) are fully charged to that funnel.
2. **Distributed/Global Expenses:** Unbound project expenses (`funnel_id IS NULL`) are split and distributed **equally** among all active funnels of the project when displaying individual funnel ROIs.
3. **P&L Date Range:** General KPI cards (Total Income, Expenses, Margins) are aggregated over the selected date range on the server, while the timeline feed displays only the last 10-20 transactions with a "Показати ще" (Load More) pagination button.

---

## 3. Categories & Dynamic Presets

### Default Categories
- **Income (Прихід):** "Продаж продукту", "Доплата", "Дебіторка", "Інше".
- **Expense (Расход):** "Трафік / Реклама", "Команда / Підряд", "Сервіси", "Комісія платёжных систем", "Прочі витрати".

### Dynamic Custom Categories
- When creating a transaction, the user can select an existing category or click "Додати нову категорію" (Add Custom Category).
- Custom categories are saved to the database associated with the project and persist for future selections.

---

## 4. Updated Database Schema

### Table: `public.project_accounts`
- `id` (UUID, primary key)
- `project_id` (UUID references `projects(id) ON DELETE CASCADE`)
- `name` (TEXT)
- `currency` (TEXT)
- `starting_balance` (NUMERIC, default 0)
- `created_at` (TIMESTAMP)

### Table: `public.project_categories`
- `id` (UUID, primary key)
- `project_id` (UUID references `projects(id) ON DELETE CASCADE`)
- `name` (TEXT)
- `type` (TEXT) - `'income'` or `'expense'`
- `created_at` (TIMESTAMP)

### Table: `public.financial_transactions`
- `id` (UUID, primary key)
- `project_id` (UUID references `projects(id) ON DELETE CASCADE`)
- `funnel_id` (UUID references `funnels(id) ON DELETE SET NULL`) - optional binding to funnel
- `date` (DATE)
- `type` (TEXT) - `income` / `expense`
- `category` (TEXT)
- `description` (TEXT)
- `account_id` (UUID references `project_accounts(id) ON DELETE CASCADE`)
- `currency` (TEXT)
- `amount` (NUMERIC)
- `exchange_rate` (NUMERIC, default 1.0)
- `amount_usd` (NUMERIC)
- `created_by` (UUID references `profiles(id)`)
- `created_at` (TIMESTAMP)
