# CRM & Lead Tracking Architecture (Victoria Project Blueprint)

This document provides a comprehensive, 1-to-1 production-ready technical blueprint of the CRM integration, tracking analytics, and Admin Dashboard data pipelines. It details the PostgreSQL database schema, client-side session loggers, lead stitching algorithms, and the complete architecture of the CRM Admin Panel (visual grids, filters, Kanban, and analytics).

---

## 🧭 System Topology & CRM Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Browser Client
    participant API as Next.js API Routes
    participant DB as Supabase (victoria_leads)
    participant Admin as Admin Panel Dashboard

    %% Flow 1: Client Ingestion
    User->>Client: Visits Landing Page
    Client->>Client: Initialize visitor_id (UUID) & parse UTMs
    Client->>API: POST /api/analytics/log (Visitor ID + Session data)
    API->>DB: Save session event (Status: "Клик")
    
    %% Flow 2: Ingestion & Lead Stitching
    User->>Client: Submits Contact Form
    Client->>API: POST /api/lead (Lead payload + visitor_id)
    Note over API: Stitches UUID: checks DB for matches on normalized phone/social
    API->>DB: Search existing visitor_uuid by phone
    DB-->>API: Returns resolved visitor_uuid (if matched)
    API->>DB: Insert lead details (Status: "Зареєстровано")

    %% Flow 3: Admin UI Retrieval & Aggregation
    Admin->>API: POST /api/admin/data
    API->>DB: Query all raw leads & traffic logs
    DB-->>API: Return rows
    Note over Admin: DSU Cluster: Groups duplicate rows via matching phone/social/UUIDs
    Note over Admin: Calculates conversions, segments UAH/USD revenues & filters views
    Admin->>User: Renders Kanban Board, Leads Grid & Recharts Analytics
```

---

## 1. 🗄️ Database Layer: Supabase & PostgreSQL Schema

All marketing leads, payment attempts, and customer interactions are stored inside the `victoria_leads` table under the public schema. 

### 1.1 Table Definition (DDL)

This schema supports persistent visitor identifiers (`visitor_uuid`), UTM parameters tracking, pricing amounts, payment status tracking, and raw payloads storage for telemetry auditing.

```sql
-- DDL for victoria_leads
create table if not exists public.victoria_leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text,
  phone text,
  social text,
  instagram text,
  niche text,
  amount numeric default 0,
  status text default 'Зареєстровано',
  is_free boolean default true,
  order_id text,
  sheet_id text,
  target_sheet text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  page_path text,
  page_url text,
  visitor_uuid uuid,
  raw_payload jsonb
);

-- Crucial indexes for sub-second search, stitching, and order lookups
create index if not exists victoria_leads_visitor_uuid_idx on public.victoria_leads (visitor_uuid);
create index if not exists victoria_leads_phone_idx on public.victoria_leads (phone);
create index if not exists victoria_leads_order_id_idx on public.victoria_leads (order_id);

-- Enable Row Level Security (RLS)
alter table public.victoria_leads enable row level security;

-- Client RLS Policies: Allow client-side static forms to perform inserts using the Supabase anon key
create policy "Allow anonymous inserts" on public.victoria_leads
  for insert to anon with check (true);

-- Backend RLS Policies: Full read/write capability restricted to verified backend (service_role) keys
create policy "Allow all actions for authenticated" on public.victoria_leads
  for all to authenticated using (true);
