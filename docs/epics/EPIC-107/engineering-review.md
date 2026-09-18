# EPIC-107 Engineering Review

**Epic:** EPIC-107 — Public Landing  
**Phase:** P107-05  
**Release:** Release 1 — MVP  
**MASTER_PLAN identifier:** R1-E07 — Public Landing  
**Date:** 2026-09-18  
**Reviewer:** Engineering Review Agent  

```text
ENGINEERING REVIEW RESULT: PASS WITH FINDINGS
PRODUCTION READINESS:      NO
NEW FINDINGS:              NONE
BLOCKING FINDINGS:         NONE
PRODUCTION VALIDATION:     NOT STARTED (DEFERRED)
```

This result is not a production certification. Inherited open findings remain OPEN. Production Validation (`MASTER_PLAN.md` §34) remains deferred.

---

## 1. Review Scope

Reviewed EPIC-107 routing and product-surface work:

- public `/` landing under `(public)`
- authenticated dashboard at `/dashboard` under existing `(app)/layout.tsx`
- authenticated `/` workspace resolution (`/dashboard` / `/onboarding` / `/workspace-unavailable`)
- auth destinations, Google `callbackURL`, sign-out → `/`
- TimeEntry `revalidatePath` updates
- server-side session / workspace boundary for the new routes
- workspace isolation on the EPIC-107-touched request path
- regression of previously certified Auth, Workspace, Client, Contract, TimeEntry, Analytics, Dashboard, Reports, and Alerts workflows

Out of scope:

- application, test, or config changes (none made)
- Production Validation / Production Certification
- closing inherited findings
- a full-application security audit beyond EPIC-107 routing boundaries
- full Google consent/callback E2E (not supported; integration-only)

Reviewed commits: `39fdd70` … `752de33` (P107-00 … P107-04). HEAD at review start: `752de33`. Working tree was clean.

---

## 2. Evidence

### HEAD reviewed

| Item | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `752de33 docs(landing): synchronize EPIC-107 documentation` |
| Full SHA | `752de33aeee85bb2d9904d99512d76138995f184` |
| Working tree at start | clean |

### Quality gates executed this review

| Gate | Command | Result |
| --- | --- | --- |
| Unit | `pnpm test` | PASS — 398/398 |
| Integration | `pnpm test:integration` | PASS — 224/224 (host TZ) |
| Lint | `pnpm lint` | PASS |
| Typecheck | `pnpm typecheck` | PASS |
| E2E | `CI=true pnpm test:e2e --workers=1` | PASS — 66/66 (3.5m) |
| Build | `pnpm build` | PASS |

`TZ=America/Los_Angeles pnpm test:integration` was not re-run. FINDING-INT-001 remains OPEN on prior confirmed evidence.

### Route / browser evidence

Unauthenticated browser: `GET /` renders landing (h1 FreelanceOS, Sign in / Sign up, How it works, six capabilities, no Application nav). Direct `GET /dashboard` after sign-out lands on `/sign-in`.

Authenticated browser (register → first workspace named `P107 Review Workspace`):

| Request | Observed |
| --- | --- |
| Post-create destination | `/dashboard` inside AppShell |
| `GET /` | `/dashboard`; own workspace; landing not rendered |
| `GET /dashboard?workspaceId=00000000-0000-0000-0000-000000000001` | stays on own dashboard; workspace name unchanged |
| `GET /?workspaceId=00000000-0000-0000-0000-000000000001` | redirects to `/dashboard`; own workspace |
| Sign-out | `/` landing; Application nav absent |
| Direct `GET /dashboard` after sign-out | `/sign-in` |

### Security boundary evidence (HTTP, no follow)

Anonymous:

