# EPIC-110 — R1 Release Consolidation & Freeze

**Epic:** EPIC-110
**Release:** R1 consolidation (post EPIC-108 / EPIC-109)
**Status:** P110-00 AUDIT COMPLETE — planning only
**HEAD:** `7c4e8379994ef32e7c1e27ab468040ba3735221c`

```text
PLANNING:              P110-00 COMPLETE
IMPLEMENTATION:        NOT STARTED
R1 FREEZE:             NOT DECLARED
NEW PRODUCT SCOPE:     FORBIDDEN
```

This Epic is additive. It does not rewrite `MASTER_PLAN.md` §33 / §34 / §35, R1 certification, EPIC-108 closure, or EPIC-109 closure.

---

## Objective

Consolidate the **current certified R1** for freeze.

- Audit every still-open finding/debt item.
- Give every item an explicit disposition. No ambiguously OPEN residue.
- Target: **actionable R1 findings = 0**, not OPEN count = 0.
- Do not add product capabilities, start R2, or redesign domains.

---

## Non-Goals

- Revenue, billing, invoice lifecycle, CSV/PDF export
- Calendar view, copy-previous
- Workspace roles, email-notification expansion, Google account linking
- Capacity rollover/expiry (OBD-012)
- Reopening CLOSED EPIC-108 / EPIC-109 findings without a regression
- Declaring R1 frozen in this phase
- Changing `src/`, tests, schema, or dependencies in P110-00

---

## Baseline

| Field | Value |
|---|---|
| HEAD | `7c4e8379994ef32e7c1e27ab468040ba3735221c` |
| Last commit | `docs(epic-109): close calendar-date hardening` |
| R1 | GRANTED (`docs/release/production-certification.md`) |
| Candidate recorded at §35 | `2b58af4` |
| EPIC-108 | CLOSED — ER PASS WITH FINDINGS |
| EPIC-109 | CLOSED — ER PASS |
| `src/` TODO/FIXME | none |

Do not reset, revert, or rewrite history.

---

## Current Certified State

Do not reopen unless repository evidence shows a regression:

CLOSED: FINDING-108-ER-001, F-104-006, F-004, FINDING-UX-004, FINDING-QA-002, FINDING-INT-001, FINDING-QA-001, FINDING-INT-002, FINDING-INT-003, F-104-007, F-104-010, F-104-011, F-104-012, FINDING-108-001, FINDING-P04-001, FINDING-P04-003, FINDING-UX-001…003 / 005…009.

ACCEPTED: FINDING-P04-002 (BY DESIGN).

EPIC-109 confirmed: Time Tracking default today = UTC calendar date; reporting current periods = `Workspace.timezone`; custom range = UTC getters; no production timezone change.

Production (historical §34/§35, not re-run here): Vercel, Neon, Google OAuth, Gmail SMTP password reset, F-004 CLOSED.

---

## Findings & Debt Audit

Dispositions: **FIX NOW** | **VERIFY** | **ACCEPT** | **DEFER** | **HISTORICAL**.

### Still listed OPEN in current MASTER_PLAN debt (authoritative current register)