```

### 1.2 Unified CRM Replication (B&W Analytics Sync)

To unify cross-project analytics across different funnels, the database table uses an automated trigger (`trg_sync_victoria_lead`) to replicate customer profiles and telemetry orders in real-time to centralized schemas.

*   **`unified_customers`**: De-duplicates clients on `phone`, `email`, or `telegram` identifiers within the Victoria project scope (`b526cfcf-2856-43b9-a299-65239e0f6c27`), protecting customer ownership boundaries.
*   **`unified_orders`**: Appends all order and conversion histories linked back to the customer profile.

---

## 2. 🌐 Client-Side Telemetry Tracking

The React `Analytics` tracking component ensures that unique device signatures and UTM identifiers are preserved throughout the user session and loaded on all layouts.

### 2.1 Analytics Provider (`src/components/Analytics.tsx`)

This component implements:
1.  **UUID Generation**: Generates a secure `visitor_id` stored in `localStorage` on first load.
2.  **Double UTM Catching**: Saves the first UTM set (`first_utms`) dynamically if not present, and continuously updates the last UTM set (`last_utms`) upon landing.
3.  **Step Logging**: Appends the last 50 visited routes to a `journey` timeline to mitigate localStorage bloat.
4.  **Automatic Ping**: Sends a payload to the backend telemetry route `/api/analytics/log`.

```typescript
'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';

export interface UtmTags {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

const AnalyticsInner = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Resolve Unique Visitor UUID
    let visitorId = localStorage.getItem('visitor_id');
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem('visitor_id', visitorId);
    }

    // 2. Extract and Store UTM Parameters
    const utms: UtmTags = {};
    const utmKeys: (keyof UtmTags)[] = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    
    let hasUtms = false;
    utmKeys.forEach(key => {
      const value = searchParams.get(key);
      if (value) {
        utms[key] = value;
        hasUtms = true;
      }
    });

    if (hasUtms) {
      localStorage.setItem('last_utms', JSON.stringify(utms));
      if (!localStorage.getItem('first_utms')) {
        localStorage.setItem('first_utms', JSON.stringify(utms));
      }
    }

    // 3. Update Session Journey Navigation Log (Cap at 50 nodes)
    const journeyRaw = localStorage.getItem('journey');
    let journey: { path: string; timestamp: string }[] = journeyRaw ? JSON.parse(journeyRaw) : [];
    if (journey.length > 50) journey = journey.slice(-50);
    
    journey.push({ path: pathname, timestamp: new Date().toISOString() });
    localStorage.setItem('journey', JSON.stringify(journey));

    // 4. Capture Client Identity State
    const savedName = localStorage.getItem('lead_name');
    const savedPhone = localStorage.getItem('lead_phone');
    const savedSocial = localStorage.getItem('lead_social');
    const uuid = localStorage.getItem('lead_uuid');

    // 5. Fire Asynchronous Non-Blocking Telemetry Log
    fetch('/api/analytics/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        uuid,
        path: pathname,
        name: savedName,
        phone: savedPhone,
        social: savedSocial,
        utms: hasUtms ? utms : JSON.parse(localStorage.getItem('last_utms') || '{}')
      })
    }).catch(() => {});
  }, [searchParams, pathname]);

  return null;
};

export const Analytics = () => (
  <Suspense fallback={null}>
    <AnalyticsInner />
  </Suspense>
);
```

---

## 3. ⚡ Serverless Lead Ingestion & Stitching Engine

This core endpoint handles contact registration and implements the **Lead Stitching Algorithm**. When a lead submits a phone number, the endpoint checks Supabase for earlier leads matching that phone. If found, it stitches the new submission to the existing `visitor_uuid`, building a cohesive history for multi-step conversions.

```typescript
// src/app/api/lead/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

