# EPIC-004 — Engineering Review

**Epic:** EPIC-004 — Workspace  
**Release:** Release 0 — Foundation  
**Reviewed commits:**

```text
800c30e feat(workspace): establish membership resolution
6fbe21d feat(workspace): implement workspace creation
4f73c9f feat(workspace): add onboarding and workspace boundary
cd9904e test(workspace): verify authorization and isolation
```

Phase 5 is documentation and certification only. No workspace feature, schema, authorization behavior, or CI change was added in this review.

---

## 1. Executive Summary

EPIC-004 delivers the workspace foundation later product Epics can attach to without implementing clients, contracts, invitations, or a permission matrix.

Better Auth remains the authentication authority. `WorkspaceMember` is the workspace authorization source. Server-side resolution produces `WorkspaceContext` from the session user id. First-workspace onboarding creates `Workspace`, an `OWNER` membership, and `WorkspaceSettings` in one transaction. The authenticated application boundary requires exactly one membership. More than one membership fails closed. Browser identifiers are not trusted as authorization.

Remaining issues are classified findings and open product/operational decisions. None are Blocker or High.

```text
VERDICT: PASS WITH FINDINGS
EPIC ENGINEERING COMPLETION: YES
PRODUCTION READINESS: NO
READY FOR EPIC-005
```

A concurrent first-workspace race can still create two memberships because `UNIQUE(userId)` is intentionally absent. That does not block later Foundation work. It does block any claim of production-ready multi-tenant operations.

---

## 2. Scope Delivered

Verified against `MASTER_PLAN.md` R0-E04, `docs/epics/EPIC-004/epic-plan.md`, `docs/architecture.md`, `docs/storage.md`, `docs/testing-strategy.md`, and the Phase 1–4 implementation.

| Area | Documented | Implemented | Verified |
| --- | --- | --- | --- |
| `WorkspaceContext` (`workspaceId`, `userId`, `role`) | Yes | Yes | Yes |
| Membership resolution 0 / 1 / >1 | Yes | Yes | Yes |
| `listMembershipsByUserId` + `WorkspaceMember(userId)` index | Yes | Yes | Yes |
| `requireWorkspaceAccess` | Yes | Yes | Yes |
| First-workspace create (workspace + OWNER + settings) | Yes | Yes | Yes |
| Onboarding at `/onboarding` | Yes | Yes | Yes |
| Workspace-aware `(app)` boundary | Yes | Yes | Yes |
| Fail-closed `/workspace-unavailable` for >1 memberships | Yes | Yes | Yes |
| `getAuthorizedWorkspace` authorized read | Yes | Yes | Yes |
| No application User model | Forbidden | Absent | Yes |
| Better Auth remains authentication authority | Yes | Yes | Yes |
| Role persist-and-attach only | Yes | Yes | Yes — OBD-009 |
| No workspace switcher / arbitrary selection | Yes | Absent | Yes |
| Authorization / isolation tests | Yes | Yes | Yes |
| Playwright onboarding E2E | Yes | Yes | Yes |
| Invitation product | Out of scope | Absent | Yes |
| Permission matrix | Out of scope | Absent | Yes |
| Audit log | Out of scope | Absent | Yes — OBD-008 |

ADR-005 (workspace-based multi-tenancy) is already canonical in `docs/architecture.md` §5.2, §11, and §12. No standalone ADR file was created. This matches the EPIC-003 treatment of ADR-006.

---

## 3. Architecture Review

**Verdict:** PASS

FreelanceOS remains a Modular Monolith. Workspace is an Application + Domain concern with a Presentation onboarding surface. Persistence stays in Infrastructure.

Implemented request path:

```text
Browser
  ↓
Better Auth session
  ↓
Workspace membership resolution
  ↓
Authorization
  ↓
WorkspaceContext
  ↓
Workspace-scoped application operation
  ↓
Persistence
```

Confirmed:

- no application User model;
- Better Auth remains the authentication authority;
- `WorkspaceMember` remains the workspace authorization source;
- `role` is attached and not interpreted;
- no arbitrary workspace selection;
- more than one membership fails closed;
- browser identifiers are not trusted as authorization.

Domain does not import Better Auth, Prisma, Next.js, or React. Application consumes the session user id and workspace repositories. It does not own sessions, cookies, or credentials. Client onboarding modules do not import the server-only Prisma client or Better Auth server instance.

`(app)/layout.tsx` requires `getCurrentWorkspaceContext()`. `(workspace-gate)` remains reachable while authenticated and without a workspace. Next.js 15.5.25 still has no `proxy.ts` convention; `middleware.ts` is absent.

No architecture redesign was introduced.

---

