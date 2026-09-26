# R2 Release — Revenue Operations

**Gate:** R2 Release  
**Date:** 2026-09-26  
**Certified application HEAD:** `670e7505857649efe62775d7e12d47e60c747080`  
**Deployed git SHA:** `a0707e1da3392cadcdf5ae6356913da220b531bb`  
**Production URL:** `https://freelance-os-timeplan.vercel.app`  
**GitHub Production deployment:** `6672213732`  
**Vercel deployment:** `7sPQSXU98o4c5RJWaH333dD4xcsr`  
**Branch:** `main`  
**Certification:** `docs/release/r2-certification.md`

```text
R2 RELEASE VERDICT:       RELEASED WITH FINDINGS
R2 GLOBAL STATUS:         PRODUCTION-RELEASED
CERTIFIED APPLICATION:    670e7505857649efe62775d7e12d47e60c747080
DEPLOYED GIT SHA:         a0707e1da3392cadcdf5ae6356913da220b531bb
GITHUB PRODUCTION:        6672213732
MIGRATION:                PASS — prisma migrate deploy (Vercel build)
RELEASE TAG:              NOT CREATED — no documented tag convention
NEXT:                     STOP. Do not start R3.
```

This record is the R2 Release. It does not rewrite R1 §34 / §35, `docs/release/production-certification.md`, `docs/release/r1-freeze.md`, or the R2 certification snapshot.

The repository deploys `origin/main` through the GitHub / Vercel Production workflow. `vercel.json` runs `prisma generate && prisma migrate deploy && pnpm build`. The certification commit is documentation-only over the certified application tree. Source, Prisma, and tests are identical to `670e750`.

---

## 1. Release verdict

**RELEASED WITH FINDINGS**

Deployment, certified application identity, migration chain, production runtime, auth/session, workspace isolation, and critical R2 smokes are healthy. Known certified findings remain. Production limitations below are non-blocking.

---

## 2. Artifact identity

| Field | Value |
| --- | --- |
| Certified application HEAD | `670e7505857649efe62775d7e12d47e60c747080` |
| Certification commit | `a0707e1da3392cadcdf5ae6356913da220b531bb` |
| Deployed git SHA | `a0707e1da3392cadcdf5ae6356913da220b531bb` |
| Source / Prisma / test delta vs certified app | none — documentation only |
| Previous Production SHA | `2ad1a1e1e032709bb5de7c228f083259ac5d5ecd` (E03) |
| Production URL | `https://freelance-os-timeplan.vercel.app` |
| GitHub Production | `6672213732` — success 2026-09-25T23:51:21Z |
| Vercel | `https://vercel.com/gianmario-projects/freelance-os/7sPQSXU98o4c5RJWaH333dD4xcsr` |

---

## 3. Deployment result

| Check | Result |
| --- | --- |
| Pre-release gate | **PASS** — clean `main`; certification present; no source / Prisma / migration / test drift after `670e750` |
| Official mechanism | `git push origin main` → GitHub / Vercel Production |
| Build | **PASS** |
| Runtime | **PASS** — production alias serves the new artifact (`/reports/export` 307 when anonymous; was 404 on E03) |

---

## 4. Migration result

| Check | Result |
| --- | --- |
| Procedure | Official `prisma migrate deploy` in the Vercel build command |
| Outcome | **PASS** — Vercel Production completed. A migrate failure would fail the build. |
| Applied this cutover | Certified E04: `20260923230000_add_contract_allocated_minutes`, `20260923235000_add_allocation_alerts` |
| Already on Production (E03) | E01 TimeEntry snapshot UPDATE; E02 Invoice; E03 Payment; payment alerts |
| E05 | no schema migration |
| Destructive / unexpected | none |
| Manual SQL / `db push` / `migrate dev` | not used |

---

## 5. Environment validation

Secrets were not printed. Vercel CLI was logged out; dashboard login was not available. Presence is inferred from runtime and from the official build.

| Name | Production state |
| --- | --- |
| `DATABASE_URL` | Present — migrate deploy and authenticated reads succeeded (hosted Neon) |
| `BETTER_AUTH_SECRET` | Present — session issued |
| `BETTER_AUTH_URL` | Present — Google callback on the production origin |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Present — Google OAuth reached accounts.google.com |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD` | Not re-listed. Not re-sent. Historical production-validation presence retained. No unwanted mail sent. |
| `AUTH_EMAIL_DELIVERY` | Not inspected by name. Runtime is production (`NODE_ENV=production` on Vercel). |
| `AUTH_E2E_RUNTIME` | Must remain unset. Ignored when `VERCEL=1` or `VERCEL_ENV=production`. No E2E bypass used. |
| `TEST_DATABASE_URL` | Must remain unset on Vercel. Production URL and hosted data path used. |

No development fallback observed. Production URL is `https://freelance-os-timeplan.vercel.app`.