// Helper: Normalize phone numbers into Ukraine/International E.164-like standards
function cleanPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10 && cleaned.startsWith("0")) {
    cleaned = "38" + cleaned;
  }
  if (cleaned.length === 11 && cleaned.startsWith("80")) {
    cleaned = "38" + cleaned.substring(1);
  }
  return cleaned;
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { name, phone, social, niche, instagram } = data;

    const utms = {
      utm_source: data.utm_source || 'direct',
      utm_medium: data.utm_medium || '-',
      utm_campaign: data.utm_campaign || '-',
      utm_content: data.utm_content || '-',
      utm_term: data.utm_term || '-',
    };

    // --- LEAD STITCHING ALGORITHM ---
    const clientUuid = data.visitor_id || data.visitorId || null;
    const phoneOrSocial = phone || social || '';
    const isPhone = phoneOrSocial && !phoneOrSocial.startsWith('@') && phoneOrSocial.replace(/\D/g, '').length >= 7;
    const normalizedPhone = isPhone ? cleanPhone(phoneOrSocial) : phoneOrSocial;

    let resolvedUuid = clientUuid;

    if (normalizedPhone) {
      try {
        // Query the database to see if we've seen this contact details before
        const { data: existingLeads } = await supabaseAdmin
          .from("victoria_leads")
          .select("visitor_uuid")
          .eq("phone", normalizedPhone)
          .not("visitor_uuid", "is", null)
          .order("created_at", { ascending: true })
          .limit(1);

        if (existingLeads && existingLeads.length > 0) {
          resolvedUuid = existingLeads[0].visitor_uuid;
          console.log(`[Stitch] Re-mapped visitor ${clientUuid} -> ${resolvedUuid} via phone ${normalizedPhone}`);
        }
      } catch (e: any) {
        console.error("[Stitch] Exception error:", e.message);
      }
    }

    if (!resolvedUuid) resolvedUuid = crypto.randomUUID();

    const dbPayload = {
      name: name || null,
      phone: normalizedPhone || null,
      social: social || null,
      instagram: instagram || null,
      niche: niche || null,
      amount: 0,
      status: 'Зареєстровано',
      is_free: true,
      utm_source: utms.utm_source,
      utm_medium: utms.utm_medium,
      utm_campaign: utms.utm_campaign,
      utm_content: data.utm_content || '',
      utm_term: data.utm_term || '',
      target_sheet: data.target_sheet || null,
      sheet_id: data.sheet_id || null,
      page_path: data.page_path || '',
      page_url: data.full_url || '',
      visitor_uuid: resolvedUuid,
      raw_payload: data
    };

    const { data: inserted, error: dbErr } = await supabaseAdmin
      .from("victoria_leads")
      .insert(dbPayload)
      .select()
      .single();

    if (dbErr) throw dbErr;

    return NextResponse.json({ success: true, uuid: inserted.id, visitor_uuid: resolvedUuid });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
```

---

## 4. 🖥️ CRM Admin Dashboard Architecture (`AdminDashboardClient.tsx`)

The client dashboard merges financial state logic, data de-duplication, advanced CRM filtering, interactive Kanban cards, and visual charts.

### 4.1 Data Deduplication & DSU Clustering

A single customer might visit a landing page (generating traffic logs), register a free trial (creating a VSL row), submit a masterclass application (creating an MK row), and attempt checkout (creating a payment row). 

To prevent cluttering the admin visual board with duplicates, the dashboard implements a **Disjoint Set Union (DSU)** transitive clustering algorithm. It links separate rows sharing the same normalized phone, Telegram handles, order identifiers, or `visitor_id` values, merging them in real-time on mount.

```typescript
// DSU helper class for transitive component clustering in CRM Grid
class DSU {
  parent: number[];
  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }
  find(i: number): number {
    let root = i;
    while (this.parent[root] !== root) {
      root = this.parent[root];
    }
    let curr = i;
    while (curr !== root) {
      const nxt = this.parent[curr];
      this.parent[curr] = root;
      curr = nxt;
    }
    return root;
  }
  union(i: number, j: number) {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) {
      this.parent[rootI] = rootJ;
    }
  }
}