| ID | Title | Origin | Category | Current existence | R1 relevance | Disposition |
|---|---|---|---|---|---|---|
| F-103-002 | Archived-client entries omitted from time-tracking lists | EPIC-103 | APPLICATION | `loadClientsAndContracts()` ACTIVE-only join still drops archived clients from daily/weekly UI; edit still loads | Yes — R1 rule “existing entries remain readable” fails in presentation | **FIX NOW** |
| F-103-003 | Contract select may stay stale after client/date change | EPIC-103 | UX | Uncontrolled `defaultValue`; never verified | Integrity OK (server rejects). UX only | **VERIFY** |
| F-103-005 | Unused TimeEntry error classes | EPIC-103 | ARCHITECTURE | Dead exports; isolation is fail-closed not-found | None | **ACCEPT** |
| F-103-006 | Invalid `?date=` falls back to today | EPIC-103 | APPLICATION | `parseDate` still silent fallback | No data-integrity impact; accepted for MVP | **ACCEPT** |
| F-103-P-001 | TimeEntry mutations not audited | EPIC-103 | PRODUCT | No audit trail | Blocked on OBD-008 (R2) | **DEFER** |
| F-103-P-002 | Load all clients/contracts per render | EPIC-103 | ARCHITECTURE | Confirmed at MVP volume | Not freeze-blocking | **ACCEPT** |
| F-104-001 | Daily average `/30` | EPIC-104 | HISTORICAL | **Code already uses `getPeriodDays` (P105-02)** | Register stale OPEN | **HISTORICAL** + P110-04 register |
| F-104-002 | Percentage logic duplicated | EPIC-104 | HISTORICAL | **UI uses `AnalyticsService.formatPercentage` (P105-02)** | Register stale OPEN | **HISTORICAL** + P110-04 register |
| F-104-003 | `isOngoing` vs PD-104-004 | EPIC-104 | HISTORICAL | **Resolved PD-105-004** (`validTo === null`) | Register stale OPEN | **HISTORICAL** + P110-04 register |
| F-104-004 | Contract validity unapplied | EPIC-104 | HISTORICAL | **P105-04 pro-rata + relevance list** | Register stale OPEN | **HISTORICAL** + P110-04 register |
| F-104-005 | Workspace timezone unused | EPIC-104 | HISTORICAL | **P105-03 `Workspace.timezone`** | Register stale OPEN | **HISTORICAL** + P110-04 register |
| F-104-008 | No loading skeletons | EPIC-104 | UX | No `Suspense`/skeletons under `(app)` | Not a release blocker | **ACCEPT** |
| F-104-009 | Performance AC unevidenced | EPIC-104 | HISTORICAL | **Measured EPIC-105**; no pass/fail threshold (PD-105-008) | Register stale | **HISTORICAL** / **ACCEPT** threshold |
| F-104-013 | Weekly aggregation absent | EPIC-104 | HISTORICAL | **P105-03 `getWeeklyAnalytics`** | Register stale OPEN | **HISTORICAL** + P110-04 register |
| F-104-014 | No analytics membership guard | EPIC-104 | HISTORICAL | **P105-02 SI-105-005** | Register stale OPEN | **HISTORICAL** + P110-04 register |
| F-104-015 | Locale-dependent period format | EPIC-104 | HISTORICAL | **`formatPeriodDisplay` uses en-US / UTC (PD-105-010)** | Register stale OPEN | **HISTORICAL** + P110-04 register |
| F-104-016 | Analytics error path untested | EPIC-104 | TEST | Still no dedicated error-path test | Non-blocking | **ACCEPT** |
| F-104-017 | PD-104-003 period end | EPIC-104 | HISTORICAL | **PD-105-002 through-today** | Register stale OPEN | **HISTORICAL** + P110-04 register |
| F-104-P-001 | Query performance unevidenced | EPIC-104 | ARCHITECTURE | **Measured**; threshold OPEN (PD-105-008) | Not a blocker | **ACCEPT** |
| F-104-P-002 | Timezone complexity | EPIC-104 | HISTORICAL | Subsumed by F-104-005 / P105-03 | Register stale OPEN | **HISTORICAL** + P110-04 register |
| F-105-008 | Test comment arithmetic nit | EPIC-105 | TEST | Comment only | None | **ACCEPT** |
| F-105-013 | Annual overview `getFullYear()` vs workspace TZ | EPIC-105 | APPLICATION | **Still in `src/app/(app)/reports/page.tsx`** (`now.getFullYear()`). EPIC-109 tests aligned; **app not changed** | Yes — contradicts `Workspace.timezone` on year boundary west of UTC | **FIX NOW** |

### Inherited / product / OBD (not all in §38 table)

