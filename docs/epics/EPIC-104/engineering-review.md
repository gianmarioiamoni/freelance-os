# EPIC-104 — Engineering Review

**Epic:** EPIC-104 — Analytics & Dashboard  
**Release:** Release 1 — MVP  
**MASTER_PLAN identifier:** R1-E04 — Analytics & Dashboard  
**Reviewed commits:**

```text
P104-01
2ffb1c4
feat(analytics): establish analytics foundation

P104-02
6faf68b
feat(analytics): add authenticated dashboard UI

P104-03
48c3552
test(analytics): add integration tests and E2E journey
```

This review made one test-only correction, `test(analytics): align malformed workspace integration contract`, to resolve the blocking finding F-104-000. No application, schema, route, authentication, workspace, or CI change was made.

---

## 1. Executive Summary

EPIC-104 delivers a shared analytics calculation layer and the authenticated monthly dashboard.

P104-01 added `AnalyticsService`, `AnalyticsRepository`, the analytics domain types, and the period utilities in `src/lib/analytics-periods.ts`. P104-02 replaced the `/` placeholder with the analytics dashboard and the `MonthlyAnalytics`, `ClientAllocation`, and `ContractUtilization` components. P104-03 added analytics workspace-isolation and product-decision integration tests plus the Playwright dashboard and dashboard-accessibility journeys.

The delivered analytics behaviour is substantially correct. Workspace isolation is integration-proven across six scenarios, archived-client inclusion per PD-104-001 is proven at both the integration and E2E level, all-tracked-time utilization per PD-104-002 is proven, the current-month default per PD-104-003 is proven, calculations use integer minutes, zero denominators return `null`, and no revenue or commercial amount is calculated anywhere in the analytics layer.

The Epic initially reviewed as BLOCKED because the required CI integration gate was red at `48c3552`. That blocking finding (F-104-000) has been resolved by a test-only correction during this review, all six required gates are now green, and the Epic closes as **PASS WITH FINDINGS**.

---

## 2. Verdict

```text
PASS WITH FINDINGS
```

```text
Engineering status:     COMPLETE
Production readiness:   NO
Blocking findings:      NONE
```

F-104-000 was the sole blocking item and is now RESOLVED. No other finding in this review is or was blocking: the remaining seventeen EPIC-104 findings, the two newly registered planning findings, the inherited findings, and the open OBDs are all non-blocking and are recorded with their own severity and ownership. The presence of HIGH and MEDIUM severity findings does not by itself block the Epic; the block was specifically the red required CI integration gate.

### Baseline correction

The phase-closure report for P104-03 declared "Unit/Integration: 216/216 PASS". That figure was the **unit suite only**, and the integration suite was not re-verified at phase closure:

| Suite | Command | At `48c3552` | After the F-104-000 correction |
| --- | --- | --- | --- |
| Unit | `pnpm test` | PASS — 28 files / 216 tests | PASS — 28 files / 216 tests |
| Integration | `pnpm test:integration` | FAIL — 27 files / 148 tests, 1 failed, exit 1 | **PASS — 27 files / 148 tests, exit 0** |
| E2E | `CI=true pnpm test:e2e --workers=1` | PASS — 37 tests (declared) | **PASS — 37 tests, 0 failed, 0 skipped** |

The integration suite is a separate `vitest` project with its own config (`vitest.integration.config.mts`) and its own CI step. Unit, integration, and E2E counts must always be reported separately; "216 unit/integration" is not a valid combined figure.

---

## 3. Scope Delivered

| Area | Delivered |
| --- | --- |
| Shared calculation layer | `AnalyticsService` with workspace-scoped monthly, daily, client-allocation, and contract-utilization methods |
| Aggregation layer | `createAnalyticsRepository` with `workspaceId`-scoped Prisma `aggregate` / `groupBy` queries |
| Domain types | `AnalyticsPeriod`, `MonthlyAnalytics`, `ClientAllocation`, `ContractUtilization`, `DailyAnalytics`, `DailyClientBreakdown` |
| Period utilities | `getCurrentMonthPeriod`, `getMonthPeriod`, `getDateRangePeriod`, `isValidPeriod`, `isDateInPeriod`, `getPeriodDays`, `formatPeriodDisplay` |
| Dashboard route | `src/app/(app)/page.tsx` renders analytics at `/`, the authenticated default landing route |
| Dashboard components | `Dashboard`, `MonthlyAnalytics`, `ClientAllocation`, `ContractUtilization` |
| Tests | 2 unit files, 3 analytics/dashboard integration files, 2 E2E specs, 1 E2E fixture helper |

The Epic plan §4 and §22 refer to a `/dashboard` route. The authenticated dashboard destination established by EPIC-006 is `/`, labelled `Dashboard` in `src/lib/navigation.ts:20`. The implementation correctly replaced the `/` placeholder; the Epic-plan wording is stale, not the code.

---

## 4. Requirement Verification

### Analytics