---

## 6. Auth / session

| Check | Result |
| --- | --- |
| Sign-in page | **PASS** — email/password + Google + forgot-password |
| Google OAuth | **PASS** — production callback |
| Email/password session | **PASS** — existing workspace `Tets WS` / Gianmario Iamoni → `/dashboard` |
| Workspace resolution | **PASS** — session workspace, not query `workspaceId` |
| Sign-out | **PASS** — `/` |

A separate Google identity without membership resolved to `/onboarding`. No workspace was created. That identity was signed out.

---

## 7. Security / isolation

| Check | Result |
| --- | --- |
| Anonymous protected routes | **PASS** — `/dashboard`, `/contracts`, `/time-tracking`, `/reports`, `/alerts`, `/reports/export` → 307 `/sign-in` |
| Foreign `workspaceId` query | **PASS** — dashboard remains `Tets WS` |
| Foreign contract / invoice IDs | **PASS** — Page not found. No foreign data. |
| `/reports/export` anonymous | **PASS** — 307 `/sign-in` |
| CSV secret leakage | **PASS** — none |

---

## 8. R2 smoke matrix

| Surface | Result | Note |
| --- | --- | --- |
| `/` | **PASS** | HTTP 200 |
| `/sign-in` | **PASS** | HTTP 200 |
| `/dashboard` | **PASS** | Authenticated. Empty month state. |
| `/contracts` | **PASS** | Empty list. No writes. |
| `/time-tracking` | **PASS** | Daily empty state. |
| `/alerts` | **PASS** | Empty list. |
| `/reports` period | **PASS** | Today / Week / Month / Year / Custom |
| Client / Contract filters | **PASS** | Present. Client `Test1` listed. |
| Accrued / Expected / Forecast | **PASS** | Published. Empty workspace shows `—`. |
| Annual Overview | **PASS** | Present. |
| Allocation | **PASS** | Contract Report surface + CSV allocation columns. No live allocated contracts. |
| Invoice → Payment read | **NOT EXERCISED** | No contract / invoice / payment records in the exercised workspace. Routes exist. Foreign invoice 404. No test data created. |
| `GET /reports/export` | **PASS** | 200; `text/csv; charset=utf-8`; `Content-Disposition: attachment; filename="reports-month-2026-09-01-2026-09-26.csv"`; valid CSV; workspace-scoped empty rows. |

---

## 9. Known findings

Not reopened. Not remediated. No new production-specific impact.

| ID | Status |
| --- | --- |
| F-E02-004 | OPEN / LOW / test hygiene |
| F-E03-001…005 | ACCEPTED |
| E04 accepted set | ACCEPTED |
| F-E05-01-002 | OPEN residual / LOW |
| F-E05-01-003 | ACCEPTED |
| F-E05-03-001 | ACCEPTED |
| F-R2-QA-001 | OPEN / LOW |
| F-R2-UX-001…005 | OPEN / non-blocking |
| TimeEntry revalidation unit tests | PRE-EXISTING. Remote `quality` unit step failed on this SHA; same class as certification. Not a production runtime blocker. |

---

## 10. Production-specific findings / limitations

| ID | Classification | Why not blocking |
| --- | --- | --- |
| F-R2-REL-001 | LIMITATION | Vercel env names not re-listed from the dashboard. Critical keys inferred from migrate / auth / OAuth runtime. |
| F-R2-REL-002 | LIMITATION | Exercised workspace has no contract / invoice / payment / time-entry records. Invoice/payment aggregates not read on live rows. Surfaces and isolation PASS. No production writes. |
| F-R2-REL-003 | LIMITATION | SMTP not re-verified (no mail sent). Historical production-validation presence retained. |

---

## 11. Production limitations

- Custom domain not purchased.
- Gmail SMTP remains the MVP mailer.
- Historical R1 accepted limitations unchanged.
- Remote `quality` CI is not a production runtime gate.

---

## 12. Release commit / tag

| Item | Value |
| --- | --- |
| Release documentation commit | created after this record (docs only) |
| Release tag | **not created** — repository has no documented tag convention (R1 freeze created none) |

---

## 13. Final production status

```text
R2 GLOBAL STATUS:         PRODUCTION-RELEASED
RELEASE VERDICT:          RELEASED WITH FINDINGS
R2 PRODUCTION-READY:      YES
NEXT AUTHORIZED PHASE:    NONE. Do not start R3.
```