| Request | Status | Location / body |
| --- | --- | --- |
| `GET /` | 200 | landing HTML; Sign in / Sign up / How it works present; Monthly Summary absent |
| `GET /?workspaceId=<foreign>` | 200 | same public landing; Application nav absent |
| `GET /dashboard` | **307** | `location: /sign-in` |
| `GET /dashboard?workspaceId=<foreign>` | **307** | `location: /sign-in` |
| `GET /clients`, `GET /onboarding` | **307** | `location: /sign-in` |
| Follow `GET /dashboard` | 200 at `/sign-in` | Sign in heading; Monthly Summary absent |

Authenticated, no workspace (Better Auth sign-up, HttpOnly `better-auth.session_token`):

| Request | Status | Location |
| --- | --- | --- |
| `GET /` | **307** | `/onboarding` |
| `GET /dashboard` | **307** | `/onboarding` |
| `GET /?workspaceId=<foreign>` | **307** | `/onboarding` |
| `GET /dashboard?workspaceId=<foreign>` | **307** | `/onboarding` |
| `GET /sign-in` | **307** | `/onboarding` |

Authenticated, workspace resolved:

| Request | Status | Location / body |
| --- | --- | --- |
| `GET /` | **307** | `/dashboard` |
| `GET /?workspaceId=<foreign>` | **307** | `/dashboard` |
| `GET /dashboard` | 200 | own workspace name present; How it works absent |
| `GET /dashboard?workspaceId=<foreign>` | 200 | own workspace name present; query ignored |

RSC `GET /dashboard` without session returned HTTP 200 `text/x-component` containing `NEXT_REDIRECT` and `/sign-in`, not Monthly Summary. That is Next.js flight-protocol redirect signaling, not HTML dashboard data.

### F-104-007 runtime confirmation

Dev-server and Playwright webServer logs repeatedly recorded:

```text
Failed to load dashboard analytics: Error: NEXT_REDIRECT
    at getCurrentWorkspaceContext (src/infrastructure/workspace/current-workspace.ts:48 or :52)
    at async DashboardPage (src/app/(app)/dashboard/page.tsx:12:21)
  digest: 'NEXT_REDIRECT;replace;/sign-in;307;'
  digest: 'NEXT_REDIRECT;replace;/onboarding;307;'
```

Build also logged `DYNAMIC_SERVER_USAGE` for `/dashboard` (`headers()`). The route table marks `ƒ /` and `ƒ /dashboard` as dynamic. Navigation outcomes still follow the layout redirect (HTTP 307 / Playwright URL assertions).

No `proxy.ts` or `middleware.ts` exists. `next.config.ts` has no redirects.

---

## 3. Architecture Review

### Public `(public)` boundary

`src/app/(public)/layout.tsx` is a server layout. It calls `resolveSessionWorkspace()`. If status is `authenticated`, it `redirect(getWorkspaceResolutionPath(...))`. Otherwise it renders landing chrome (skip link, no AppShell).

`src/app/(public)/page.tsx` renders `LandingPage` only. That component is static copy: wordmark, header Account nav (Sign up / Sign in), hero, How it works, six capability cards. It does not call `getServerAuthSession`, `getCurrentWorkspaceContext`, or load workspace/user records.

`/` is not workspace-bound (`isPublicPagePath("/") === true`). Anonymous visitors do not need a workspace.

PD-LANDING-005 listed a footer as a minimum section. Implemented IA has no `<footer>` (epic-plan §14 already records footer as not implemented). Not treated as a new defect.

### Authenticated `(app)` boundary

`(app)/layout.tsx` remains the authenticated workspace gate. Next.js route groups are not themselves a security boundary; the gate is the server layout calling `getCurrentWorkspaceContext()`.

That helper (`src/infrastructure/workspace/current-workspace.ts`, `import "server-only"`):

1. reads Better Auth session from request headers
2. unauthenticated → `redirect("/sign-in")`
3. membership not `resolved` → `redirect` to `/onboarding` or `/workspace-unavailable`
4. otherwise returns `WorkspaceContext` from session user id + membership list

`resolveWorkspaceContext(userId)` takes only the trusted session user id. It does not read path or query `workspaceId`.