| ID | Title | Category | Disposition |
|---|---|---|---|
| P102-F-001 / OBD-016 | No commercial snapshot on TimeEntry | PRODUCT | **DEFER** |
| F-P2-004 | Non-billable still requires contract | PRODUCT | **ACCEPT** (R1 by design) |
| F-P2-003 | `Notification.type` is String | PRODUCT | **DEFER** |
| F-P2-005 / OBD-009 | OWNER/MEMBER only | PRODUCT | **DEFER** |
| F-P3-002 | Alert client/contract not DB-proven | PRODUCT | **ACCEPT** (app-enforced) |
| F-004-001 | Concurrent first-workspace race | INFRASTRUCTURE | **ACCEPT** |
| EPIC-003 F-001 | Google/email implicit linking / unverified email | PRODUCT | **DEFER** |
| EPIC-003 F-002 | Google consent not in CI | INFRASTRUCTURE | **ACCEPT** |
| EPIC-003 F-003 | No password-reset provider | HISTORICAL | **HISTORICAL** — Gmail SMTP is production mailer; do not reopen |
| F-103-004 | PD numbering divergence | DOCUMENTATION | **HISTORICAL** |
| OBD-001, OBD-002, OBD-011 | Daily-rate / rounding / multi-currency | PRODUCT | **DEFER** (revenue excluded PD-105-001) |
| OBD-003 | Midnight-crossing entries | PRODUCT | **ACCEPT** (`workDate` date-only) |
| OBD-004, OBD-005 | Holiday / absence | PRODUCT | **DEFER** |
| OBD-006 | Capacity warning threshold | PRODUCT | **ACCEPT** for freeze — alerts exist; dashboard 80% cue is not OBD-006 policy |
| OBD-007, OBD-008 | Post-closure edits; audit | PRODUCT | **DEFER** (R2; TD-001/TD-002) |
| OBD-010 | Payment-term catalog | PRODUCT | **DEFER** |
| OBD-012 | Rollover / expiry | PRODUCT | **DEFER** — R1 is pro-rata, no rollover |
| PD-105-008 | Performance threshold | PRODUCT | **ACCEPT** — baseline recorded, no gate |
| TD-001…TD-007 | Audit, closure, roles, FX, forecasting, e-invoicing, AI | PRODUCT | **DEFER** |
| F-053 | Current alerts (product vision) | PRODUCT | **HISTORICAL** — delivered by EPIC-106 |
| F-060 / F-061 / F-062 / F-072 | Billable amount / daily rate / revenue | PRODUCT | **DEFER** — not R1 contract |
| F-070 | Period selection (product vision) | PRODUCT | **HISTORICAL** — delivered (presets + custom) |
| Calendar view / copy previous | UX deferred | PRODUCT | **DEFER** |
| CSV / PDF / invoice lifecycle | Billing | PRODUCT | **DEFER** |
| P109-05 LA `updatedAt` 223/224 | Same-ms `updatedAt` in time-tracking integration | TEST | **VERIFY** then **ACCEPT** if flake; out of EPIC-109 scope |

### CLOSED — do not reopen

EPIC-108 streams A/E/B/D/C; EPIC-109 calendar-date; F-004; list in Current Certified State.

### Documentation inconsistency (current-state only)

`MASTER_PLAN.md` §4 / some historical epic logs still *narrate* OPEN UX/QA findings that current state has CLOSED. **Do not rewrite §33–§35 snapshots.** P110-04 updates **current** debt rows that remain labeled Open after later Epics already shipped the fix.

---

## R1 Actionable Items

Only items that require work before freeze:

1. **F-105-013** — derive reports year from `getTodayInTimezone(context.timezone)`, not `now.getFullYear()`. One-line application fix. P110-02.
2. **F-103-002** — time-tracking daily/weekly (and edit “Unknown Client”) must still present entries whose client was archived after creation. Application/presentation fix. P110-02.
3. **Current-state debt register** — mark technically shipped F-104-001/002/003/004/005/013/014/015/017/P-002 (and F-104-009 measured) CLOSED in **current** MASTER_PLAN debt tracking, with evidence pointers. P110-04. Do not rewrite §34/§35.

No other application defects are classified FIX NOW.

---

## Verification Items

| ID | What to prove | Success |
|---|---|---|
| F-103-003 | Changing client or work date clears or revalidates contract select | No stale `contractId` submitted; or document ACCEPT if already safe via server |
| P109-05 `updatedAt` | Reproduce under `TZ=America/Los_Angeles` | If same-ms flake: ACCEPT as test limitation or harden assertion **without** calendar-date changes. If app bug: reclassify |
| Production docs vs live | Vercel, Neon, Google, Gmail SMTP still match §34/§35 narrative | P110-06 evidence; no recertification of R1 meaning |
| Isolation / auth | No regression vs certified E2E | P110-05 suite, not a new product |

---

## Accepted R1 Limitations

- F-103-006 silent invalid `?date=` fallback
- F-103-005 unused error classes
- F-103-P-002 full client/contract load at MVP volume
- F-104-008 no per-section skeletons
- F-104-016 analytics error path untested
- F-105-008 comment nit
- F-P2-004 contract required for non-billable
- F-P3-002 alert pair not a DB constraint
- F-004-001 concurrent onboarding race
- EPIC-003 F-002 Google consent not in CI
- OBD-003 date-only `workDate` (no midnight-crossing)
- OBD-006 not a full policy; alerts + 80% cue as shipped
- PD-105-008 no performance gate
- FINDING-P04-002 dual notification at 100% (BY DESIGN)

---

## Deferred / Future Release Items

Revenue/billing (F-060/061/062/072, OBD-001/002/011), snapshots (P102-F-001 / OBD-016), audit (OBD-008 / F-103-P-001 / TD-001), roles (OBD-009), rollover (OBD-012), invoice/CSV/PDF, calendar/copy-previous, identity linking (EPIC-003 F-001), holiday/absence (OBD-004/005), post-closure (OBD-007), e-invoicing/AI/forecasting (TD-005…007).

