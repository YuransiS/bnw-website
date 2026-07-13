# Feature Specification: User Authentication & Role-Based Access Control (RBAC)

**Feature Branch**: `001-auth-rbac`

**Created**: 2026-07-13

**Status**: Implemented (Reverse-Engineered)

## User Scenarios & Testing

### User Story 1 - Secure Operator Login & Registration (Priority: P1)
As a CRM operator, I want to register and sign in securely to access project leads and metrics.

**Why this priority**: Fundamental gateway to the system. No access should be allowed without verification.

**Independent Test**: Verify login using username/password and Google OAuth. Ensure redirection works.

**Acceptance Scenarios**:
1. **Given** a new visitor, **When** they sign up, **Then** a profile is created in `public.profiles` with status `pending`, and they are restricted from accessing dashboard layouts.
2. **Given** an approved operator, **When** they login via email/password or Google OAuth, **Then** they are redirected to the CRM dashboard.

---

### User Story 2 - Role-Based Access Control and UI Restriction (Priority: P1)
As a project manager or operator, I should only see projects and features permitted by my designated role.

**Why this priority**: Prevent unauthorized access to sensitive financial metrics and other expert projects.

**Independent Test**: Login as a `sales` user and verify that high-level analytics, margins, and `vova_win` project options are completely hidden in the sidebar and dashboard.

**Acceptance Scenarios**:
1. **Given** a user with role `sales`, **When** they open the dashboard, **Then** only their assigned projects are visible in the sidebar (excluding `vova_win`), and financial tabs like the "Center of Management" are hidden.
2. **Given** a user with role `superman`, **When** they open the dashboard, **Then** they have full access to all projects (with conditional junction checks for `bw_main`) and all analytical tabs.

---

### User Story 3 - Team Management Console for Admin (Priority: P2)
As a Superman, I want to edit team roles and project access mappings in a clean interface.

**Why this priority**: Allows supervisors to manage permissions dynamically.

**Independent Test**: Log in as `superman`, navigate to `/admin/settings`, modify a user's role and toggle project checkboxes, and verify changes persist in the database.

**Acceptance Scenarios**:
1. **Given** a Superman on the settings page, **When** they toggle project permissions for a producer, **Then** the links in `profile_projects` are updated, and the producer's sidebar reflects the new list.

### Edge Cases
- **Unapproved/Pending Users**: Any authenticated user with a `pending` role MUST be redirected to `/admin/pending` and blocked from making dashboard mutations.
- **`bw_main` Isolation**: The `bw_main` project is restricted. Even Supermen cannot access it unless explicitly mapped in the `profile_projects` junction table.

## Requirements

### Functional Requirements
- **FR-001**: System MUST support OAuth (Google) and password-based sign-in using Supabase Auth.
- **FR-002**: Newly registered users MUST automatically receive the `pending` role via a database trigger.
- **FR-003**: System MUST protect dashboard views using a global Next.js Layout redirect if the role is `pending`.
- **FR-004**: System MUST filter project listings in the sidebar and dashboard based on the junction table `profile_projects` for the active user.
- **FR-005**: System MUST expose the `/admin/settings` route and `SettingsForm` component exclusively to users with the `superman` role.

### Key Entities
- **Profile**: Represents the CRM user, containing their `id` (references Supabase auth), `email`, and `role` (`superman`, `producer`, `rop`, `sales`, `pending`).
- **ProfileProjects**: Junction table linking `profile_id` and `project_id` to control access.

## Success Criteria

### Measurable Outcomes
- **SC-001**: 100% of unauthorized requests to `/admin/settings` are rejected with a 403 or redirection.
- **SC-002**: Sidebar loading and filtering completes in under 100ms.

## Assumptions
- Supabase Auth handles password encryption and Google OAuth handshakes safely.
- Token and session validation is handled on the server via Next.js middleware.