// How rows are processed in the dashboard client
const useProcessedLeads = (leads: Lead[], traffic: Traffic[], globalUsers: any[]) => {
  return useMemo(() => {
    const dsu = new DSU(leads.length);
    const phoneMap = new Map<string, number>();
    const tgMap = new Map<string, number>();
    const uuidMap = new Map<string, number>();
    const visitorMap = new Map<string, number>();

    // Connect matching indices inside the DSU based on identifiers
    leads.forEach((l, i) => {
      const phone = l.phone?.replace(/\D/g, '') || '';
      const tg = l.telegram?.toLowerCase().replace('@', '').trim() || '';
      const cleanUUID = (l.UUID || '').toString().trim();
      const cleanVisitor = (l.visitorId || '').toString().trim();

      if (cleanUUID) {
        if (uuidMap.has(cleanUUID)) dsu.union(i, uuidMap.get(cleanUUID)!);
        else uuidMap.set(cleanUUID, i);
      }
      if (phone.length >= 7) {
        if (phoneMap.has(phone)) dsu.union(i, phoneMap.get(phone)!);
        else phoneMap.set(phone, i);
      }
      if (tg) {
        if (tgMap.has(tg)) dsu.union(i, tgMap.get(tg)!);
        else tgMap.set(tg, i);
      }
      if (cleanVisitor) {
        if (visitorMap.has(cleanVisitor)) dsu.union(i, visitorMap.get(cleanVisitor)!);
        else visitorMap.set(cleanVisitor, i);
      }
    });

    // Group matching components and select primary record (highest weight/most paid)
    // Merge comment fields, sum paid revenues, assign visual tags ("Multi-Source", "Booking", "Повтор")
    // ... Returns aggregated leads array sorted by latest action timestamp.
  }, [leads, traffic, globalUsers]);
};
```

### 4.1.1 Questionnaire (Ankety) dynamic parsing
Each lead's questionnaire answers (from `/anketa`, `/free-lection/vsl-form`, etc.) are stored in the `raw_payload` JSONB column. On the server side, `getDiagnosticsComment` dynamically pulls all fields from `raw_payload` (excluding technical UTM/tracking fields), maps keys to friendly Ukrainian labels (e.g., `purpose` -> `Мета`, `difficulties` -> `Складнощі з блогом`), and returns them as a multiline comment which the client splits and renders dynamically.


### 4.2 Financial Segment Analysis

Inside the aggregator, each database lead's status is parsed to resolve their current marketing funnel weight, financial contribution, and local currency thresholds.

*   **Free Funnel (`Заявка`)**: Free trial or start VSL pages. (Weight = 3, Revenue = 0)
*   **Prepayment Bookings (`Оплачено - Бронь`)**: Booking attempts (typically 1,000 ₴ or 2,000 ₴). (Weight = 5, Prepayment UAH is tracked in a dedicated `bookingUAH` bucket).
*   **Tripwire Sales (`Купив трипвайєр`)**: Small trial purchases (typically $9 / $39). (Weight = 4, revenue is converted using a robust exchange rate e.g., 41.0 to UAH).
*   **Full Paid (`Оплачено`)**: Core high-ticket packages (Independent/Self: $399, Group: $505, Individual: $911). (Weight = 5, recorded in full revenue USD/UAH buckets).
*   **Failed Transactions (`Відхилено` / `Минув термін`)**: Expired checkouts or processing declines. (Weight = 0).

### 4.3 Navigation Filters & Query Synchronization

The leads page features a state-driven navigation filter bar allowing operators to dig into marketing records instantly:

1.  **Live Search**: Real-time evaluation on `Name`, `Phone`, or `Telegram` handles.
2.  **Funnel Source Sheets Filter**: Isolates records from specific marketing sheet funnels (e.g. VSL, Masterclass, Practicum).
3.  **Chosen Professional Niche**: Filters by professionally submitted interest sectors (e.g. IT, Design, Crypto, Retail).
4.  **Advanced Status Filters**:
    *   `Оплачено`, `Купив трипвайєр`, `Заявка`, `Відхилено`.
    *   `unpaid_intent` (Intent Cold Filter): **Extremely valuable for Sales.** Filters users who generated checkout logs or visited paid billing packages, but have no recorded success transaction anywhere in their DSU cluster.
5.  **Query String Sync**: All filters automatically serialize back into URL query parameters on changes (`?view=table&status=unpaid_intent&search=John`). This allows sales teams to share pre-filtered cohorts (like lost intent links) instantly.

---

## 5. 🗂️ Interactive Sales Kanban Board

A dynamic drag-and-drop board built on top of `@dnd-kit/core` and `@dnd-kit/sortable` gives sales agents control over user stages.

```
+-----------------+   +-----------------+   +-----------------+   +-----------------+
|      Нові       |   |    В роботі     |   |     Думає       |   |    Оплачено     |
+-----------------+   +-----------------+   +-----------------+   +-----------------+
| [John (Booking)]|   | [Marta (Trip)]  |   | [Alex]          |   | [Vince (Paid)]  |
| [Jane (VSL)]    |   |                 |   |                 |   |                 |
+-----------------+   +-----------------+   +-----------------+   +-----------------+
```

### 5.1 Sales Stages Columns
*   `Новий` — Newly generated leads.
*   `В роботі` — Contacted or currently under negotiations.
*   `Думає` — Lead is considering core purchase offer.
*   `Ждемо оплату` — Prepayment received, waiting for final invoice clearing.
*   `Оплачено` — Transaction fully confirmed.
*   `Відмова` — Lead declined final sale.

### 5.2 Dynamic Integration Hooks
*   **Automatic Financial Syncing**: If a user's database record reaches status `Approved` or `Tripwire` anywhere in their cluster, they are automatically routed straight into the "Оплачено" column. If status is `Failed`, they route to "Відмова".
*   **Drag Update Persistence**: Moving a card to another column triggers an immediate, optimized background fetch `POST /api/admin/update` with body `{ action: "update_global_user", uuid, sales_status: newColumnId }`, persisting the stage update in Supabase without interrupting the UI flow.

---

## 6. 📊 Analytics & Performance Dashboard (`AnalyticsDashboard.tsx`)

The analytics tab parses raw leads and traffic logs using **Recharts** area and bar chart components.

### 6.1 Top KPI Metrics Grid
*   **Traffic (Visits)**: Total count of logged page session views (`Клик` status).
*   **Total Leads**: Aggregate registered contacts count.
*   **Overall Conversion**: `(Total Leads / Traffic Visits) * 100` calculated on the fly.
*   **Booking Prepayments (UAH)**: Cumulative total of prepayment booking deposits (1000 ₴ / 2000 ₴).
*   **Gross Revenue (USD)**: Combined value of all core paid products and tripwires.

### 6.2 Visual Funnel Chart (`BarChart`)
A horizontal bar chart visualizing conversion throughput across the pipeline:

```
[Visits]       ==================================================== 100%
[Leads]        ============================= 58%
[Tripwires]    ================= 24%
[Bookings]     ====== 9%
[Full Paid]    ==== 3%
```

*   **Autonomous Funnel Controls**: Includes localized filters for analysis period (`month` - current month, `prev_month` - previous month, `all` - all time, and `custom` - showing start/end HTML5 date picking calendars) and sheet sources.

### 6.3 Daily Registration Trends (`AreaChart`)
A smooth spline Area Chart visualizing daily lead registration counts. Uses visual gradients to display rapid spikes and marketing pacing.

```typescript
<AreaChart data={trendData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
  <defs>
    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#C4A47C" stopOpacity={0.25}/>
      <stop offset="95%" stopColor="#C4A47C" stopOpacity={0.0}/>
    </linearGradient>
  </defs>
  <XAxis dataKey="name" stroke={axisStroke} tick={{ fontSize: 9, fill: tickFill, fontWeight: 'bold' }} />
  <YAxis stroke={axisStroke} tick={{ fontSize: 9, fill: tickFill, fontWeight: 'bold' }} allowDecimals={false} />
  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
  <Tooltip content={<CustomTooltip />} />
  <Area type="monotone" dataKey="count" name="Реєстрації" stroke="#C4A47C" strokeWidth={2.5} fill="url(#colorCount)" />
</AreaChart>
```

### 6.4 Top-5 UTM Sources Attribution
A sorted data table summarizing marketing yields across various ad campaigns. It groups, counts, and lists:
1.  **Traffic Source**: Advertising campaign name or medium.
2.  **Leads Count**: Generated registrations count.
3.  **Purchase Volume**: Conversion counts of successful paid products.
4.  **USD Yield**: Gross dollar amount generated by the channel.
5.  **Dynamic Cascade Sorting**: Automatically orders ad sets from highest payment volume down to raw registrations count.
