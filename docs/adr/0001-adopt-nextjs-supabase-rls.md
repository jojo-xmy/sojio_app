# ADR 0001: Adopt Next.js + Supabase + RLS

- Status: Accepted
- Date: 2026-04-18
- Decision Makers: SOJIO engineering
- Related Docs: `architecture.md`, `README.md`

## Context

SOJIO requires a stack that can deliver quickly while still supporting:

- role-based workflow orchestration across owner/manager/cleaner actors,
- transactional consistency for task lifecycle operations,
- secure multi-tenant style data access boundaries,
- simple deployment and maintenance for a small team.

The project also needs to integrate with LINE authentication and messaging APIs, while keeping infrastructure complexity manageable.

## Decision

Adopt the following architecture baseline:

1. **Next.js (App Router)** for frontend + backend route handlers in one codebase.
2. **Supabase Postgres** as the primary relational datastore.
3. **Postgres Row-Level Security (RLS)** as the authoritative data access control layer.

## Rationale

### Why Next.js

- Unified full-stack development model reduces handoff overhead.
- Route Handlers provide backend API capability without introducing a separate service runtime.
- Works well with Vercel deployment and iterative product delivery.

### Why Supabase Postgres

- Strong relational model supports the domain (`tasks`, `assignments`, `notifications`, `availability`).
- SQL migrations and schema evolution are transparent and reviewable.
- Managed Postgres lowers operational burden compared with self-hosted database infrastructure.

### Why RLS

- Access policy is enforced at the database boundary, not only at application code level.
- Policies are versioned in migrations and can be audited during code review.
- Supports constrained sandbox/demo access while preserving production hardening paths.

## Consequences

### Positive

- Faster implementation with one deployable web stack.
- Explicit and auditable authorization model.
- Strong fit for current team size and product stage.

### Negative / Trade-offs

- RLS policy design and testing add complexity to database changes.
- Tight coupling to Supabase/Postgres features increases migration effort if moving vendors.
- API and UI in a single runtime can require stricter module boundaries as complexity grows.

## Alternatives Considered

1. **Separate frontend + backend services (e.g., React + Express/Nest)**
   - Rejected for current stage due to higher integration and ops overhead.
2. **Firebase/NoSQL-first model**
   - Rejected because relational integrity and query flexibility are core to operations workflow.
3. **Application-only authorization without RLS**
   - Rejected due to higher risk of data exposure from missed checks in API paths.

## Follow-up Actions

- Standardize identifier types (`uuid` over mixed `text/uuid` references).
- Expand integration tests for auth, assignment, and notification scenarios.
- Keep policy intent documented within each migration touching authorization logic.
