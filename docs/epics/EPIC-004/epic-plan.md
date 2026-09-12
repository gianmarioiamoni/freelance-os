# EPIC-004 — Workspace

## 1. Epic Identity

**Epic:** EPIC-004  
**Release:** Release 0 — Foundation  
**Objective:** Workspace Foundation  
**Status:** Planned  
**Depends on:** EPIC-001 — Foundation / Repository; EPIC-002 — Database & Persistence; EPIC-003 — Authentication  
**Next Epic:** EPIC-005 — Testing & CI Foundation *(naming only; see §7.1)*  
**Canonical source:** `MASTER_PLAN.md` R0-E04 — Workspace Foundation

---

## 2. Status

```text
PLANNING COMPLETE
IMPLEMENTATION: NOT STARTED
```

EPIC-003 certified:

```text
PASS WITH FINDINGS
READY FOR EPIC-004
```

Review: `docs/epics/EPIC-003/engineering-review.md`  
Review commit: `fd10374574e58ff21cadc5b5fe089cc8fb6d66a6`

This document is the implementation plan. It does not implement workspace behavior.

---

## 3. Objective

Establish the workspace foundation required so FreelanceOS can attach an authenticated user to a tenant and resolve that tenant server-side.

From `MASTER_PLAN.md` R0-E04, this Epic establishes:

- workspace model;
- workspace membership;
- role baseline;
- server-side workspace resolution;
- tenant isolation primitives.

Product outcomes from `docs/product-vision.md`:

- **F-010** — create a workspace as part of initial user setup;
- **F-011** — users must not access data belonging to another workspace;
- **F-012** — the model supports multiple users per workspace, even if MVP roles are limited.

The result must be a trusted server-side workspace context that later Epics can use for Clients, Contracts, Time Tracking, Analytics, Alerts, and Notifications.

This Epic does **not** implement those business features. It does **not** close OBD-009.

---

## 4. Scope

### In Scope

- Application-owned workspace lifecycle for first-workspace onboarding;
- atomic creation of `Workspace` + creator `WorkspaceMember` (`OWNER`) + `WorkspaceSettings`;
- membership as the authorization source for tenant access;
- role baseline: persist and return `OWNER` / `MEMBER` without a permission matrix;
- server-side workspace resolution from the Better Auth user id;
- a workspace-aware authenticated application boundary;
- tenant isolation primitives (`WorkspaceContext`, membership check, fail-closed resolution);
- validation of user-controlled workspace fields;
- workspace authorization / isolation tests;
- Playwright coverage for the onboarding journey;
- documentation synchronization and Engineering Review.

### Out of Scope

See §5.

---

## 5. Non-Goals

Do not implement:

- client / contract / time-tracking / dashboard / report / alert product features;
- a workspace invitation product (tokens, email invites, accept/decline UI);
- a workspace switcher or multi-workspace administration UI;
- creation of additional workspaces after the first membership exists, unless a later documented decision requires it;
- a permission matrix or OWNER-versus-MEMBER operation differences;
- audit logging;
- production email-provider selection;
- Google/email implicit-linking changes;
- authentication redesign;
- persistence redesign (no second User table, no FK from `WorkspaceMember.userId` to Better Auth);
- database-per-tenant or schema-per-tenant isolation;
- workspace billing, seats, or organization hierarchy;
- production deployment or production-readiness certification;
- silent closure of OBD-008, OBD-009, EPIC-003 findings, or EPIC-002 findings.

A persistence or UI surface may exist for onboarding even though business modules belong to later Epics.

---

## 6. Source of Truth

Implementation must follow these documents in priority order:

1. `MASTER_PLAN.md`
2. `docs/architecture.md`
3. `docs/storage.md`
4. `docs/product-vision.md`
5. `docs/domain-model.md`
6. `docs/testing-strategy.md`
7. this Epic Plan
8. `docs/epics/EPIC-003/epic-plan.md` and `docs/epics/EPIC-003/engineering-review.md` for the authentication boundary
9. `docs/epics/EPIC-002/epic-plan.md` and `docs/epics/EPIC-002/engineering-review.md` for persistence invariants

Where documents disagree, do not silently reconcile them. Record the discrepancy in the Engineering Review. Authoritative status and next work remain `MASTER_PLAN.md`. Domain meaning remains `docs/domain-model.md`. Persistence invariants remain `docs/storage.md`. Authentication ownership remains the EPIC-003 boundary.

Where a required detail is not specified, mark it unresolved. Do not invent product rules.

---

## 7. Existing-System Context

### 7.1 Prior Epics

EPIC-001 established the Next.js / TypeScript application, App Router, quality commands, and CI.

EPIC-002 established and certified the persistence foundation:

```text
PASS WITH FINDINGS
READY FOR EPIC-003
```

Available and must be reused, not redesigned:

- PostgreSQL 17;
- Prisma 6.19.3;
- committed Prisma Migrate chain;
- application-owned `Workspace`, `WorkspaceMember`, `WorkspaceSettings`;
- `WorkspaceMemberRole` = `OWNER` | `MEMBER`;
- workspace-scoped repository ports;
- Prisma Infrastructure implementations;
- `runInTransaction`;
- composite workspace foreign keys;
- deterministic development seed with opaque user ids;
- isolated `TEST_DATABASE_URL`;
- persistence isolation tests.

EPIC-003 established and certified authentication:

```text
PASS WITH FINDINGS
READY FOR EPIC-004
```

Available and must be reused, not redesigned:

- Better Auth 1.7.4;
- email/password, sessions, Google OAuth configuration, password recovery;
- server-side session as identity source of truth;
- protected `(app)` layout (authenticated, not authorized);
- `/api/auth/[...all]`;
- no application-owned User table;
- `WorkspaceMember.userId` as a logical Better Auth user id;
- registration that does **not** create a workspace or membership.

`MASTER_PLAN.md` still names EPIC-005 “Testing & CI Foundation”. Testing and CI already exist from EPIC-001–003. EPIC-004 must add workspace tests now. It must not absorb EPIC-005 and must not wait for EPIC-005.

### 7.2 Current stack

| Layer | Current pin |
| --- | --- |
| Next.js | 15.5.25 |
| React | 19.1.0 |
| TypeScript | 5.9.3 |
| Prisma | 6.19.3 |
| PostgreSQL | 17 |
| Better Auth | 1.7.4 |
| Vitest | 4.1.11 |
| Playwright | 1.63.0 |

### 7.3 What already exists for Workspace

Persistence already has the tenant tables and repository ports:

```text
WorkspaceRepository.createWorkspace / getWorkspaceById / updateWorkspace
WorkspaceMemberRepository.addMember / getMember / listMembers
WorkspaceSettingsRepository.getSettings / putSettings
```

`getWorkspaceById` is an intentional EPIC-002 exception to workspace-scoped reads. It is **not** an authorization API. EPIC-004 must not expose it to the browser as proof of access.

The member port can answer “is this user in this workspace?” when both ids are known. It cannot list memberships by `userId`. Server-side resolution therefore requires a user-scoped query. That is a planned port extension, not a schema redesign.

The development seed creates one workspace, an `OWNER`, a `MEMBER`, settings, and business fixtures. Seed user ids remain opaque (`seed-user-owner`, `seed-user-member`) and are not Better Auth users.

### 7.4 Current application boundary

`(app)/layout.tsx` requires a Better Auth session and renders `AppShell`. Authenticated users with no membership currently reach placeholder application routes. That is the gap this Epic closes.

Application-layer code today is limited to auth route-access helpers. This Epic introduces the first workspace use cases in Application.

### 7.5 Inherited findings — carry only if relevant

| ID | Relevance to EPIC-004 | Action |
| --- | --- | --- |
| EPIC-003 F-001 | Membership attaches to a Better Auth user id. Unlinked Google/email identities can be two users. | Carry as identity risk. Do not fix. |
| EPIC-003 F-002 | Real Google consent/callback is not in CI. | Do not add Google onboarding E2E. Do not close. |
| EPIC-003 F-003 | Production password-reset email is not selected. | Not a workspace email. Do not select a provider. Do not close. |
| EPIC-003 F-004 | CI Playwright uses `pnpm dev` + 1 worker because `next start` rate limits collide. | Preserve. New workspace E2E must not require a CI redesign. |
| EPIC-002 F-P2-005 | Role enum is `OWNER` / `MEMBER` only. | Preserve. This is OBD-009. |
| EPIC-002 F-P2-003, F-P2-004, F-P3-002 | Persistence findings outside workspace authorization. | Preserve. Do not “fix” in this Epic. |

---

## 8. Architecture Boundaries

FreelanceOS remains a **Modular Monolith**.

```text
Presentation
      ↓
Application
      ↓
Domain
      ↑
Infrastructure
```

Workspace is an Application + Domain concern with a Presentation onboarding surface. Persistence stays in Infrastructure.

Expected request path:

```text
Browser
   ↓
Authenticated session          ← EPIC-003, unchanged
   ↓
Resolve workspace membership   ← EPIC-004
   ↓
Authorize operation            ← membership required; no permission matrix
   ↓
Application use case
   ↓
Workspace-scoped persistence
```

### 8.1 Ownership

| Concern | Owner |
| --- | --- |
| Who is the user? | Authentication (Better Auth) |
| Which workspace may they use? | Workspace application authorization |
| What may a role do? | Unresolved — OBD-009 |
| Tenant tables | Application-owned Prisma models (EPIC-002) |
| Auth tables | Better Auth (EPIC-003) |

### 8.2 Dependency rules

- Domain must not import Better Auth, Prisma, Next.js, or React.
- Application may consume the authenticated user id and workspace repositories. It must not own sessions, cookies, or credentials.
- Presentation / Client Components must not import the server-only Prisma client, Better Auth server instance, or secrets.
- Do not create a parallel tenant-resolution mechanism in the browser.
- Do not introduce a workspace microservice, second database, or second identity model.

### 8.3 Architectural change required