## 4. Persistence Review

**Verdict:** PASS WITH FINDINGS

`Workspace`, `WorkspaceMember`, and `WorkspaceSettings` remain consistent with `docs/storage.md`.

| Phase | Schema | Evidence |
| --- | --- | --- |
| Phase 1 | Additive `WorkspaceMember(userId)` index | `20260912180000_index_workspace_member_user_id`; justified by `listMembershipsByUserId` |
| Phase 2 | None | Atomic `runInTransaction` create |
| Phase 3 | None | Boundary uses existing persistence |
| Phase 4 | None | Authorization tests only |

EPIC-002 composite foreign keys remain intact. There is no Prisma FK from `WorkspaceMember.userId` to Better Auth `User`. `prisma db push` is not used.

First-workspace creation writes the same timezone/currency to `Workspace` and `WorkspaceSettings`, with threshold defaults 80 / 80. Sequential second creation is rejected. Transaction rollback leaves no partial workspace.

`WorkspaceMember` is keyed by `(workspaceId, userId)`. There is no `UNIQUE(userId)`. That constraint would conflict with the multi-membership model (F-012) and must not be added. Concurrent first-workspace creation therefore remains an application-level limitation. This is F-004-001.

---

## 5. Authorization / Security Review

**Verdict:** PASS WITH FINDINGS

This is an engineering review, not a penetration test. No formal security certification is claimed.

Phase 4 verification evidence:

| Case | Result |
| --- | --- |
| Member access | Succeeds; `OWNER` / `MEMBER` role attached |
| Non-member access | `UnauthorizedWorkspaceAccessError` |
| Identifier substitution | Denied with the same generic error |
| Cross-workspace authorized read | Denied |
| Zero-membership access | Onboarding required; workspace access denied |
| Multiple-membership ambiguity | Fail closed; `/workspace-unavailable` |
| Path/query `workspaceId` | Not authorization |
| `getWorkspaceById` | Persistence exception; not an authorization API |
| `getAuthorizedWorkspace` | Authorized read after membership |

`userId` comes from the Better Auth server session. Requested `workspaceId` is a target, not proof of access. Non-members receive a generic denial and do not receive another tenant's workspace record through the authorized primitive.

Workspace creation is a tenant-creating action. OBD-008 remains open; no audit log was implemented.

Inherited EPIC-003 identity and operational findings remain open and are not workspace defects.

---

## 6. Testing / CI Review

**Verdict:** PASS WITH FINDINGS

Coverage implemented across Phases 1–4:

- Unit: resolution 0 / 1 / >1, membership denial, creation validation, route-access, `getAuthorizedWorkspace`
- Integration (isolated PostgreSQL 17, `TEST_DATABASE_URL`): user-scoped membership query, atomic create and rollback, workspace boundary, authorization/isolation
- Playwright: register → create workspace → application; invalid onboarding input remains on `/onboarding`; unauthenticated denial; browser-supplied `workspaceId` is not authorization
- Existing EPIC-002 persistence and EPIC-003 authentication suites remain in the same gates

Coverage percentages are not claimed.

CI constraint F-004 remains open:

```text
Playwright uses pnpm dev
one worker
```

`next start` enables Better Auth production rate limits that collide across journeys on one CI IP. Production rate limits were not weakened. No CI workflow change was required in this Epic.

---

## 7. UX / Onboarding Review

**Verdict:** PASS

Engineering-level review of the delivered surface only. No UX polish was performed.

Verified from implementation and Playwright:

- onboarding exists at `/onboarding`;
- required fields are name, IANA timezone, and ISO-4217 currency;
- invalid input remains on onboarding;
- successful creation enters the authenticated application;
- unauthenticated access to onboarding and application routes redirects to `/sign-in`;
- no workspace switcher exists;
- no multi-workspace UX exists.

Authenticated users with more than one membership see `/workspace-unavailable`. That is fail-closed behavior, not a product switcher. AppShell destinations remain placeholders from earlier Foundation work.

---

## 8. Documentation Review

**Verdict:** PASS after Phase 5 synchronization

Phase 5 updated stale status in `MASTER_PLAN.md`, `docs/architecture.md`, `docs/storage.md`, `docs/testing-strategy.md`, `docs/epics/EPIC-004/epic-plan.md`, `README.md`, and `CHANGELOG.md`.

Documents now describe implemented workspace behavior, not intended-but-absent behavior. They do not claim:

- a permission matrix;
- a workspace switcher;
- invitation product;
- audit logging;
- production-ready multi-tenant operations;
- closure of OBD-008, OBD-009, or EPIC-003 findings.

---

## 9. Findings