These are **not** R1 freeze work.

---

## Historical Findings

Traceability only: all EPIC-108/109 CLOSED IDs; F-004; EPIC-003 F-003 (provider now Gmail SMTP); F-053/F-070 as delivered vision items; F-103-004 numbering; F-104-* items already implemented in EPIC-105 but still Open in the register until P110-04.

---

## Proposed Phase Plan

Adjusted after audit. **P110-03 is not required** (no actionable a11y debt; F-104-010/011/012 CLOSED).

| Phase | Objective | Needed? |
|---|---|---|
| **P110-00** | This audit / epic-plan | Done |
| **P110-01** | Test / reliability: F-103-003 VERIFY; LA `updatedAt` VERIFY | Yes, small |
| **P110-02** | Application: F-105-013; F-103-002 | Yes |
| **P110-03** | Accessibility / UX debt | **Skip** unless P110-01/02 surfaces new a11y |
| **P110-04** | Documentation consistency (current debt register; no §34/§35 rewrite) | Yes |
| **P110-05** | Full engineering regression (typecheck, lint, unit, integration host + LA, involved E2E) | Yes |
| **P110-06** | Production validation against documented hosted state | Yes, evidence-only unless drift |
| **P110-07** | Final engineering review | Yes |
| **P110-08** | R1 freeze record (additive; does not alter historical R1 grant) | Yes |

One phase = one objective = one commit. Do not start P110-01 in this commit.

---

## Freeze Criteria

Not declared met in P110-00.

- No unresolved R1 **application** defects (F-105-013, F-103-002 done or explicitly ACCEPTed by PO)
- No unresolved R1 authorization/isolation defects (none open as defects)
- No unresolved release-blocking auth, data-integrity, or a11y defects
- No unresolved release-blocking test/reliability defects (F-103-003 and LA flake dispositioned)
- Production deploy / auth / mailer documented and consistent with current ops
- Test baseline recorded (P110-05)
- Every remaining OPEN item has FIX/VERIFY/ACCEPT/DEFER/HISTORICAL
- Current-state docs match shipped behavior; historical snapshots intact
- No R2 scope in the freeze branch
- Freeze candidate SHA reproducible from the repo

---

## Release Exit Criteria

- P110-07 PASS (or PASS WITH FINDINGS, all findings dispositioned)
- P110-08 freeze note published
- `MASTER_PLAN.md` current `next` / debt aligned
- R1 certification **meaning unchanged**; freeze is consolidation, not a new grant that rewrites §35

---

## Risks / Open Questions

1. **F-103-002 size** — presentation join change may touch list/edit empty states. If PO classifies it ACCEPT for freeze, drop from P110-02.
2. **F-105-013** — one-line; do not expand into a timezone redesign.
3. **Stale debt Open labels** — closing register rows in P110-04 is documentation, not silent code claims. Cite EPIC-105/108/109 evidence.
4. **P110-06** — hosted production may have drifted from `2b58af4`. Drift is VERIFY, not a rewrite of §35.
5. Do not treat product-vision F-060…F-062 as R1 defects.

---

## Explicitly Deferred Scope

Billing, invoices, CSV/PDF, calendar UI, copy-previous, roles, Google linking, revenue, rollover, audit log, e-invoicing, AI.

---

## Special-area conclusions

| Area | Conclusion |
|---|---|
| Calendar/date | EPIC-109 removed the R1 calendar-date **test** inconsistency. F-105-013 remains the only **app** TZ leftover in reports year |
| Auth | Certified email/password, reset, Google, sign-out, protected routes — no reopen |
| Isolation | Fail-closed not-found; F-103-005 unused classes are not a bypass |
| Reporting | Custom + presets certified EPIC-108; F-105-013 is year-label only |
| Alerts | R1 in-app alerts shipped; capacity email expansion deferred |
| A11y | Closed in EPIC-108 Stream D; F-104-008 is loading UX, ACCEPT |
| E2E | Calendar tests hardened; LA `updatedAt` is instant flake, not calendar-date |
| Production | F-004 / SMTP / Google / Vercel remain CLOSED in certification record |
| Docs | Current debt table lags EPIC-105 closures — P110-04 |
| Product | R1 freeze ≠ R2 |

---

## P110-00 record

Audit only. No `src/` or `tests/` change. Next phase is decided from this plan; do not auto-start P110-01.