EPIC-004 adds a documented capability that EPIC-003 explicitly deferred:

```text
WorkspaceContext
  workspaceId
  userId
  role            ← attached, not interpreted as a permission matrix
```

The current user/workspace context is established **server-side** (`docs/architecture.md` §5.2, §9, §11 Authorization).

The browser must never supply `workspaceId` or `userId` as proof of authorization (`docs/architecture.md` §23).

No new ADR file is required unless Phase 5 judges ADR-005 (workspace-based multi-tenancy) insufficiently recorded in `docs/architecture.md`. Default: document the implemented resolution rules in architecture, matching the EPIC-003 treatment of ADR-006.

### 8.4 Route boundary

Keep authentication and workspace authorization as separate checks.

```text
Unauthenticated
      → /sign-in

Authenticated, no membership
      → first-workspace onboarding

Authenticated, exactly one membership
      → application routes with server-resolved WorkspaceContext

Authenticated, more than one membership
      → fail closed (see §9.3)
```

Onboarding must be reachable while authenticated and **without** a workspace. Workspace-bound `(app)` routes must not be.

Exact onboarding path is an implementation decision. Record the chosen path. Do not invent a workspace-administration area.

Next.js 15.5.25 still has no `proxy.ts` convention. Do not add `middleware.ts`. Server-side checks in layouts / Server Components remain authoritative.

---

## 9. Domain / Data Boundaries

### 9.1 Domain invariants this Epic enforces

| ID | Rule | EPIC-004 duty |
| --- | --- | --- |
| BR-001 | A user may access only data belonging to an authorized workspace. | Enforce at application authorization, not only at repository scoping. |
| BR-012 | Business entities cannot be reassigned across workspaces through ordinary client-controlled input. | Do not add reassignment APIs. Reject client-supplied workspace substitution. |

F-012 is already structurally true in persistence. This Epic keeps that model usable and authorizes access through membership. It does not add an invitation product.

### 9.2 Workspace lifecycle in this Epic

First-workspace onboarding is the only product lifecycle:

1. Authenticated user has zero memberships.
2. User submits a workspace name, IANA timezone, and ISO-4217 currency.
3. In one transaction:
   - create `Workspace`;
   - create `WorkspaceMember` for the session user with `role = OWNER`;
   - create `WorkspaceSettings` with the same timezone/currency and documented default thresholds.
4. Subsequent requests resolve that single membership server-side.

`Workspace.timezone` / `Workspace.currency` and `WorkspaceSettings.timezone` / `WorkspaceSettings.currency` already duplicate. Do not “fix” that duplication. On create, write the same values to both. Do not introduce a sync service.

Threshold defaults on create follow the documented intended values and the development seed:

```text
contractWarningPercent = 80
monthlyCapacityWarningPercent = 80
```

That implements the documented intended default. It does **not** close OBD-006 (capacity-warning semantics).

Workspace rename, settings administration, archival, and deletion are out of scope.

### 9.3 Membership resolution

Resolution input is the Better Auth user id from the server session.

| Membership count | Result |
| --- | --- |
| 0 | Onboarding required. Not an authorization grant. |
| 1 | That workspace is the current context. |
| > 1 | **Unresolved product behavior.** Fail closed. Do not pick an arbitrary workspace. Do not invent a switcher. |

`docs/domain-model.md` §3.1 says a user may belong to one or more workspaces **in the future**. F-010 is singular initial setup. This Epic therefore supports first-workspace creation and single-membership resolution only.

Adding a second membership remains possible through the existing persistence primitive and tests. That does not create a product invitation flow.

### 9.4 Role baseline versus OBD-009

Persistence already stores `OWNER` | `MEMBER` (EPIC-002 F-P2-005).

This Epic:

- assigns `OWNER` to the creating user;
- returns `role` on `WorkspaceContext`;
- does **not** define which operations OWNER may perform and MEMBER may not.

`MASTER_PLAN.md` “role baseline” means the persisted role exists and is attached to the context. It does not mean the permission matrix is decided. OBD-009, product OD-009, and testing TD-006 remain open.

### 9.5 Persistence rules

- PostgreSQL + Prisma + Prisma Migrate only. `db push` remains forbidden.
- Preserve composite FKs and SQL-only constraints from EPIC-002.
- Preserve the logical `WorkspaceMember.userId` reference. No Prisma FK to Better Auth `User`.
- Application-facing reads/writes remain workspace-scoped, except:
  - workspace creation;
  - `getWorkspaceById` (existing exception; wrap with authorization);
  - **new** `listMembershipsByUserId` (required to resolve context).
- If `listMembershipsByUserId` is added, a `WorkspaceMember(userId)` index is justified by `docs/storage.md` §15. If added, apply it through a reviewed Prisma migration.
- No data backfill is required for production data; there is no production deployment. Development seed remains a persistence fixture, not an auth/onboarding fixture.
- Do not convert seed users into Better Auth users unless E2E cannot otherwise remain deterministic. Default: keep the seed unchanged.

### 9.6 Planned schema change

