# SOJIO Architecture

## 1. Purpose and Scope

SOJIO is a web-based hotel cleaning operations platform built for small to medium hospitality teams.  
The architecture is optimized for:

- role-driven workflow orchestration (`owner`, `manager`, `cleaner`),
- reliable task lifecycle management,
- integration with LINE for identity and notifications,
- secure data access via Supabase Row-Level Security (RLS).

This document describes system boundaries, runtime components, data design principles, and operational constraints.

## 2. System Context

### External Systems

- **LINE Platform**: login identity and outbound message delivery
- **Supabase Postgres**: transactional data store and policy enforcement
- **Vercel Runtime**: web hosting and API route execution

### Primary User Roles

- **Owner**: owns hotels, creates and supervises planning data
- **Manager**: manages hotel operations and assignment execution
- **Cleaner**: receives assignments, updates attendance, completes work
- **Admin (internal path)**: reviews registration applications

## 3. High-Level Architecture

SOJIO follows a layered monolith approach with clear module boundaries:

1. **Presentation Layer**
   - Next.js App Router pages in `app/`
   - Role-specific dashboards and task/calendar views
2. **Application/API Layer**
   - Route handlers in `app/api/`
   - Authentication, notification, admin, and cron endpoints
3. **Domain Service Layer**
   - Business logic in `lib/services/` and domain utility modules in `lib/`
4. **Data Layer**
   - Supabase Postgres with relational schema and migration-driven evolution
   - RLS policies for runtime authorization

This structure keeps business logic reusable while maintaining a single deployable unit.

## 4. Module Breakdown

### 4.1 Frontend and Routing

- `app/(auth)/`: login and registration entry points
- `app/dashboard/`: role-routed workspaces (owner/manager/cleaner)
- `app/task/[id]/`: task detail and execution context
- `components/`: reusable visual and interaction units
- `store/userStore.ts`: user state and role/session interaction state

### 4.2 Backend API Routes

- `app/api/auth/`: LINE auth, profile loading, role-based login paths
- `app/api/admin/`: registration approvals and admin operations
- `app/api/notifications/`: notification dispatch
- `app/api/cron/notifications/`: scheduled notification jobs
- `app/api/line/`: LINE webhook and messaging integration

### 4.3 Domain Services

- `taskService.ts`: task creation and lifecycle mutation
- `assignmentService.ts`: assignment and acceptance flow
- `calendarEntryService.ts`: reservation/cleaning planning linkage
- `managerHotelService.ts`: manager-hotel authorization mapping
- `notificationService.ts`: message generation and dispatch orchestration

## 5. Data Architecture

### Core Entities

- **Identity and Roles**: `user_profiles`
- **Organization Scope**: `hotels`, `manager_hotels`
- **Planning**: `calendar_entries`, `cleaner_availability`
- **Execution**: `tasks`, `task_assignments`, `attendance`, `task_images`
- **Communication and Audit Trail**: `task_notifications`, `registration_applications`

### Relationship Principles

- A hotel has one owner and can have multiple managers through a mapping table.
- Calendar entries represent planning events and can materialize into tasks.
- A task can have multiple assignment records and notification events.
- Images and attendance records are execution artifacts tied to task-level operations.

## 6. Security Model

### 6.1 Policy Enforcement

Data access is governed by Postgres RLS policies and migration-defined grants.  
The migration `011_harden_anon_with_guest_sandbox.sql` introduces:

- privilege revocation and controlled DML-only grants,
- removal of legacy permissive policies,
- sandbox-only access for anonymous demo identities,
- temporary fallback policies for `authenticated` role.

### 6.2 Practical Security Notes

- Anonymous access is intentionally constrained for demo workflows.
- Production traffic should prioritize authenticated identity paths.
- Policy reviews should be part of every schema or role-change migration.

## 7. Runtime Flows

### 7.1 Authentication and Authorization

1. User authenticates via LINE integration.
2. Profile/role is resolved from `user_profiles`.
3. Route-level rendering and API access are role-filtered.
4. Database-level RLS remains the final enforcement layer.

### 7.2 Task Lifecycle

1. Owner/manager creates planning data (`calendar_entries`) and/or tasks.
2. Manager assigns cleaners (`task_assignments`).
3. Cleaner updates acceptance/attendance/progress.
4. Completion evidence is saved (`task_images`, status updates).
5. Notifications are generated and sent through LINE-related pathways.

## 8. Scalability and Maintainability

### Current Strengths

- Clear role segmentation in route and service structure
- Migration-driven schema changes
- Practical domain decomposition under a monolith model

### Current Risks

- Mixed key typing (`uuid` and `text`) in some tables introduces complexity
- Notification reliability depends on API/cron operational consistency
- Policy growth can become hard to audit without naming/version conventions

### Recommended Engineering Improvements

- Normalize all task/user references to consistent `uuid` typing
- Add integration tests for auth, assignment, and notification flows
- Introduce structured observability for cron and webhook pathways
- Document policy intent next to each migration for review clarity

## 9. Deployment and Operations

- Runtime target: Vercel for web/API hosting
- Database target: Supabase Postgres
- Environment-managed secrets: LINE credentials, Supabase keys, JWT-related config
- Operational requirement: strict separation between demo and production access semantics

## 10. Repository Layout (Condensed)

```text
sojio_app/
├── app/                 # Routes and API handlers
├── components/          # UI components
├── hooks/               # Custom hooks
├── lib/                 # Domain/services/utilities
├── store/               # Global state
├── types/               # Type definitions
├── locales/             # i18n resources
└── supabase/            # Schema, migrations, policy docs
```

## 11. Architecture Decision Summary

- **Architecture style**: modular monolith on Next.js
- **Data authority**: Supabase Postgres with RLS
- **Identity channel**: LINE-based login path
- **Workflow center**: task lifecycle + assignment + notification coordination

This architecture is appropriate for the current product stage and team size, while leaving clear upgrade paths for stronger testing, observability, and policy governance.

## 12. ADR References

- `docs/adr/0001-adopt-nextjs-supabase-rls.md`