| Requirement | Implementation | Evidence | Gap |
| --- | --- | --- | --- |
| Monthly total | `analytics-repository.ts` `aggregate._sum.durationMinutes` | integration + E2E | — |
| Billable | `aggregate` with `billable: true` | integration + E2E | — |
| Non-billable | `totalMinutes - billableMinutes` | integration | — |
| Billable percentage | computed inline in repository; `null` for zero total | integration + unit | Duplicated logic — F-104-002 |
| Daily average | `MonthlyAnalytics.tsx` | **none** | **F-104-001** — hardcoded `/ 30` |
| Daily analytics | `getDailyAnalytics` | integration (`analytics-isolation.test.ts`) | No production consumer — F-104-013 |
| Weekly analytics | **not implemented** | — | **F-104-013** — required by Epic-plan §6 |
| Client allocation | `getClientAllocations` grouped by `clientId` | integration + E2E | — |
| Archived clients included | `client.findMany` with no status filter | integration + E2E | — |
| Archived label | `isArchived` → `Archived` badge | integration + E2E | — |
| Contract utilization | `getContractUtilizations` grouped by `contractId` | integration + E2E | — |
| All tracked time in numerator | no `billable` filter on consumption query | integration (PD-104-002 suite) | — |
| Contracted capacity in denominator | `contract.monthlyContractedMinutes` | integration | Not scaled to partial/multi-month periods — F-104-004 |
| Unlimited / ongoing contracts | `isOngoing = contractedMinutes === null` | integration + E2E | **F-104-003** — diverges from PD-104-004 |
| Null utilization without capacity | `utilizationPercentage = null` | integration + unit | — |
| Contract validity `[validFrom, validTo)` | **not implemented** | — | **F-104-004** — BR-104-007/008/009 |
| Workspace isolation | every query carries `where: { workspaceId }` | 6 integration scenarios | Service-level guard absent — F-104-014 |
| Custom date range | `getDateRangePeriod` / `getMonthPeriod` exist, no UI | integration | Correct — explicit non-goal per Epic-plan §5 |
| Current month default | `getCurrentMonthPeriod()` | integration + E2E | **F-104-017** — ends last day of month, not today |
| Integer minutes | `Int` columns, integer arithmetic throughout | unit + integration | — |
| Workspace timezone boundaries | **not implemented** | — | **F-104-005** — `workspace.timezone` never read |

### Dashboard

| Requirement | Implementation | Evidence | Gap |
| --- | --- | --- | --- |
| Authenticated shell integration | rendered inside `(app)/layout.tsx` `AppShell` | E2E | — |
| Monthly Summary | `MonthlyAnalytics.tsx` | E2E ARIA-label assertions | — |
| Client Allocation | `ClientAllocation.tsx` | E2E | — |
| Contract Utilization | `ContractUtilization.tsx` | E2E | — |
| Responsive layout | `grid gap-6 lg:grid-cols-3`, `sm:`/`lg:` metric grid | E2E at 375 / 768 / 1024 / 1440 / 2560 px | — |
| Loading state | inherited `(app)/loading.tsx` text only | **none** | **F-104-008** — no skeletons, no per-section loading |
| Empty state | `Dashboard.tsx` guard on `totalMinutes > 0` | E2E | — |
| Error state | `try`/`catch` → `ErrorState` | **none** | **F-104-016** — failure path never exercised |
| Accessibility | ARIA labels, `role="progressbar"`, landmarks | E2E, partly unsound | F-104-010, F-104-011, F-104-012 |
| Heading hierarchy | `h1` from `PageHeader`; three `role="heading" aria-level={2}` | E2E asserts exactly three level-2 headings | F-104-012 — ARIA-emulated, not native `h2` |
| Workspace / account context | `getCurrentWorkspaceContext()`, `AppShell` labels | E2E | F-104-007 — signals swallowed by page `catch` |

---

## 5. Product Decisions

| Decision | Resolution | Implemented | Verified by |
| --- | --- | --- | --- |
| PD-104-001 | INCLUDE archived client time | YES | `analytics-product-decisions.test.ts`, `analytics-isolation.test.ts`, `dashboard-page.test.ts`, `dashboard.spec.ts` "archived client behavior in analytics" |
| PD-104-002 | ALL TIME utilization | YES | `analytics-product-decisions.test.ts` PD-104-002 suite, including a test asserting billable percentage and utilization percentage differ |
| PD-104-003 | CURRENT MONTH default | PARTIAL | integration + E2E prove current-month scoping; period ends on the last day of the month, not today — F-104-017 |
| PD-104-004 | ONGOING unlimited contracts | DIVERGENT | implemented as "no capacity denominator", not "`validTo` is null" — F-104-003 |

PD-104-001 is the strongest-evidenced decision in the Epic and correctly avoids the ACTIVE-only client join that produces F-103-002 in Time Tracking. The analytics repository selects client rows by identifier with no `status` filter (`analytics-repository.ts:136-145`, `:265-275`), and exposes `isArchived` for explicit presentation.

---

## 6. Architecture

`AnalyticsService` follows the established application-service shape: constructor-injected repository, `WorkspaceContext` as the first parameter, workspace identifier never accepted from the browser. `AnalyticsRepository` is registered in `PersistenceRepositories` and constructed by `createRepositories()`, consistent with every other repository.

The architectural requirement in MASTER_PLAN §14 — "Dashboard calculations must use the shared analytics capability. Do not create dashboard-specific versions of business calculations" — is **not** satisfied. Percentage arithmetic exists in three independent places and the shared implementations are unreachable from production code. Recorded as F-104-002.

The dashboard is a React Server Component with no client island, which is the correct default for a read-only analytics surface.

---

## 7. Historical Correctness

Analytics reads the stored `TimeEntry.contractId` and `TimeEntry.clientId` and never re-resolves them against current state, so BR-104-004 (archived-client preservation) and the `contractId` immutability established by EPIC-103 hold. Changing a client's status does not alter historical totals; this is proven by the PD-104-001 test that archives a client between two recorded entries and asserts both remain counted.

BR-104-005 and BR-104-006 hold for the numerator. They do **not** hold for the denominator: utilization reads the contract's current `monthlyContractedMinutes`, so editing contracted capacity retroactively changes historical utilization. This is the direct consequence of the inherited P102-F-001 and is documented, not resolved, per Epic-plan §11 and §21.

BR-104-007, BR-104-008, and BR-104-009 are unimplemented. Recorded as F-104-004.

---

## 8. Security and Isolation

| Invariant | Status |
| --- | --- |
| SI-104-001 — membership verified for the analytics workspace | PARTIAL — enforced transitively by `getCurrentWorkspaceContext()`; `AnalyticsService` itself trusts `context.workspaceId` (F-104-014) |
| SI-104-002 — aggregation not callable without workspace context | PASS — `WorkspaceContext` is a required parameter; `AnalyticsRepository` requires an explicit `workspaceId` |
| SI-104-003 — no foreign-workspace rendering | PASS — six integration scenarios, including identical client names across workspaces |
| BR-104-001 / BR-104-002 / BR-104-003 | PASS — every analytics query carries `where: { workspaceId }`; no route parameter or form field can influence analytics scope |