No new tables.

Possible additive migration, only if Phase 1 introduces the user-scoped membership query:

```text
index WorkspaceMember(userId)
```

If the query can use the existing primary key efficiently enough that an index is unnecessary, skip the migration and record that decision in the phase notes. Do not add unrelated schema changes.

---

## 10. Security Considerations

Do not redesign authentication.

### 10.1 Authentication versus authorization

```text
Authentication  →  who is this user?
Authorization   →  what may this user access?
```

A valid session is necessary and not sufficient. Membership is required for workspace-bound operations.

### 10.2 New user-controlled data

| Field | Validation | Notes |
| --- | --- | --- |
| Workspace name | Required, trimmed, non-empty | Do not invent product naming policy beyond that. Apply a technical maximum length to prevent abuse. |
| Timezone | Required IANA timezone identifier | Reject unknown values. |
| Currency | Required ISO-4217 alphabetic code (`CHAR(3)`) | Format/catalog check only. Do not invent multi-currency behavior (OBD-011). |

### 10.3 Access control

- Resolve `userId` from the server session, never from the body/query as identity.
- Resolve `workspaceId` from membership, never from the client as proof.
- Non-members receive a controlled denial (`UnauthorizedWorkspaceAccess` or equivalent). Do not leak existence of other workspaces beyond a generic denial.
- Identifier substitution (body/query/path contains another workspace’s id) must fail.
- `getWorkspaceById` and repository ports are not public APIs.

### 10.4 Tenant isolation

Logical multi-tenancy. Workspace is the boundary. No database-per-tenant.

EPIC-002 already prevents cross-workspace *persistence* leaks through repository scoping and composite FKs. EPIC-004 must prevent cross-workspace *authorization* leaks: a user who is not a member cannot obtain a `WorkspaceContext` for that workspace.

### 10.5 Sensitive data and audit

Workspace name, timezone, and currency are not credentials. Still:

- do not log session tokens, auth secrets, or recovery tokens;
- do not write authorization bypass details that would help an attacker enumerate tenants.

Workspace creation is a sensitive tenant-creating action. OBD-008 (audit-log requirements) remains open. Identify the need; do not implement an audit log.

### 10.6 Financial data

This Epic does not introduce billing records. `Workspace.currency` / `WorkspaceSettings.currency` are ISO-4217 defaults for later monetary values. Precision, rounding, and multi-currency remain OBD-002 / OBD-011.

---

## 11. Testing Strategy

Use the existing strategy. Do not add tests only for coverage numbers.

### Unit

- membership resolution outcomes (0 / 1 / >1);
- route-access helpers for onboarding versus workspace-bound routes;
- input validation for name / timezone / currency;
- authorization helper: member allowed, non-member denied.

### Integration — PostgreSQL, real migration chain

- atomic workspace creation (workspace + OWNER membership + settings);
- creation rolls back if any of the three writes fails;
- duplicate membership still rejected by the existing primary key;
- `listMembershipsByUserId` returns only that user’s rows;
- member can resolve context; non-member cannot;
- client-supplied workspace id for another tenant is rejected by the application authorization primitive;
- existing EPIC-002 persistence isolation tests still pass;
- existing EPIC-003 auth tests still pass.

Do **not** implement client/contract/time-entry *product* authorization tests here. Those features are R1. Persistence isolation for those tables already exists. Application authorization for those resources belongs to the Epics that introduce the use cases.

### E2E

Minimum workspace journey from `docs/testing-strategy.md` §4.3 / §21, truncated to this Epic:

```text
Register
  → Create workspace
  → Reach the authenticated application without returning to onboarding
```

Also:

- authenticated user with no membership is sent to onboarding;
- unauthenticated user cannot open onboarding or application routes.

Do not automate real Google consent (F-002). Prefer email/password for deterministic onboarding E2E.

### Migration

If Phase 1 adds an index migration: clean database + full migrate chain + existing persistence tests + new workspace tests.

If no schema change: existing migration tests remain the gate.

---

## 12. CI Implications

Preserve the established gates:

```text
Prisma validate / generate
lint
typecheck
unit tests
integration tests against disposable PostgreSQL
prisma migrate deploy
Playwright E2E
build
```

No new CI service is required.

EPIC-003 F-004 remains in force: Playwright CI uses `pnpm dev` and one worker. Additional onboarding journeys must stay compatible with that constraint. Do not switch CI to `next start` and do not weaken Better Auth rate limits.

Do not modify CI in a phase that does not require it. Default: no workflow change.

---

## 13. Dependencies

### Completed

- EPIC-001 — Repository & Application Bootstrap
- EPIC-002 — Database & Persistence
- EPIC-003 — Authentication

### Required from EPIC-002

- `Workspace` / `WorkspaceMember` / `WorkspaceSettings` tables;
- `OWNER` / `MEMBER` enum;
- workspace-scoped repositories and transaction helper;
- composite FKs and isolation tests;
- migration chain and test database.

### Required from EPIC-003

- Better Auth user id;
- server session;
- protected authenticated layout;
- registration that does not create membership.