Known findings classified. No duplicates. No new finding invented from future scope.

### F-004-001

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open / accepted persistence limitation
- **Description:** Concurrent first-workspace creation can produce two memberships. Eligibility is re-checked inside the transaction, but `WorkspaceMember` is keyed by `(workspaceId, userId)` and there is no `UNIQUE(userId)`. Adding that unique constraint would conflict with future multi-workspace membership. Sequential second creation is rejected. If the race occurs, later resolution fails closed.

### EPIC-003 F-001

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open / deferred product-security decision
- **Description:** Better Auth default Google/email implicit linking requires `emailVerified=true`. Email/password signup does not verify email. Same-email identities are not implicitly merged.

### EPIC-003 F-002

- **Severity:** Low
- **Blocking:** No
- **Status:** Open testing limitation
- **Description:** Full Google consent/callback is not automated in CI.

### EPIC-003 F-003

- **Severity:** Medium
- **Blocking:** No for this epic
- **Status:** Open operational dependency
- **Description:** Production password-reset email provider has not been selected.

### EPIC-003 F-004

- **Severity:** Low
- **Blocking:** No
- **Status:** Open CI environment limitation
- **Description:** Playwright CI uses `pnpm dev` with one worker because `next start` rate limits collide across auth journeys.

EPIC-002 findings F-P3-002, F-P2-003, F-P2-004, and F-P2-005 remain unchanged and outside this epic. F-P2-005 continues as OBD-009.

No Blocker or High findings.

---

## 10. Open Business Decisions

Do not close any OBD.

| ID | Decision | Blocks EPIC-004? |
| --- | --- | --- |
| OBD-008 | Audit-log requirements | No |
| OBD-009 | Workspace roles and permissions | No |
| OBD-006 | Capacity-warning semantics | No — create uses documented 80% defaults |
| OBD-002 / OBD-011 | Money rounding / multi-currency | No — currency stored as ISO-4217 |
| OBD-001–005, OBD-007, OBD-010, OBD-012 | Billing, time, capacity | No |
| — | Google/email identity linking | No — EPIC-003 F-001 |
| — | Production email provider | No for epic completion — EPIC-003 F-003 |
| — | User with multiple memberships | No — fail closed; no switcher |

No additional product decision was discovered that required a new OBD identifier.

---

## 11. Deferred Work

Out of scope and not started:

- workspace switcher or multi-workspace administration;
- invitations;
- OWNER / MEMBER permission semantics;
- audit logging;
- additional workspaces after the first membership;
- clients, contracts, time tracking, analytics, alerts, notifications;
- EPIC-003 finding remediation;
- EPIC-005 Testing & CI Foundation;
- Google Console or production email configuration.

---

## 12. Production-Readiness Limitations

EPIC-004 engineering completion is not production certification.

Still required before any production-ready claim:

- remaining Release 0 Epics (EPIC-005, EPIC-006) and later release gates;
- production password-reset email provider (F-003);
- Google/email identity-linking decision (F-001);
- resolution of the concurrent first-workspace limitation (F-004-001) by a method that does not add `UNIQUE(userId)`;
- production validation and production certification stages.

This review does not certify production-ready authentication or production-ready multi-tenant operations.

---

## 13. Epic Verdict

```text
PASS WITH FINDINGS
```

| Dimension | Result |
| --- | --- |
| Architecture | PASS |
| Implementation | PASS |
| Persistence | PASS WITH FINDINGS |
| Authorization / security | PASS WITH FINDINGS |
| Tests | PASS WITH FINDINGS |
| CI | PASS WITH FINDINGS |
| UX / onboarding | PASS |
| Documentation | PASS |
| Blocking findings | None |
| Epic engineering completion | YES |
| Full production readiness | NO |

Required EPIC-004 functionality works. Quality gates pass. Medium findings are documented and non-blocking for the next Foundation epic. Role permissions, audit logging, and EPIC-003 operational findings remain open.

---

## 14. Recommended Next Step

```text
READY FOR EPIC-005
```

Create `docs/epics/EPIC-005/epic-plan.md` before implementation.

Treat EPIC-005 as the MASTER_PLAN identifier “Testing & CI Foundation”. Do not assume it must rebuild Vitest, Playwright, or CI from zero.

Do not add workspace switching, invitations, or a permission matrix here. Do not add `UNIQUE(userId)`. Do not close OBD-008 or OBD-009. Do not fix EPIC-003 findings in this Epic.

---

## Review Evidence

| Command | Result |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS (49) |
| `pnpm test:integration` | PASS (59) |
| `pnpm build` | PASS |
| Playwright auth + onboarding E2E (`CI=true`, 1 worker) | PASS (12) |