No cross-workspace leakage was found. Parameterized Prisma queries are used throughout; no raw SQL exists in the analytics layer. Client names are returned only for the authenticated workspace.

---

## 9. Build Behaviour — Dynamic Server Usage

`pnpm build` passes (exit 0) and emits, during static-page generation:

```text
Failed to load dashboard analytics: Error: Dynamic server usage: Route / couldn't be rendered
statically because it used `headers`.
  digest: 'DYNAMIC_SERVER_USAGE'
```

Verified against the code and the build route table:

- The dashboard is authenticated. `getCurrentWorkspaceContext()` → `resolveSessionWorkspace()` → `getServerAuthSession()` → `headers()`.
- Reading `headers()` makes the route dynamic by definition. The build route table confirms `ƒ /` (server-rendered on demand), so Next.js classified the route correctly and no stale static HTML is emitted.
- **The dynamic rendering is intentional and correct for an authenticated, workspace-scoped dashboard. It must not be changed to remove this message.**

What is worth recording is not the dynamic behaviour but the origin of the log line: the text `Failed to load dashboard analytics:` is EPIC-104's own `console.error` in `src/app/(app)/page.tsx:19`. The `catch` intercepts a Next.js control-flow signal and reports it as an application error. Captured as F-104-007, non-blocking.

---

## 10. Findings

### F-104-000 — integration suite failed at the reviewed commit

- **Severity:** High
- **Blocking:** No longer — was the sole blocking finding
- **Status:** **RESOLVED during this Engineering Review**
- **Type:** Test defect, red CI gate
- **Location:** `tests/integration/analytics/analytics-workspace-isolation.test.ts`
- **Description:** The test `requires valid workspace context for analytics calculation` called `getCurrentMonthAnalytics()` with `workspaceId: "invalid-workspace-id"` and asserted that empty analytics were returned. `TimeEntry.workspaceId` is `@db.Uuid`, so Prisma rejects the non-UUID value before any row is read; `withPersistenceErrors` / `mapPrismaError` map it to `InvalidPersistenceStateError` and the assertions never executed. Result at `48c3552`: `Test Files 1 failed | 26 passed (27)`, `Tests 1 failed | 147 passed (148)`, exit code 1.
- **Reproducibility:** Deterministic. Reproduced on two consecutive clean runs. The failure was a Prisma input-validation error, independent of database contents, test ordering, and wall-clock time, so this test could never have passed since it was introduced in `48c3552`.
- **Impact:** `.github/workflows/quality.yml` runs `pnpm test:integration` as a required step, so CI was red at `48c3552`. The declared phase-closure baseline did not cover this suite (see §2).
- **Product/Engineering decision applied:** **malformed workspace identifier → REJECT / FAIL CLOSED.** Failing closed on a malformed identifier is the safer contract, because silently returning empty analytics is indistinguishable from a genuinely empty period and would mask a caller defect. `AnalyticsService` validation was **not** weakened and no production code was changed; the incorrect expectation was in the test.
- **Corrective implementation:** The test now asserts the fail-closed contract using the assertion pattern already established in `tests/integration/persistence/*` — `rejects.toBeInstanceOf(InvalidPersistenceStateError)` on the error class exported from `@/domain/persistence-errors`, plus `rejects.toMatchObject({ code: "INVALID_PERSISTENCE_STATE" })` against the stable `PersistenceErrorCode` contract. No new error type was introduced and the assertion is not coupled to Prisma internals such as the underlying error code or message text. The same test now also pins the distinction that already exists in the implementation: a **malformed** identifier rejects, while a **well-formed but unknown** workspace identifier (`randomUUID()`) legitimately yields empty analytics because the scoped queries match no rows. The test count is unchanged at 148.
- **Verification:** `pnpm test:integration` → `Test Files 27 passed (27)`, `Tests 148 passed (148)`, exit code 0.

### F-104-001 — daily average divides by a hardcoded 30

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open
- **Location:** `src/components/dashboard/MonthlyAnalytics.tsx:57-58`
- **Description:** The Daily Average metric computes `analytics.totalMinutes / 30` for every period. February is overstated by roughly 7 percent and 31-day months are understated by roughly 3 percent. `getPeriodDays(period)` exists in `src/lib/analytics-periods.ts`, is unit-tested for 30-day, single-day, 7-day, and leap-February periods, and is never called from production code.
- **Impact:** A displayed figure that is not deterministic with respect to its own period, contrary to BR-104-010 and to the Epic gate "all analytics calculations mathematically deterministic". No test asserts the Daily Average value, in any suite.

### F-104-002 — percentage calculations duplicated; shared implementations unreachable

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open
- **Description:** Billable, allocation, and utilization percentages are computed inline in `analytics-repository.ts:48`, `:285`, `:350-352`. The non-billable percentage is computed a second time inside JSX at `MonthlyAnalytics.tsx:47-50`. `AnalyticsService.calculateBillablePercentage`, `calculateUtilizationPercentage`, and `isOngoingUtilization` implement the same rules a third time and are referenced **only** from `tests/unit/application/analytics/analytics-service.test.ts`.
- **Impact:** Violates Epic-plan §23 ("Analytics calculations consume shared services — no duplicate business logic") and MASTER_PLAN §14. The three sites can drift independently, and the unit tests covering the statics prove nothing about any production path. R1-E05 Reporting is required to reproduce dashboard figures exactly; it will consume the service, whose statics are not the code that produced the dashboard numbers.