### This Epic supplies to later work

Trusted `WorkspaceContext` and membership authorization for all workspace-scoped product Epics.

### Must not pull forward

Client CRUD, contracts, time tracking, invitations, permission matrix, audit log, EPIC-005 CI redesign, EPIC-006 UI foundation beyond the minimum onboarding surface.

### External

None. No new production vendor. No email provider.

---

## 14. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R-001 | Client-supplied `workspaceId` treated as authorization | Medium | High | Server resolves membership. Tests for identifier substitution. |
| R-002 | Session treated as workspace membership | Medium | High | Separate auth and workspace checks. Onboarding for zero memberships. |
| R-003 | Silent closure of OBD-009 via OWNER-only rules | Medium | High | Attach role; do not branch features on role. |
| R-004 | Arbitrary workspace chosen when memberships > 1 | Low | High | Fail closed. Record as unresolved. |
| R-005 | Workspace created without settings or membership | Medium | High | Single transaction. Integration rollback test. |
| R-006 | Settings/workspace timezone-currency drift on create | Medium | Medium | Write the same values to both records. |
| R-007 | Seed/auth identity confusion | Medium | Medium | Keep seed opaque ids. Auth tests create real users. |
| R-008 | F-001 split identities receive separate memberships | Medium | Medium | Carry finding. Do not invent linking. |
| R-009 | Playwright CI flakes from extra auth journeys | Medium | Medium | Preserve F-004. Keep E2E to the onboarding path. |
| R-010 | Persistence redesign disguised as authorization | Low | High | Reuse tables/ports. Additive query/index only. |
| R-011 | Onboarding placed inside a workspace-required layout | Medium | High | Authenticated-without-workspace path must remain reachable. |

---

## 15. Open Business Decisions

Do not close any OBD.

| ID | Relevance to EPIC-004 | Phase that might consume it later | Blocks EPIC-004? |
| --- | --- | --- | --- |
| OBD-009 | Role baseline is persist-and-attach only. No permission matrix. Preserve F-P2-005 / TD-006 / OD-009. | Later product Epics | No |
| OBD-008 | Workspace creation is auditable in principle. Do not implement audit. | Release 2 | No |
| OBD-006 | Settings default 80% is the documented intended value. Semantics remain open. | Alerts Epic | No |
| OBD-002 / OBD-011 | Currency is stored as ISO-4217. No rounding or multi-currency behavior. | Billing Epics | No |
| OBD-001–005, OBD-007, OBD-010, OBD-012 | Not workspace foundation. | Later Epics | No |

### Unresolved technical / product gaps (not new OBD identifiers)

| Gap | Rule for this Epic |
| --- | --- |
| User with multiple memberships | Fail closed. No switcher. |
| Invitation / adding another human user through UI | Out of scope. Persistence primitive may be used in tests. |
| Second workspace for the same user | Out of scope. |
| Default timezone/currency when the user does not supply them | User must supply both. Do not invent a product default locale. |
| Exact onboarding URL | Implementation chooses and documents it. |

EPIC-003 deferred findings F-001 and F-003 remain open and are not closed by workspace work.

---

## 16. Documentation Requirements

Update only when the corresponding behavior exists:

| Document | When |
| --- | --- |
| `docs/architecture.md` | After workspace resolution, `WorkspaceContext`, and the authenticated-with/without-membership boundary are real |
| `docs/storage.md` | Only if a `WorkspaceMember(userId)` index or other migration is added; keep ownership boundaries explicit |
| `docs/domain-model.md` | Only if a new documented invariant is added (for example owner-on-create). Do not rewrite BR-001/BR-012. |
| `docs/testing-strategy.md` | After workspace authorization / onboarding tests exist |
| `README.md` | After setup or onboarding steps change |
| `CHANGELOG.md` | Each phase |
| `MASTER_PLAN.md` | Epic completion / status change — not this planning commit |
| ADR-005 | Only if Phase 5 judges architecture §5.2 / §11 / §12 insufficient |

Do not describe planned behavior as implemented.

This planning task updates only this file.

---

## 17. Phases

```text
Phase 1 — Workspace context & membership resolution
      ↓
Phase 2 — Workspace creation lifecycle
      ↓
Phase 3 — Onboarding UI & workspace-aware boundary
      ↓
Phase 4 — Authorization & isolation verification
      ↓
Phase 5 — Documentation & Workspace Engineering Review
```

Each phase:

```text
NEW CHAT
One objective
One commit
Do not start the next phase
```

Corrections stay in the same phase chat.

Prefer this count. Do not add phases for ceremony. Do not merge resolution, creation, UI, isolation certification, and review into one phase.

---

## 18. Phase 1 — Workspace context & membership resolution

**Cursor chat:** NEW CHAT  
**Commit expected:** YES  
**Entry conditions:** EPIC-003 complete; this plan exists; no workspace application authorization exists yet.

### Objective

Create the server-side workspace context primitive that later phases and Epics consume.

### In scope