Layout then calls `getAuthorizedWorkspace(context.userId, context.workspaceId)` for display name. Failure renders `ErrorState` (“This workspace is not available.”) and does not render AppShell children.

A later `if (!session) redirect(SIGN_IN_PATH)` in the same layout is unreachable after a successful `getCurrentWorkspaceContext()`; the authoritative unauthenticated redirect is already inside that helper.

### `/dashboard`

`src/app/(app)/dashboard/page.tsx` is the former HomePage RSC, moved in P107-01. No nested `dashboard/layout.tsx`. No `searchParams`. Analytics load uses `getCurrentWorkspaceContext()` then `AnalyticsService.getCurrentMonthAnalytics(context)` (service-level membership guard, F-104-014) and `listClients(context, ...)`.

P107-02 deleted `(app)/page.tsx`. Build route table: `ƒ /dashboard`, `ƒ /`.

### Workspace resolution

| Session | Membership | `/` | `/dashboard` |
| --- | --- | --- | --- |
| none | — | 200 landing | 307 `/sign-in` |
| yes | 0 | 307 `/onboarding` | 307 `/onboarding` |
| yes | 1 | 307 `/dashboard` | 200 dashboard |
| yes | >1 | unit/integration: `/workspace-unavailable` | same via `getCurrentWorkspaceContext()` |

Ambiguous membership has no dedicated E2E fixture (already documented in testing-strategy). Covered by `workspace-route-access` unit tests and `authorization-isolation` integration tests.

`getWorkspaceBoundaryRedirect` is a classification helper used by tests, not by the live layouts. Live `(public)` / `(auth)` layouts always redirect authenticated sessions via `getWorkspaceResolutionPath`. `(app)` always requires a resolved context.

### Auth destination flows

| Flow | Implementation | Evidence |
| --- | --- | --- |
| Sign-in / sign-up success | `window.location.assign(DEFAULT_AUTHENTICATED_PATH)` → `/dashboard` | E2E auth + onboarding |
| Google `callbackURL` | `DEFAULT_AUTHENTICATED_PATH` | `tests/integration/auth/google-oauth.test.ts` |
| First workspace | `redirect(DEFAULT_AUTHENTICATED_PATH)` | E2E onboarding; browser |
| `(auth)` layout | authenticated → `getWorkspaceResolutionPath` | HTTP 307 `/onboarding` or `/dashboard` |
| Sign-out | `authClient.signOut()` → `router.refresh()` → `router.push(LANDING_PATH)` | E2E + browser → `/` |
| Reset-password success | `window.location.assign("/sign-in")` | E2E auth recovery |
| Unauthenticated protected routes | layout `redirect("/sign-in")` | HTTP 307 + E2E |

Sign-out is client navigation after a client auth API call. Post-sign-out protection of `/dashboard` is still server-side (307 / Playwright `/sign-in`).

### Revalidation implications

TimeEntry create/update/delete: `revalidatePath("/", "layout")` then `revalidatePath("/dashboard")` then `/reports` and `/alerts`. Layout revalidation on `/` is retained for the AppShell unread badge. Unit test `EXPECTED_PATHS` includes `/dashboard`. Mark-as-read still revalidates `/alerts` and `("/", "layout")`.

No leftover `revalidatePath("/")` page-level dashboard refresh.

---

## 4. Authorization & Security Boundary Review

**What protects `/dashboard`:** the `(app)` server layout plus `getCurrentWorkspaceContext()`, not UI hiding, not client `router.push`, and not the `(app)` folder name.

**Where:** `src/app/(app)/layout.tsx` → `getCurrentWorkspaceContext()` → `getServerAuthSession()` (Better Auth `headers()`) → `resolveWorkspaceContext(session.user.id)`. The dashboard page repeats the same helper inside a `try/catch` (F-104-007).