### F-104-003 — `isOngoing` semantics diverge from PD-104-004

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open — requires Product Owner clarification
- **Description:** PD-104-004 defines an ongoing contract as one where `validTo` is null. The implementation sets `isOngoing = contract.monthlyContractedMinutes === null` (`analytics-repository.ts:349`). These are independent columns. Consequences: a genuinely open-ended contract that has contracted capacity renders a percentage and is not marked ongoing, while a finite or already-expired contract without capacity renders the `→ Ongoing` label.
- **Test evidence locking the divergence:** `dashboard-page.test.ts:52-60,137` asserts `isOngoing === false` for a contract created with `validTo: null`; `analytics-isolation.test.ts:230` asserts `isOngoing === true` for the shared fixture contract, whose `validTo` is `2026-07-01`. Every other product-decision test sets both columns to null together or both non-null together, so no test distinguishes the two semantics.
- **Also unimplemented:** PD-104-004's `validFrom → validTo` and `validFrom → Ongoing` display. The component renders consumed hours followed by `→ Ongoing` and never renders contract dates.
- **Assessment:** The implemented behaviour is coherent with PD-104-002's boundary condition ("if contractual capacity is not semantically available, do not invent a denominator") and with PD-104-004's own implementation note. The decision *statement* is what conflicts. This is a decision-text versus code reconciliation, not a silent defect, but the user-visible `Ongoing` label is currently misleading for expired capped-less contracts.

### F-104-004 — contract validity rules are not applied to utilization

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open
- **Description:** `getContractUtilizations` derives the contract set purely from `contractId` values appearing on in-period time entries and applies no `[validFrom, validTo)` filtering, so BR-104-007, BR-104-008, and BR-104-009 are unimplemented and untested. The shared integration fixture contract is valid `2026-01-01` to `2026-07-01`, yet `analytics-isolation.test.ts:146-199` records September entries against it and asserts a 10 percent utilization against its 4800-minute denominator — the suite asserts the BR-104-009 violation as correct behaviour.
- **Secondary effect:** contracts valid for the period with zero consumption never appear, because the contract list is derived from consumption. A contract with capacity and no tracked time is invisible rather than shown at `0h / 80h (0%)`, which does not match the Epic-plan §14 expectation for the utilization section.
- **Mitigating factor:** at the application layer `validateContractForTimeEntry` prevents recording an entry against an out-of-validity contract, so the fixture scenario is not reachable through the UI. The gap is in the analytics layer's own guarantees, not in currently reachable data.
- **Also unaddressed:** `monthlyContractedMinutes` is a *monthly* capacity used directly as the denominator for any period the service is given. Correct for the current-month default; unscaled for the partial and multi-month periods the service already accepts. Related to the open OBD-012.

### F-104-005 — workspace timezone is not used for period boundaries

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open
- **Description:** Epic-plan §12 requires month boundaries computed in `workspace.timezone`, and the column exists and is populated (`Europe/Rome` in fixtures). No analytics code reads it. `getCurrentMonthPeriod()` derives the year and month from the server's local clock via `now.getFullYear()` / `now.getMonth()` and then builds UTC dates, so the selected month depends on the server timezone at month boundaries. `formatPeriodDisplay` compounds this by reading UTC-constructed dates with local getters, producing the wrong month name on servers at a negative UTC offset.
- **Impact:** Epic-plan §16 required period-boundary tests "across timezones"; none exist, in any suite. This substantiates the planning concern recorded in §11 of this review as F-104-P-002.

### F-104-006 — analytics integration tests are coupled to the current calendar month

- **Severity:** High
- **Blocking:** No — the suite is green on this axis until 2026-09-30
- **Status:** Open
- **Description:** Roughly twenty integration tests hardcode `Date.UTC(2026, 8, …)` while asserting against `getCurrentMonthAnalytics()`, which resolves the period from the system clock. Affected files: `tests/integration/analytics/analytics-product-decisions.test.ts` (all tests; line 422 states "This test assumes current month is September 2026"), `tests/integration/analytics/analytics-workspace-isolation.test.ts`, and `tests/integration/dashboard/dashboard-page.test.ts`. From 2026-10-01 the fixtures fall outside the resolved period and every non-zero assertion fails.
- **Contrast:** `tests/integration/analytics/analytics-isolation.test.ts` is immune because it passes explicit periods built with `getDateRangePeriod(...)` instead of relying on the current month.
- **Impact:** The declared P104-03 evidence is valid only within the month it was produced. This is the same defect class the Epic corrected in `tests/e2e/time-tracking.spec.ts` during P104-03, left uncorrected in the analytics integration suite.

### F-104-007 — page-level `catch` swallows Next.js control-flow signals

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open, latent
- **Location:** `src/app/(app)/page.tsx:10-21`
- **Description:** The whole page body, including `getCurrentWorkspaceContext()`, is inside a `try` whose `catch` logs and returns `ErrorState`. Next.js implements both `redirect()` and dynamic-usage detection by throwing control-flow errors. The `catch` therefore intercepts `NEXT_REDIRECT` raised by `getCurrentWorkspaceContext()` for unauthenticated sessions and unresolved workspaces, and intercepts `DYNAMIC_SERVER_USAGE` during prerender — the latter is directly observable in the build output (§9).
- **Runtime evidence:** the E2E run performed for this review captured the interception directly in the dev-server log, repeatedly:

  ```text
  Failed to load dashboard analytics: Error: NEXT_REDIRECT
      at getCurrentWorkspaceContext (src/infrastructure/workspace/current-workspace.ts:48:13)
      at async HomePage (src/app/(app)/page.tsx:11:21)
    digest: 'NEXT_REDIRECT;replace;/onboarding;307;'
  ```

  The workspace-unresolved redirect to `/onboarding` is being caught and logged as an application error by EPIC-104's own handler. This raises the finding from inferred to **confirmed at runtime**; the `DYNAMIC_SERVER_USAGE` interception in §9 is the build-time instance of the same defect.