- Application `WorkspaceContext` (`workspaceId`, `userId`, `role`);
- resolution from Better Auth user id → 0 / 1 / >1 memberships;
- `requireWorkspaceAccess(userId, workspaceId)` membership check;
- `listMembershipsByUserId` on the member port + Infrastructure implementation;
- optional additive `WorkspaceMember(userId)` index via Prisma Migrate;
- domain/application error for unauthorized workspace access;
- unit tests for resolution and membership denial;
- integration test for the user-scoped membership query.

### Out of scope

- workspace creation use case;
- onboarding UI;
- changing the `(app)` layout;
- role permission rules;
- invitations;
- client/contract authorization.

### Tests

- unit: 0 → onboarding signal; 1 → context; >1 → fail closed;
- unit: member allowed; non-member denied;
- integration: list-by-userId returns only that user’s memberships;
- if a migration is added: migrate deploy on the test database.

### Quality gates

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
```

Run only the commands affected if a subset is clearly sufficient; do not skip integration when a migration or repository port changes.

### Documentation

Phase notes / changelog only if a migration is added. Do not rewrite architecture as if onboarding exists.

### Expected commit

```text
feat(workspace): establish membership resolution
```

### Exit criteria

- `WorkspaceContext` can be resolved from a user id without trusting the browser.
- Zero and multiple memberships do not grant a workspace.
- Existing auth and persistence tests still pass.
- OBD-009 is untouched.

---

## 19. Phase 2 — Workspace creation lifecycle

**Cursor chat:** NEW CHAT  
**Commit expected:** YES  
**Entry conditions:** Phase 1 complete.

### Objective

Implement first-workspace creation as an application use case with transactional integrity.

### In scope

- `createWorkspace` (or equivalent) application use case;
- inputs: name, timezone, currency; actor = session user id;
- reject if the user already has a membership;
- one transaction: workspace + OWNER member + settings;
- validation of name / IANA timezone / ISO-4217 currency;
- settings thresholds 80 / 80;
- copy timezone/currency onto both `Workspace` and `WorkspaceSettings`;
- integration tests for success and rollback.

### Out of scope

- onboarding page;
- layout redirects;
- second-workspace creation;
- member-invite use case;
- settings administration UI;
- audit log.

### Tests

- integration: create produces three consistent records and a resolvable single membership;
- integration: creator role is `OWNER`;
- integration: a second create for the same user is rejected;
- integration: failure inside the transaction leaves no partial workspace;
- unit: validation rejects empty name, invalid timezone, invalid currency.

### Quality gates

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
```

### Documentation

Changelog. Do not claim UI onboarding exists.

### Expected commit

```text
feat(workspace): implement workspace creation
```

### Exit criteria

- An authenticated user with no membership can create exactly one first workspace through the application use case.
- The user becomes `OWNER`.
- Settings exist and match workspace timezone/currency.
- No UI is required for this phase to pass.

---

## 20. Phase 3 — Onboarding UI & workspace-aware boundary

**Cursor chat:** NEW CHAT  
**Commit expected:** YES  
**Entry conditions:** Phase 2 complete.

### Objective

Give F-010 a user-visible path and stop authenticated users without a workspace from using application routes as if they were authorized.

### In scope

- authenticated onboarding surface for first-workspace creation;
- server-side redirect: no membership → onboarding;
- server-side redirect: single membership → application; onboarding no longer shown;
- fail-closed handling for multiple memberships;
- `(app)` (or equivalent) becomes authenticated **and** workspace-resolved, except the onboarding route;
- reuse existing session helper; do not redesign auth;
- Playwright journey: register → create workspace → application.

### Out of scope

- AppShell redesign / EPIC-006 UI foundation;
- member management UI;
- workspace settings UI;
- Google OAuth E2E;
- CI workflow redesign;
- client/contract pages becoming real features.

### Tests

- unit/application: route-access updates for onboarding;
- E2E: email/password register, create workspace, land in the authenticated app;
- E2E or integration-equivalent: authenticated user without membership cannot stay on workspace-bound routes;
- existing auth E2E still pass under F-004 constraints.

### Quality gates

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

plus the documented Playwright auth + onboarding journeys.

### Documentation

README only if a user-visible path/setup step changed. Changelog.

### Expected commit

```text
feat(workspace): add onboarding and workspace boundary
```

### Exit criteria

- F-010 is exercisable in the running application.
- Authenticated-without-workspace and authenticated-with-workspace are distinct.
- Browser-supplied workspace id is not used as the boundary.
- CI E2E still uses the EPIC-003 constraint (F-004).

---

## 21. Phase 4 — Authorization & isolation verification

**Cursor chat:** NEW CHAT  
**Commit expected:** YES  
**Entry conditions:** Phase 3 complete.

### Objective

Prove BR-001 at the application authorization boundary and lock the tenant-isolation primitive for later Epics.

### In scope

