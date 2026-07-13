# Implementation Plan: CRM Leads Dashboard UI & Interactions

**Branch**: `003-leads-dashboard` | **Date**: 2026-07-13 | **Spec**: [specs/003-leads-dashboard/spec.md](file:///c:/BnW_Prod/bnw-website/specs/003-leads-dashboard/spec.md)

## Summary
Provide a modular, fast UI dashboard by splitting the monolithic `LeadsDashboard.tsx` component into sub-tabs and memoizing local inputs (search, filters) to avoid unnecessary rendering trees. Implement HTML5 drag and drop and URL parameters binding.

## Technical Context
- **Language/Version**: TypeScript / Next.js React 18+ (App Router Client Component)
- **Primary Dependencies**: `@dnd-kit/core`, `@dnd-kit/sortable`, `lucide-react`, `recharts`
- **Storage**: Client LocalStorage (for theme and sidebar preferences), Supabase query cache
- **Testing**: React testing library, Chrome DevTools profiling (INP, CLS)
- **Constraints**: Monolithic size reduction. Input fields responsiveness (input lag < 50ms).

## Constitution Check
- **SaaS Minimalist UI**: ✅ Interface uses slate/zinc tones, rounded borders (`rounded-xl`), clean workspaces, and subtle transitions.
- **Complexity Guard**: ⚠️ `LeadsDashboard.tsx` is currently a monolithic file (>240KB, 4400 lines). The plan requires progressive decomposition into `/tabs/` sub-components.

## Project Structure

### Documentation
```text
specs/003-leads-dashboard/
├── spec.md              # Requirements specification
└── plan.md              # Implementation plan (this file)
```

### Source Code
```text
src/
├── app/
│   ├── admin/
│   │   ├── LeadsDashboard.tsx      # Main dashboard controller (routing tabs)
│   │   └── LeadsDashboard/
│   │       ├── tabs/
│   │       │   ├── ManagementTab.tsx # Center of Management (Superman)
│   │       │   ├── LeadersTab.tsx    # Leaders of OP list
│   │       │   ├── AnalyticsTab.tsx  # Charts & UTM analytics
│   │       │   ├── KanbanTab.tsx     # Drag & drop board
│   │       │   ├── LeadsTab.tsx      # Leads table & search (active editing)
│   │       │   ├── QuestionnaireTab.tsx # Ankety Master-Detail panel
│   │       │   └── PaymentsTab.tsx   # WayForPay link generator
│   │       └── components/
│   │           ├── FilterBar.tsx     # Leads search, date range, niche filter
│   │           └── UserTimeline.tsx  # Chronological touch timeline
```

## Implementation Details

### 1. Tab Modularization & Performance
- Decompose the massive component into separate tab files in `/LeadsDashboard/tabs/` to improve compile times and browser parsing.
- Use React `useMemo` and `useCallback` on searching/sorting arrays to prevent computation overhead on every keystroke.
- Implement debounce on search inputs (e.g., 200ms) before triggering query refetches.

### 2. URL Sync Hook
- Bind the state of filtering components to Next.js `useRouter` and `useSearchParams`.
- Construct URL params dynamically and push changes using shallow routing (`router.replace` with `scroll: false`) to avoid full page refreshes.

### 3. Questionnaire Mapping Config
- Map raw JSONB fields to readable strings inside the `QuestionnaireTab`:
  - `purpose` -> `'Мета'`
  - `difficulties` -> `'Складнощі'`
  - `readiness` -> `'Готовність'`
- Victoria project restrict layout to `'rozbir'` and `'VSL-форма'` types using hardcoded checklist guards.

## Verification Plan

### Manual Verification
- Check Lighthouse metrics: Verify INP stays under 50ms.
- Toggle between Light and Dark modes: Confirm settings persist across sessions.
- Open console in Dev Mode: Ensure no circular render loops occur during search input changes.