**Server-side:** yes for document requests. Anonymous `GET /dashboard` is HTTP **307** `location: /sign-in` before a dashboard document is served. Playwright `page.goto("/dashboard")` without a session ends at `/sign-in`.

**Absence of session:** server `redirect("/sign-in")`. Confirmed HTTP 307 and E2E `auth.spec.ts` / `app-shell.spec.ts` / `dashboard.spec.ts` / `onboarding.spec.ts`.

**Absence / invalidity of workspace:** unresolved membership redirects to `/onboarding` or `/workspace-unavailable` from the same helper. Confirmed HTTP 307 `/onboarding` for an authenticated user with zero memberships, including when `workspaceId` is supplied in the query. Layout `getAuthorizedWorkspace` failure shows ErrorState rather than AppShell data.

**URL / query manipulation:** dashboard page does not read `searchParams`. `resolveWorkspaceContext` does not accept a requested workspace id. `/?workspaceId=…` and `/dashboard?workspaceId=…` did not select another workspace or skip onboarding. Authenticated resolved users still saw their own workspace name.

**Bypass evidence:** none found on the EPIC-107 request paths exercised above. Specifically, hiding `/dashboard` from the landing, client-side redirects, and Next.js route groups were not the enforcement mechanism; HTTP 307 from the server layout was.

Layout protection is the route gate. Application-service / repository authorization (`requireWorkspaceAccess`, `getAuthorizedWorkspace`, `AnalyticsService.requireMembership`, workspace-scoped repository `where` clauses) remains the data gate. EPIC-107 did not replace the latter with the former.

Limitations of this review:

- Google full consent/callback was not E2E-automated.
- Ambiguous membership was not HTTP-probed with a live two-membership fixture.
- RSC 200 + `NEXT_REDIRECT` is the App Router flight protocol; it is not treated as a document-level bypass.
- F-104-007 still intercepts `NEXT_REDIRECT` in the page `catch`; layout still wins for navigation. Unauthenticated 307 bodies included ErrorState / `__next_error__` text, not analytics rows.

---

## 5. Workspace Isolation Review

**Workspace context:** established server-side from the session user id and membership list. Path/query identifiers are not a tenant grant (`docs/architecture.md` Authorization; unchanged by EPIC-107).

**Membership / authorization boundary:** `resolveWorkspaceContext` (0 / 1 / >1), `requireWorkspaceAccess`, `getAuthorizedWorkspace`. Dashboard analytics still go through `AnalyticsService` with membership check. Repositories remain workspace-scoped.

**ID manipulation risk on EPIC-107 routes:** `/` and `/dashboard` do not take a workspace id argument. Query `workspaceId` is ignored. Live checks:

- anonymous `/?workspaceId=` → public landing, no AppShell
- authenticated no-workspace `/?workspaceId=` and `/dashboard?workspaceId=` → 307 `/onboarding`
- authenticated resolved `/dashboard?workspaceId=<foreign>` → own workspace 200
- E2E `onboarding.spec.ts` still asserts `/?workspaceId=00000000-0000-0000-0000-000000000001` does not grant access
- E2E `time-tracking.spec.ts` and `alerts.spec.ts` workspace isolation still PASS

**Server actions / route handlers touched:** `create-first-workspace-action.ts` now redirects to `/dashboard` after a session check; it does not accept `workspaceId` from the client as authorization. TimeEntry actions still resolve context via `getCurrentWorkspaceContext()`; only revalidation paths changed. No new dashboard route handler.

No evidence that EPIC-107 introduced a workspace-isolation bypass on the reviewed boundaries.

---

## 6. Regression Review

| Suite | Result | Notes |
| --- | --- | --- |
| Unit 398 | PASS | includes route-access, workspace-route-access, navigation, landing capabilities, TimeEntry revalidation |
| Integration 224 | PASS | auth protected-boundary, Google OAuth callbackURL `/dashboard`, workspace-boundary, authorization-isolation, dashboard-page |
| E2E 66 | PASS | full Playwright suite this review |