- **Why it is not currently user-visible:** `(app)/layout.tsx:20` calls the same `getCurrentWorkspaceContext()` outside any `try`, so the redirect propagates from the layout and wins. All 37 E2E tests pass, and `tests/e2e/dashboard.spec.ts:150-151` proves an unauthenticated request to `/` still lands on `/sign-in`. The navigation outcome is correct; only the page-level error path is wrong.
- **Impact:** This is the same anti-pattern as F-103-001, which EPIC-103 identified as a genuine application defect and resolved in P103-03. That review noted no lint rule enforces the constraint. The risk is that the dashboard's authorization and workspace-loss redirects — Epic-plan §14 requires both — are protected only by a coincidence of layout ordering.

### F-104-008 — specified loading behaviour is not implemented

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open
- **Description:** Epic-plan §14 specifies skeleton placeholders per analytics section, independent per-section loading states, and progressive enhancement. None exist. The dashboard renders in a single blocking await with no `Suspense` boundary; the only loading surface is the route-level `(app)/loading.tsx` inherited from EPIC-006, which renders the text `Loading…`.
- **Impact:** Epic-plan §26 lists "Loading, empty, and error states implemented and functional" as a Phase 2 acceptance criterion. Loading is unmet as specified and untested in every suite.

### F-104-009 — performance acceptance criteria are not evidenced

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open
- **Description:** Success criteria §3 and acceptance criteria §26 require the dashboard to load within 2 seconds. The only performance assertion is `tests/e2e/dashboard.spec.ts:310`, `expect(loadTime).toBeLessThan(10000)`, measured on a workspace with **no time entries** — it cannot detect an analytics-query regression because it executes no meaningful aggregation. The §16 scalability target (100 clients, 50 contracts, 1000 time entries), the query-execution-time measurement, and the memory check were not implemented.
- **Impact:** The Phase 3 criterion "Performance baseline documented for analytics query execution" is unmet, and the planning-stage analytics-performance concern recorded as F-104-P-001 in §11 remains entirely unevidenced.

### F-104-010 — several accessibility assertions cannot fail

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open
- **Location:** `tests/e2e/dashboard-accessibility.spec.ts`
- **Description:** Four distinct unsound patterns:
  1. `:364` focus indicators — `window.getComputedStyle(el, ':focus')` passes a pseudo-*class* where the API accepts only a pseudo-*element*, so the returned style is the element's base style. The test cannot detect a missing focus ring.
  2. `:281` color independence and contrast — injects rules inside `@media (prefers-contrast: high)`, which never activates under the default Playwright emulation, and then asserts only that existing content is visible. No contrast or color-independence property is measured.
  3. `:153` text scaling — `document.body.style.zoom = '2'` does not reproduce 200 percent browser zoom for the subsequent `documentElement.scrollWidth` comparison, so the no-horizontal-scroll claim at 200 percent zoom is unproven.
  4. Vacuous conditional assertions at `:67` (`if (summaryBox && clientBox)`), `:352` (`if (srElementCount > 0)`), and `:406` (`if (await skipLink.isVisible())`) — each can pass while asserting nothing.
- **Also:** no automated accessibility scan (for example axe-core) is present anywhere in the repository.
- **Impact:** The sound parts of the suite are genuinely valuable — the three-level-2-heading count at `:204-210`, the mobile no-horizontal-overflow check at `:72`, the 40-pixel touch-target check at `:91`, and the textual utilization label at `:322` are all real evidence. The four patterns above inflate the apparent accessibility coverage and should not be cited as proof of the §15 baseline.

### F-104-011 — description-list markup without a `dl` ancestor

- **Severity:** Low
- **Blocking:** No
- **Status:** Open
- **Location:** `src/components/dashboard/MonthlyAnalytics.tsx:23-63`
- **Description:** Four `dt`/`dd` pairs are rendered inside plain `div` elements with no `dl` ancestor. This is invalid HTML and conveys no description-list semantics to assistive technology, so Epic-plan §15 ("Analytics data announced as data tables or description lists") is not met by structure. The per-metric `aria-label` values still convey the information, which is why no test detects this.

### F-104-012 — residual accessibility-specification gaps

- **Severity:** Low
- **Blocking:** No
- **Status:** Open
- **Description:** Three §15 requirements are unmet:
  - `ClientAllocation.tsx:45` applies `truncate` to client names with no `title` attribute or visually-hidden full text, against "never truncate client names without full-text alternatives". The sibling `aria-label` values do contain the full name, so the gap is visual rather than total.
  - The "Under limit" / "Over limit" pairing is only half-implemented: `ContractUtilization.tsx:87-90` renders an over-capacity alert, and there is no textual under-limit indicator.
  - Section headings are `div role="heading" aria-level={2}` on `CardTitle` (a `div`), not native `h2`. This is WCAG-valid and E2E-proven, but Epic-plan §15 asks for semantic HTML heading hierarchy, and `PageHeader` and `EmptyState` already use native `h1` and `h2`.

### F-104-013 — weekly aggregation absent; daily aggregation unconsumed

- **Severity:** Low
- **Blocking:** No
- **Status:** Open
- **Description:** Epic-plan §6 lists "Weekly Totals: GROUP BY WEEK(workDate)" among the required calculations. No weekly aggregation exists in `AnalyticsRepository`, `AnalyticsService`, or `analytics-periods.ts`. Separately, `getDailyAnalytics` is fully implemented and integration-tested but has no production consumer; likewise `getMonthPeriod`, `getDateRangePeriod`, `isDateInPeriod`, and `getPeriodDays` are referenced only from tests.
- **Assessment:** Defensible as foundation for R1-E05, since the Epic's stated purpose is a shared layer for future reporting and alerts. Recorded so that R1-E05 planning knows weekly aggregation is still to be built.

### F-104-014 — `AnalyticsService` does not verify workspace membership