- dedicated authorization / isolation tests for membership;
- identifier-substitution cases against the workspace primitive;
- user A cannot obtain `WorkspaceContext` for user B’s workspace;
- a thin authorized read of the current workspace (if not already present) used as a test probe — not a settings product;
- confirm EPIC-002 persistence isolation and EPIC-003 auth suites still pass;
- confirm Playwright onboarding + auth journeys still pass.

### Out of scope

- client/contract/time-entry product authorization;
- new features;
- CI redesign;
- closing OBD-009 or EPIC-003 findings;
- production certification.

### Tests

From `docs/testing-strategy.md` §14, limited to workspace membership:

```text
member of workspace     → access allowed
non-member              → access denied
substituted workspaceId → denied
```

Do not invent client-isolation *application* tests for features that do not exist.

### Quality gates

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

plus documented Playwright journeys.

### Documentation

`docs/testing-strategy.md` only if the implemented workspace tests need to be described as existing. Changelog.

### Expected commit

```text
test(workspace): verify authorization and isolation
```

### Exit criteria

- Membership authorization is independently proven.
- Isolation failures are regressions, not untested gaps.
- No new product scope landed in this phase.

---

## 22. Phase 5 — Documentation & Workspace Engineering Review

**Cursor chat:** NEW CHAT  
**Commit expected:** YES  
**Entry conditions:** Phases 1–4 complete.

### Objective

Certify that implementation matches this plan and the architecture, then record readiness for the next Epic.

### In scope

- synchronize the documents in §16 with implemented reality;
- evaluate ADR-005 recording;
- produce `docs/epics/EPIC-004/engineering-review.md`;
- classify findings;
- record OBD status;
- run the final quality gate;
- update `MASTER_PLAN.md` current status.

### Out of scope

- new workspace features;
- fixing EPIC-003 findings;
- closing OBD-008 / OBD-009;
- production-readiness certification.

### Tests

Re-run the established quality gate. Do not invent extra suites.

### Quality gates

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

plus documented Playwright journeys.

### Documentation

Engineering review artifact plus synchronized baseline docs.

### Expected commit

```text
docs(workspace): complete workspace engineering review
```

### Exit criteria

- Documentation describes implemented behavior only.
- Engineering review exists.
- No unresolved Blocker or High findings.
- Workspace boundary is ready for later product Epics.
- Verdict is explicit.
- Production readiness is **not** implied by a passing review.

---

## 23. Phase Discipline

```text
Read context
    ↓
Implement one objective
    ↓
Verify
    ↓
Review diff
    ↓
One commit
    ↓
Update documentation if required
```

Rules:

- one Cursor chat per phase;
- one objective per chat;
- one expected commit per phase;
- do not start the next phase automatically;
- do not implement later-Epic functionality;
- do not silently resolve open business decisions;
- do not redesign EPIC-002 or EPIC-003.

---

## 24. Cursor Chat Strategy

| Work | Chat |
| --- | --- |
| Epic planning | NEW CHAT (this document) |
| Phase 1 | NEW CHAT |
| Phase 2 | NEW CHAT |
| Phase 3 | NEW CHAT |
| Phase 4 | NEW CHAT |
| Phase 5 / Engineering Review | NEW CHAT |

Continue the current chat only for a correction inside the same phase.

Each new chat recovers context from the repository, not from previous conversation memory.

---

## 25. Token-Saving / Cursor Execution Rules

- Read only documents required for the current phase.
- Do not reprint entire files.
- Inspect with targeted searches. No repository-wide exploration.
- Smallest change that satisfies the phase.
- No speculative abstractions or extra dependencies.
- Do not install packages, modify Prisma, or change CI except in the phase that requires it.
- Do not resolve OBDs.
- Do not fix EPIC-003 findings “while here”.
- After a fix, rerun affected checks. Do not repeat green checks with no relevant change.
- Final reports: changed files, decisions, verification, findings, commit hash.
- Token saving never skips architecture, authorization, migration review, security, tests, or Git review.

---

## 26. Epic Acceptance Criteria

Each criterion is verifiable.

1. An authenticated user with no membership can create a workspace as initial setup (F-010).
2. Creating that workspace persists `Workspace`, an `OWNER` `WorkspaceMember` for the session user, and `WorkspaceSettings` in one transaction.
3. The same user cannot create a second first-workspace through that onboarding use case.
4. After creation, server-side resolution yields exactly that workspace without trusting a browser-supplied `workspaceId`.
5. An authenticated user with no membership cannot use workspace-bound application routes.
6. A user who is not a member of workspace B cannot obtain authorization for workspace B, including when they substitute B’s id (F-011 / BR-001).
7. A member of workspace A can resolve workspace A.
8. `WorkspaceMember` remains the membership model and still supports more than one user per workspace (F-012) without an invitation product.
9. `role` is stored and returned; no permission matrix is implemented (OBD-009 open).
10. Authentication remains Better Auth; no second User table; no FK from `WorkspaceMember.userId` to auth tables.
11. Registration still does not create a workspace by itself.
12. Client Components cannot import server-only Prisma or Better Auth server code.
13. Existing EPIC-002 persistence tests still pass.
14. Existing EPIC-003 authentication tests still pass.
15. Documented onboarding E2E passes without Google credentials.
16. CI keeps the established gates and the F-004 Playwright constraint.
17. Architecture / storage / testing / README / changelog describe implemented workspace behavior only.
18. OBD-008 and OBD-009 remain open.
19. EPIC-003 F-001, F-002, F-003, and F-004 remain open.
20. No Blocker or High finding remains unresolved.