E2E coverage executed (all PASS):

| Domain | Spec | Tests |
| --- | --- | --- |
| Alerts | `alerts.spec.ts` | 6 |
| Auth / AppShell | `auth.spec.ts`, `app-shell.spec.ts` | 8 + 2 |
| Workspace / onboarding | `onboarding.spec.ts` | 4 |
| Client | `clients.spec.ts` | 1 |
| Contract | `contracts.spec.ts` | 1 |
| TimeEntry | `time-tracking.spec.ts` | 6 |
| Dashboard | `dashboard.spec.ts`, `dashboard-accessibility.spec.ts` | 5 + 11 |
| Reports | `reports.spec.ts` | 14 |
| Alerts isolation | included in alerts spec | — |
| MVP journey | `mvp-integration-journey.spec.ts` `@release-gate` | 1 |
| Landing | `landing.spec.ts` | 7 |

No test failures. FINDING-QA-001 was not reproduced in this run; it remains OPEN / FLAKY.

---

## 7. Findings

No new findings were opened in this review.

F-104-007 is an inherited finding whose location moved with the dashboard page. It is restated under §8, not re-issued with a new ID.

---

## 8. Existing Findings Status

| ID | Prior status | This review | Blocking for EPIC-107 |
| --- | --- | --- | --- |
| FINDING-QA-001 | OPEN / TEST DEFECT / FLAKY | Not reproduced (66/66 E2E including release-gate). Remains OPEN. | No |
| FINDING-QA-002 | OPEN / APPLICATION DEFECT | Not re-tested (out of epic scope; PeriodSelector still has no custom range). Remains OPEN. | No |
| FINDING-INT-001 | OPEN / TEST DEFECT / CONFIRMED | Host TZ integration 224/224. `TZ=America/Los_Angeles` not re-run. Remains OPEN. | No |
| FINDING-INT-002 | OPEN / NOT REPRODUCED | Sign-out → `/` PASS in E2E and browser. Remains OPEN / NOT REPRODUCED. Destination change is unrelated. | No |
| FINDING-INT-003 | OPEN / NOT REPRODUCED | Password-reset E2E PASS. Remains OPEN / NOT REPRODUCED. | No |
| FINDING-UX-004 | OPEN | `PeriodSelector` still only today/week/month/year. Remains OPEN. | No |
| F-104-007 | PRE-EXISTING | **Reconfirmed** at `src/app/(app)/dashboard/page.tsx:12`. Layout still wins. Remains OPEN / NON-BLOCKING. | No |
| F-104-010 / 011 / 012 | PRE-EXISTING | Dashboard a11y E2E PASS; those assertions remain the recorded debt. Remains OPEN. | No |

Do not treat this review as closure of any row above.

---

## 9. Production Readiness

| Decision | Result |
| --- | --- |
| Engineering Review result | **PASS WITH FINDINGS** |
| Production readiness | **NO** |

PASS WITH FINDINGS means EPIC-107 routing/landing work matches the plan on the evidence above, with inherited non-blocking findings still open and no new blocking defect found.

Production readiness remains NO because Production Validation is deferred, inherited application/test findings remain open (including FINDING-QA-002), and this phase is review-only.

---

## 10. Conclusion

EPIC-107 moved the authenticated dashboard to `/dashboard` under the existing `(app)` server layout and made `/` a public landing. Unauthenticated `GET /dashboard` is a server 307 to `/sign-in`. Authenticated `GET /` is a server 307 through workspace resolution and does not render the landing. Query `workspaceId` is not treated as authorization on `/` or `/dashboard`.

No EPIC-107-specific authorization bypass was observed on the inspected code paths or on the HTTP/browser probes listed in §2. F-104-007 still logs `NEXT_REDIRECT` from the dashboard page `catch`; user-visible redirects still succeed via the layout.

Do not start Production Validation or Production Certification from this chat.