- **Severity:** Low
- **Blocking:** No
- **Status:** Open
- **Description:** SI-104-001 requires that serving analytics verify caller membership in the target workspace. `AnalyticsService` accepts a `WorkspaceContext` and forwards `context.workspaceId` without any membership check; the guarantee comes entirely from `getCurrentWorkspaceContext()`, the only current caller. `tests/integration/analytics/analytics-workspace-isolation.test.ts:213-226` documents that an arbitrary workspace identifier is not rejected on authorization grounds.
- **Impact:** No leakage today — the single caller resolves context server-side, and unknown workspaces return empty results. The concern is forward-looking: this service is designated authoritative for R1-E05 Reporting, R1-E06 Alerts, and the future AI layer, and it offers those callers no guard of its own. Compare `getAuthorizedWorkspace`, used by `(app)/layout.tsx`.

### F-104-015 — locale-dependent period formatting and assertion

- **Severity:** Low
- **Blocking:** No
- **Status:** Open
- **Description:** `formatPeriodDisplay`'s non-full-month branch (`analytics-periods.ts:90`) uses `toLocaleDateString()` with no explicit locale, so output follows the runtime locale. `tests/unit/lib/analytics-periods.test.ts:216-217` asserts `9/15/2026`, making the unit suite dependent on an `en-US` runtime. Not currently reachable from the dashboard, which only ever renders full-month periods.

### F-104-016 — the analytics error path is untested

- **Severity:** Low
- **Blocking:** No
- **Status:** Open
- **Description:** Epic-plan §16 requires E2E coverage for "Error Handling: Simulate analytics failure → verify error state → recovery path". The test named `empty period handling and error recovery` (`dashboard.spec.ts:263`) simulates no failure; it navigates to Time Tracking and back and asserts the empty state. The `ErrorState` branch of `page.tsx` is exercised by no test in any suite, and `ErrorState`'s message is not asserted anywhere.

### F-104-017 — PD-104-003 period end diverges from the decision text

- **Severity:** Low
- **Blocking:** No
- **Status:** Open — documentation and code reconciliation
- **Description:** PD-104-003 states the default period spans "from the first day of the current calendar month **through today**". `getCurrentMonthPeriod()` returns the first through the **last** day of the month (`analytics-periods.ts:9-10`). The Epic plan is internally inconsistent: §12 "Default Period Boundaries" says "1st to last day of month" while §12's PD-104-003 restatement and the §12 code sketch both say `workDate <= today`.
- **Impact:** Future-dated entries inside the current month are included in the default view, whereas PD-104-003 says future entries should appear only when the user explicitly selects a future period. Low impact while the dashboard offers no period selector. Requires deciding which text is canonical before R1-E05 reuses the period semantics.

### F-104-018 — custom date range (verification note, not a finding)

Custom date-range selection was verified as an **explicit non-goal** (Epic-plan §5, deferred to R1-E05). The shared layer already provides `getDateRangePeriod` and `getMonthPeriod`, and `AnalyticsService` accepts arbitrary periods, but no route parameter or UI control exposes period selection. Correct as delivered. Note that F-104-004's unscaled monthly denominator and F-104-017's period-end semantics both become material as soon as R1-E05 exposes arbitrary ranges.

---

## 11. Findings Carried Forward from Planning

Two findings were raised during EPIC-104 planning but were **never recorded in the repository**. A repository-wide search for `F-104-P-001` and `F-104-P-002` returns zero matches in code, docs, `MASTER_PLAN.md`, and the Epic plan. They are formally registered here.

### F-104-P-001 — analytics query performance

- **Severity:** Low
- **Blocking:** No
- **Status:** Open, **unevidenced**
- **Description:** Concern that the analytics aggregation path may not scale. Structurally, `getMonthlyAnalytics` issues six queries per dashboard render (two totals, two client groupings plus a client lookup, one contract grouping plus a contract lookup) and `getDailyAnalytics` issues five. The supporting indexes exist: `TimeEntry(workspaceId, workDate)`, `TimeEntry(workspaceId, clientId, workDate)`, and `TimeEntry(workspaceId, contractId, workDate)`. No measurement was taken, so the concern can neither be confirmed nor closed — see F-104-009.

### F-104-P-002 — timezone complexity

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open, **confirmed**
- **Description:** Concern that timezone handling for period boundaries would be a source of error. Confirmed by implementation: `workspace.timezone` is never read and month boundaries derive from the server's local clock. Substantiated in detail as F-104-005.

---

## 12. Inherited Findings

None of the findings below is owned by EPIC-104, and none is closed by it.