---

## 27. Definition of Done

EPIC-004 is complete only when:

- [ ] First-workspace onboarding is implemented.
- [ ] Server-side workspace resolution is implemented.
- [ ] Membership authorization is enforced for workspace-bound operations.
- [ ] Role baseline is persist-and-attach only; OBD-009 remains open.
- [ ] Workspace + OWNER membership + settings are created atomically.
- [ ] Any schema change is a reviewed Prisma migration (or no schema change occurred).
- [ ] Composite FKs and workspace isolation columns are preserved.
- [ ] Authorization / isolation tests pass.
- [ ] Unit tests pass.
- [ ] Integration tests pass against PostgreSQL.
- [ ] Planned E2E onboarding journey passes.
- [ ] Lint, typecheck, and build pass.
- [ ] Existing EPIC-002 and EPIC-003 suites still pass.
- [ ] Documentation is synchronized.
- [ ] Engineering Review exists.
- [ ] Findings are classified.
- [ ] Open decisions remain documented.
- [ ] Epic verdict is recorded.
- [ ] Production readiness is not claimed automatically.

---

## 28. Epic Exit Criteria

```text
Membership resolution
      ↓
Workspace creation
      ↓
Onboarding UI
      ↓
Workspace-aware boundary
      ↓
Authorization / isolation tests
      ↓
CI unchanged unless required
      ↓
Documentation synchronized
      ↓
Engineering Review
      ↓
READY FOR NEXT EPIC
```

Distinguish:

| Term | Meaning |
| --- | --- |
| Engineering completion | Phases 1–4 implemented and gated. |
| Validation | Tests and review evidence match this plan. |
| Certification | Phase 5 verdict (`PASS` / `PASS WITH FINDINGS` / `BLOCKED`). |
| Production readiness | Separate Release-0 / production-validation concern. **Not** granted by a green test suite. |

---

## 29. Epic-Level Verification / Certification

Final quality gate:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

plus documented Playwright auth and onboarding journeys.

Migration verification, if a migration was added:

```text
clean database
      ↓
full migration chain
      ↓
existing persistence tests
      ↓
existing auth tests
      ↓
workspace authorization tests
      ↓
PASS
```

Certification happens in Phase 5.

Required artifact:

```text
docs/epics/EPIC-004/engineering-review.md
```

Allowed verdicts:

```text
PASS
PASS WITH FINDINGS
BLOCKED
```

Ready for the next Epic only when the review says so and no Blocker/High finding remains.

Do not certify production-ready authentication or production-ready multi-tenant operations in this Epic. EPIC-003 already refused production certification; this Epic does not reverse that.

---

## 30. Source Discrepancies

Recorded so implementation does not silently “fix” them.

1. **`MASTER_PLAN.md` EPIC-005 name versus existing CI**  
   EPIC-005 is still titled “Testing & CI Foundation”, but those gates already exist. Authoritative for this Epic: R0-E04 Workspace Foundation. Tests for workspace land here. EPIC-005 is not in scope.

2. **“Role baseline” versus OBD-009**  
   R0-E04 asks for a role baseline. Domain OBD-009, product OD-009, and TD-006 leave the permission matrix open. Authoritative reconciliation: persist/attach `OWNER` / `MEMBER`; do not invent permissions.

3. **Testing-strategy “first suite” includes client isolation**  
   `docs/testing-strategy.md` §48 lists cross-workspace client isolation before UI exists. Clients are R1. Authoritative for this Epic: membership authorization and F-010 onboarding. Persistence client isolation already exists from EPIC-002.

4. **Multi-workspace future versus singular F-010**  
   Domain allows multiple workspaces later. Product F-010 is initial setup of one workspace. No switcher is specified. Authoritative for this Epic: first workspace only; fail closed if memberships > 1.

5. **F-012 versus invitations**  
   Multi-user *model* is required. Invitation *product* is not in R0-E04 or the workspace feature list. Authoritative: keep `WorkspaceMember`; do not build invites.

6. **`WorkspaceMemberRepository` cannot list by user**  
   Current ports are workspace-scoped except `getWorkspaceById`. Resolution needs a user-scoped query. This is a planned extension, not a contradiction in the storage model.

---

## 31. Next Epic

After EPIC-004 certification, follow `MASTER_PLAN.md`:

**EPIC-005 — Testing & CI Foundation**

Treat that name as a MASTER_PLAN identifier. Do not assume EPIC-005 must rebuild Vitest, Playwright, or CI from zero. This Epic must not start EPIC-005.

Later product work (Clients and beyond) depends on the `WorkspaceContext` established here (`MASTER_PLAN.md` R1-E01 dependencies include R0-E04).