| Finding | Origin | Status | Classification | Relationship to EPIC-104 |
| --- | --- | --- | --- | --- |
| P102-F-001 | EPIC-102 | Open | E — still open | **Affected.** Utilization reads live `Contract.monthlyContractedMinutes`, so editing capacity retroactively changes historical utilization. Documented per Epic-plan §11 / §21 and correctly not resolved |
| F-103-002 | EPIC-103 | Open in Time Tracking | E — still open, **not inherited by analytics** | Analytics deliberately does not reuse the ACTIVE-only client join; archived clients are included and labelled, proven at integration and E2E level. The divergence is intentional per PD-104-001, and the two surfaces now differ by design |
| F-103-001 | EPIC-103 | Resolved in P103-03 | C — resolved, **pattern recurs** | The `redirect()`-inside-`catch` class reappears in `(app)/page.tsx`; recorded as the new F-104-007 rather than reopening F-103-001 |
| F-103-003 | EPIC-103 | Open / unverified | D — not applicable | Time-entry form only |
| F-103-004 | EPIC-103 | Open, mitigated | D — not applicable | Documentation reconciliation only |
| F-103-005 | EPIC-103 | Open | D — not applicable | Analytics follows the fail-closed pattern as directed; the unused error classes remain unused |
| F-103-006 | EPIC-103 | Open | D — not applicable | `/time-tracking` route only. Epic-plan §12 asked analytics not to inherit ambiguous invalid-date behaviour; analytics exposes no date parameter, so the concern does not arise |
| F-103-P-001 | EPIC-103 | Open | D — not applicable | Depends on OBD-008 |
| F-103-P-002 | EPIC-103 | Open | D — not applicable | Analytics issues its own aggregation queries |
| F-004-001 | EPIC-004 | Open | D — not applicable | Analytics creates no workspace |
| EPIC-003 F-001 | EPIC-003 | Open | D — not applicable | Identity-linking product decision |
| EPIC-003 F-002 | EPIC-003 | Open | D — not applicable | Google OAuth CI limitation |
| EPIC-003 F-003 | EPIC-003 | Open | D — not applicable | Remains a production deployment blocker |
| EPIC-003 F-004 | EPIC-003 | Open | D — not applicable | CI Playwright environment |
| EPIC-002 F-P2-003 | EPIC-002 | Open | D — not applicable | `Notification.type` unconstrained |
| EPIC-002 F-P2-004 | EPIC-002 | Open | E — indirectly relevant | `TimeEntry.contractId` is required, so every entry contributes to exactly one contract's utilization; no unattributed-time case exists |
| EPIC-002 F-P2-005 | EPIC-002 | Open | E — low relevance | Roles are `OWNER` / `MEMBER` only, so any member sees full workspace analytics, including cross-client allocation percentages. Relevant to the privacy note in Epic-plan §18 and to OBD-009 |
| EPIC-002 F-P3-002 | EPIC-002 | Open | D — not applicable | Alert client/contract pairing |
| G-002 / G-004 / G-006 | EPIC-005 / EPIC-006 | Open | D — not applicable | Unchanged |

---

## 13. Open Business Decisions

EPIC-104 closed **no** OBD. OBD-001 through OBD-012 all remain open, and OBD-013 through OBD-016 remain proposals and not policy.

| ID | Relevance to EPIC-104 |
| --- | --- |
| OBD-002 — monetary rounding | **Relevant.** No monetary amount is computed, so the decision is not required. However `AnalyticsService.formatPercentage` applies `Math.round` to displayed percentages with no documented rounding policy, and the underlying values are kept unrounded in the domain types. The rounding surface should be settled with OBD-002 before R1-E05 publishes figures |
| OBD-012 — contract-hour rollover / expiry | **Relevant, directly.** Utilization compares period consumption against current monthly capacity with no rollover, carry-over, or expiry semantics. Closely coupled to F-104-004 |
| OBD-006 — capacity warning threshold | Deferred to R1-E06. The dashboard uses an undocumented 80 percent bar-color change in `ContractUtilization.tsx:76`, which must not be mistaken for an accepted threshold |
| OBD-009 — workspace roles | Low relevance; see EPIC-002 F-P2-005 above |
| OBD-015 | Related — PD-104-001 resolves archived-client analytics inclusion without promoting OBD-015 |
| OBD-016 | Related — underlies P102-F-001 and therefore utilization denominator stability |
| OBD-001, 003, 004, 005, 007, 008, 010, 011, 013, 014 | Not applicable to this Epic |

Per the Epic plan and the EPIC-103 recommended next step, none of these was promoted or closed.

---

## 14. Documentation Review

At the reviewed commit, the canonical documentation set does not reflect the implemented analytics layer. Every document below stops at EPIC-103.

| Document | Status | Evidence |
| --- | --- | --- |
| `docs/epics/EPIC-104/epic-plan.md` | STALE | Header still reads `**Status:** PLANNING`; §4 / §22 refer to a `/dashboard` route that does not exist; §12 contradicts PD-104-003 (F-104-017) |
| `docs/epics/EPIC-104/engineering-review.md` | Created and updated by this review | Records the F-104-000 resolution and the green gate |
| `MASTER_PLAN.md` | STALE | `:7` and `:137-139` still read "EPIC-103 complete → R1-E04"; `:158` MVP line ends at EPIC-103; `:1717-1729` still instructs creating the EPIC-104 plan; `:1777-1781` still `phase: planning` |
| `MASTER_PLAN.md` §14 scope | **DIVERGENT** | `:693-700` still lists `estimated revenue` and `current alerts` in R1-E04 scope. The Epic plan declared both explicit non-goals (§5: revenue deferred; alerts to R1-E06). Unreconciled scope divergence that must be settled, not silently dropped |
| `README.md` | STALE | `:7` names EPIC-103 as latest and explicitly states "No … analytics, dashboard, or reporting is implemented" |
| `CHANGELOG.md` | STALE | Most recent `Unreleased` entry is EPIC-103; no analytics or dashboard entry |
| `docs/architecture.md` | STALE | `:3` ends at EPIC-103; §5.6 Analytics (`:316-333`) remains conceptual with no `AnalyticsService` / `AnalyticsRepository`; §14.2 (`:779`) still calls dashboard future work; §14.4 (`:804`) still calls `/` a structural placeholder |
| `docs/domain-model.md` | STALE | No analytics section and no PD-104-001 archived-client analytics rule; `:165` documents the archived-client rule for Time Tracking only |
| `docs/storage.md` | STALE | `AnalyticsRepository` absent; implementation-status changelog (`:121-134`) ends at EPIC-103. The supporting indexes at `:960-970` are documented, but only as generic recommendations |
| `docs/testing-strategy.md` | STALE | `:3` ends at EPIC-103; counts at `:103-104` still 164 / 119 / 21; §26 Dashboard E2E (`:1242-1272`) still aspirational with no "Implemented by EPIC-104" marker; no analytics test files listed |

No documentation was changed by this review beyond this file. The consolidated synchronization of the documents above is deliberately deferred until after the gate is green, and is the first item of §17.

---

## 15. Production-Readiness Limitations

EPIC-104 engineering completion is not production readiness. Outstanding beyond this Epic:

- Formal UX review of the dashboard, and a real accessibility audit that does not rely on the unsound assertions in F-104-010.
- A genuine performance baseline with realistic data volumes (F-104-009), and production monitoring of analytics query time.
- Timezone correctness for period boundaries (F-104-005) before any customer outside the server's timezone is onboarded.
- Inherited production blockers unchanged: EPIC-003 F-003 (password-reset email provider), EPIC-003 F-001 (identity linking), P102-F-001 (commercial-terms mutability).
- Production workspace-isolation audit and a security review of analytics data exposure, including the cross-client allocation visibility noted under EPIC-002 F-P2-005.

---

## 16. Epic Verdict

| Dimension | Result |
| --- | --- |
| Scope compliance | PASS — no revenue or commercial amount computed; non-goals respected |
| Architecture | PASS WITH FINDINGS — service and repository patterns followed; shared-calculation requirement violated (F-104-002) |
| Domain correctness | PASS WITH FINDINGS — F-104-001, F-104-003, F-104-004 |
| Historical correctness | PASS — stored `clientId` / `contractId` respected; denominator limited by inherited P102-F-001 |
| Workspace isolation | PASS |
| Authorization | PASS WITH FINDINGS — transitive only at the service boundary (F-104-014) |
| UI architecture | PASS — RSC-only read surface |
| Validation / states | PASS WITH FINDINGS — loading unmet as specified (F-104-008); error path untested (F-104-016) |
| Accessibility baseline | PASS WITH FINDINGS — real heading, landmark, and textual-alternative evidence; unsound assertions must not be cited (F-104-010, F-104-011, F-104-012) |
| Unit tests | PASS — 28 files / 216 tests |
| Integration tests | PASS — 27 files / 148 tests, 0 failed, exit code 0 |
| E2E tests | PASS — 37 tests, 0 failed, 0 skipped |
| Test durability | FINDING — F-104-006, non-blocking, materially invalid from 2026-10-01 |
| Build | PASS — exit 0; dynamic rendering of `/` intentional and correct (§9) |
| CI | GREEN — all six `quality.yml` gate steps pass |
| Security | PASS |
| Documentation | FINDING — canonical documents stale (§14); consolidated sync is the next action |
| New EPIC-104 findings | F-104-000 (resolved), F-104-001 … F-104-017 open, plus newly registered F-104-P-001 and F-104-P-002 |
| Blocking findings | **NONE** |
| Epic engineering completion | **YES** |
| Full production readiness | NO |

```text
PASS WITH FINDINGS
```

The analytics and dashboard behaviour required by EPIC-104 is substantially implemented and genuinely proven for workspace isolation and for product decisions PD-104-001, PD-104-002, and PD-104-003. F-104-000 was a verification failure rather than a product defect, and was resolved without touching the analytics implementation: the fail-closed contract for a malformed workspace identifier was affirmed and the incorrect test expectation corrected.

The seventeen remaining EPIC-104 findings and the two registered planning findings are all non-blocking and remain open with the severity and ownership recorded in §10, §11, §12, and §13. None was reclassified, weakened, or closed in order to reach this verdict. Two deserve scheduling attention despite being non-blocking: F-104-006, because the integration evidence becomes materially invalid on 2026-10-01, and F-104-001, because it is a visible numerical inaccuracy.

---

## 17. Recommended Next Step

```text
SYNCHRONIZE DOCUMENTATION, THEN PROCEED TO R1-E05
```

Required to complete the EPIC-104 lifecycle:

1. Apply the consolidated documentation synchronization for the documents listed in §14 — `MASTER_PLAN.md`, `README.md`, `CHANGELOG.md`, `docs/architecture.md`, `docs/domain-model.md`, `docs/storage.md`, `docs/testing-strategy.md`, and the EPIC-104 `epic-plan.md` status header. Record only what is implemented; invent nothing.
2. Reconcile the MASTER_PLAN §14 R1-E04 scope divergence — `estimated revenue` and `current alerts` — explicitly rather than by omission.
3. Register F-104-001 … F-104-017 and F-104-P-001 / F-104-P-002 in the MASTER_PLAN technical-debt section, with F-104-006 flagged as expiring on 2026-10-01.

Recommended before R1-E05 planning:

4. Product Owner clarification on F-104-003 (PD-104-004 `validTo` versus capacity semantics) and F-104-017 (PD-104-003 period end), since R1-E05 Reporting will reuse both semantics and will expose the arbitrary date ranges that make F-104-004's unscaled monthly denominator material.
5. Schedule F-104-006 and F-104-001 as the first EPIC-104 follow-ups.

Do not, in the follow-up work: rebuild the Client, Contract, Time Tracking, UI, or testing/CI stack; close OBD-001 through OBD-012; promote proposed OBD-013 through OBD-016; resolve P102-F-001 by adding commercial snapshots; fix EPIC-002, EPIC-003, or EPIC-004 findings; or alter the dynamic rendering of `/` to suppress the build message described in §9.

---

## Review Evidence

All six gates were run in this review, in the order used by `.github/workflows/quality.yml`, after the F-104-000 correction.

| Command | Result |
| --- | --- |
| `pnpm lint` | PASS — exit 0 |
| `pnpm typecheck` | PASS — exit 0 |
| `pnpm test` | PASS — 28 files / 216 tests, exit 0 |
| `pnpm test:integration` | PASS — 27 files / 148 tests, 0 failed, exit 0 |
| `pnpm build` | PASS — exit 0; `ƒ /` dynamic; `DYNAMIC_SERVER_USAGE` message reproduced (§9) |
| `CI=true pnpm test:e2e --workers=1` | PASS — 37 passed, 0 failed, 0 skipped, 2.1 min |

Counts are reported per suite. Unit (216), integration (148), and E2E (37) are three separate suites and must never be combined into a single figure.

Reviewed commits: `2ffb1c4`, `6faf68b`, `48c3552`, plus the F-104-000 test correction recorded in §10.
