# EPIC-107 — Public Landing

**Epic:** EPIC-107  
**Release:** Release 1 — MVP  
**MASTER_PLAN identifier:** R1-E07 — Public Landing (`MASTER_PLAN.md` §17A)  
**Status:** IMPLEMENTATION COMPLETE — Engineering Review PASS WITH FINDINGS (P107-05); production-like validation PASS WITH FINDINGS (P107-06); epic certification RELEASE BLOCKED; MASTER_PLAN §34 EXECUTED — READY FOR RELEASE  
**Dependencies:** EPIC-003, EPIC-004, EPIC-006, EPIC-104, MVP-INTEGRATION, UX Polish  
**Previous:** UX Polish COMPLETE (`791c879`)  
**Next after this Epic:** Production Certification (`MASTER_PLAN.md` §35) — AWAITING PRODUCT OWNER APPROVAL. §34 evidence: `docs/release/production-validation.md` (READY FOR RELEASE)

```text
PLANNING:              COMPLETE
PRODUCT DECISIONS:     RESOLVED (PD-LANDING-001 … PD-LANDING-006)
BLOCKING DECISIONS:    NONE
IMPLEMENTATION:        COMPLETE (P107-01 … P107-03)
DOCUMENTATION:         COMPLETE (P107-04)
ENGINEERING REVIEW:    COMPLETE — PASS WITH FINDINGS (P107-05)
PRODUCTION-LIKE:       COMPLETE — PASS WITH FINDINGS (P107-06)
EPIC CERTIFICATION:    COMPLETE — RELEASE BLOCKED
MVP §34:               EXECUTED — READY FOR RELEASE
PRODUCTION CERTIFICATION (§35): NOT STARTED / AWAITING PRODUCT OWNER APPROVAL
```

HEAD at planning: `791c87944163e4fb2262de13309e0effe19f9e38`  
HEAD at P107-03: `2ee06fb45ce25cc2a0bf2ad61a072b2c7795eb6a`  
UX Polish commit: `feat(ux): polish MVP settings and authentication branding`

The Epic implementation is COMPLETE. MASTER_PLAN §34 has been executed (READY FOR RELEASE). §35 remains deferred until explicit Product Owner approval.

This Epic is a dedicated product-surface + route-migration Epic. It is not a Documentation Gate, UX Gate, or Production Validation phase.

---

## 1. Objective

Introduce a public landing page at `/` and move the authenticated dashboard to `/dashboard`, without changing authenticated application visual style, workspace isolation, or MVP domain capabilities.

---

## 2. Business Context

Unauthenticated `/` previously server-redirected to `/sign-in`. Authenticated `/` was the dashboard. There was no public product entry, no `/dashboard` route, and no logo asset.

The Product Owner requires a public landing that is clearly the same product as the authenticated app: Geist, light canvas, whitespace, shadcn/ui, restrained hierarchy. Wordmark only.

---

## 3. Scope

### In scope

- Public `/` landing with Sign Up and Sign In entry points
- Authenticated dashboard at `/dashboard`
- Authenticated visitors to `/` redirect to `/dashboard` (workspace-resolved) or the existing workspace-gate path
- Sign-out destination `/`
- Route-access, navigation, auth redirects, cache revalidation, tests, and E2E updates required by the route change
- Contained landing header wordmark: plain `FreelanceOS` text only (`font-semibold tracking-tight`); no logo asset
- Landing copy limited to existing capabilities: Clients, Contracts, Time Tracking, Analytics/Dashboard, Reports, Alerts

### Out of scope

- Billing, revenue, invoicing, payments, AI, integrations, Slack, email notifications
- Logo/symbol/letterform/SVG/PNG/ICO assets
- Site-wide dark mode or theme switcher
- Authenticated-app visual redesign
- CMS / marketing platform / new routing library / new dependency unless strictly necessary
- `proxy.ts` / `middleware.ts` (not used; Next.js 15.5.25 has no `proxy.ts` convention in this repo)
- FINDING-QA-002 and all other open findings (do not close, do not fix)
- Production Validation / Production Certification
- Final marketing copy in this planning document (implementation uses short, factual labels)

---

## 4. Explicit Non-Goals

| Non-goal | Rationale |
| --- | --- |
| Dark mode | No site-wide dark mode; landing wordmark is plain text |
| New brand asset | PO: wordmark only |
| Authenticated UI restyle | Must remain visually unchanged |
| Capability claims beyond MVP | Landing may describe only implemented surfaces |
| FINDING-QA-002 fix | Later reporting phase; do not touch custom-range timezone logic |
| Production Validation | Deferred until landing/routing work and its validation complete |

---

## 5. Product Decisions

| ID | Decision | Status |
| --- | --- | --- |
| PD-LANDING-001 | `/` is the public landing page. | RESOLVED |
| PD-LANDING-002 | `/dashboard` is the authenticated dashboard. Direct page under existing `(app)` layout. No nested dashboard layout. | RESOLVED |
| PD-LANDING-003 | Authenticated `GET /` never renders the landing. Redirect via workspace resolution: resolved → `/dashboard`; onboarding → `/onboarding`; ambiguous → `/workspace-unavailable`. | RESOLVED |
| PD-LANDING-004 | Sign-out lands on `/`. Protected-route intercept and password-reset completion remain `/sign-in`. | RESOLVED |
| PD-LANDING-005 | Minimum landing sections: header, hero + CTAs, capability list (six existing capabilities), footer. | RESOLVED |
| PD-LANDING-006 | Wordmark-only. Final treatment: plain `FreelanceOS` text, foreground color, `font-semibold`, `tracking-tight`. No chip, background, border, icon, or asset. No site-wide dark mode. Auth and AppShell wordmarks stay light-canvas. | RESOLVED |

### PD-LANDING-004 evidence

At planning, sign-out was `authClient.signOut()` → `router.refresh()` → `router.push("/sign-in")`. Reset-password success also assigned `/sign-in`. Unauthenticated protected routes used `SIGN_IN_PATH`. E2E and UX Polish treated post-sign-out `/sign-in` as the public face because `/` was the authenticated app.

After PD-LANDING-001, `/` is the public product entry with Sign In / Sign Up. Signing out to `/sign-in` would skip that entry. Signing out to `/` matches the Product Owner direction and the new public root.

Keep `/sign-in` for:

- unauthenticated access to workspace-bound routes
- password-reset completion (user must authenticate next)

Do not treat FINDING-INT-002 / FINDING-QA-001 as closed by this destination change.

---

## 6. Current vs target routing

Implemented as of P107-02 (`c446585` and follow-ups). The Target column is the live topology.

| Path | Current | Target |
| --- | --- | --- |
| `/` unauthenticated | Redirect → `/sign-in` | Public landing |
| `/` authenticated, workspace resolved | Dashboard in AppShell | Redirect → `/dashboard` |
| `/` authenticated, no membership | Redirect → `/onboarding` | Redirect → `/onboarding` |
| `/` authenticated, ambiguous membership | Redirect → `/workspace-unavailable` | Redirect → `/workspace-unavailable` |
| `/dashboard` | Does not exist | Authenticated dashboard (existing RSC, AppShell) |
| `/sign-in` `/sign-up` `/forgot-password` | `(auth)` | Unchanged URLs; post-auth destination `/dashboard` |
| `/reset-password` | `(public-auth)`; success → `/sign-in` | Unchanged |
| Sign-out | `/sign-in` | `/` |
| Google `callbackURL` | `/` | `/dashboard` (`DEFAULT_AUTHENTICATED_PATH`) |
| First-workspace create | `DEFAULT_AUTHENTICATED_PATH` (`/`) | `DEFAULT_AUTHENTICATED_PATH` (`/dashboard`) |

Auth URLs do not move. No `/dashboard` nested layout. Preserve `(app)`, `(auth)`, `(public-auth)`, `(workspace-gate)`.

Add `(public)` for `/` only.

---

## 7. Architecture impact

Authoritative access today:

- `DEFAULT_AUTHENTICATED_PATH = "/"`
- `isWorkspaceBoundPath` = not auth page and not workspace-gate → `/` is workspace-bound
- `getUnauthenticatedRedirectPath("/")` → `/sign-in`
- `(app)/layout.tsx` session gate → `/sign-in`
- `(auth)/layout.tsx` authenticated visitors → `getWorkspaceResolutionPath` (today `/`)

Required model:

| Primitive | Change |
| --- | --- |
| `DEFAULT_AUTHENTICATED_PATH` | `"/dashboard"` |
| `LANDING_PATH` (new) | `"/"` |
| `isPublicPagePath` (new) | `/` is public; not an auth page |
| `getUnauthenticatedRedirectPath` | `/` → `null`; `/dashboard` → `/sign-in` |
| `isWorkspaceBoundPath` | exclude public `/`; `/dashboard` remains bound |
| `getWorkspaceBoundaryRedirect("/")` | authenticated → workspace resolution destination (typically `/dashboard`) |
| `getAuthenticatedAuthPageRedirectPath` | still uses `DEFAULT_AUTHENTICATED_PATH` → `/dashboard` |

`(public)/layout.tsx` (new):

- No AppShell
- If session present → `redirect(getWorkspaceResolutionPath(...))` (same pattern as `(auth)/layout.tsx`)
- Else render landing chrome

`(app)/layout.tsx`: unchanged gate. After the move it no longer wraps `/`.

Dashboard placement: `src/app/(app)/dashboard/page.tsx`. Reuse existing `Dashboard` RSC, `(app)/loading.tsx`, `(app)/error.tsx`. Do not add `dashboard/layout.tsx`.

Do not introduce `proxy.ts` or `middleware.ts`.

---

## 8. Route migration

1. Add `src/app/(app)/dashboard/page.tsx` with the current `HomePage` RSC (rename to a dashboard page function).
2. Point navigation, `DEFAULT_AUTHENTICATED_PATH`, auth success, and Google `callbackURL` at `/dashboard`.
3. Remove `src/app/(app)/page.tsx` in the same phase that adds `(public)/page.tsx` so `/` is never empty and never duplicated.
4. `isNavigationItemActive`: drop the `href === "/"` special case; `/dashboard` uses the existing prefix rule.

Next.js cannot have two `page.tsx` files for `/`. `(app)/page.tsx` and `(public)/page.tsx` cannot coexist.

---

## 9. Authentication redirect migration

| Flow | Today | Target |
| --- | --- | --- |
| Sign-in success `window.location.assign` | `/` | `DEFAULT_AUTHENTICATED_PATH` (`/dashboard`) |
| Sign-up success | `/` | `/dashboard` (then workspace-gate as today) |
| Google `callbackURL` | `/` | `/dashboard` |
| `(auth)` layout | `getWorkspaceResolutionPath` | Unchanged function; destination becomes `/dashboard` |
| Sign-out | `/sign-in` | `/` |
| Reset-password success | `/sign-in` | `/sign-in` |
| Unauthenticated `/onboarding`, `/clients`, `/dashboard`, … | `/sign-in` | `/sign-in` |
| Unauthenticated `/` | `/sign-in` | Landing (200) |

Client forms should import `DEFAULT_AUTHENTICATED_PATH` / `LANDING_PATH` rather than repeating string literals.

---

## 10. Cache / revalidation impact

| Call | Today | Target |
| --- | --- | --- |
| TimeEntry create/update/delete page revalidate | `revalidatePath("/")` | `revalidatePath("/dashboard")` |
| TimeEntry + mark-read layout revalidate | `revalidatePath("/", "layout")` | Keep. Root `layout` type still covers `(app)/layout` (unread badge). |
| Reports / alerts | `/reports`, `/alerts` | Unchanged |

`tests/unit/features/time-entries/time-entry-action-revalidation.test.ts` `EXPECTED_PATHS` must include `/dashboard` instead of page-level `/`.

Do not revalidate reporting period logic. FINDING-QA-002 remains untouched.

---

## 11. Navigation impact

| Surface | Change |
| --- | --- |
| `buildNavigationItems` Dashboard `href` | `/` → `/dashboard` |
| `isNavigationItemActive` | Treat `/dashboard` like other sections |
| AppHeader / workspace-gate / AuthBrand | No visual change |
| Landing header | Public Sign In / Sign Up; plain wordmark |
| AppShell | Unchanged aside from Dashboard href |

---

## 12. Test impact

| Suite | Impact |
| --- | --- |
| `tests/unit/application/auth/route-access.test.ts` | `/` public; `/dashboard` protected; auth-page redirect → `/dashboard` |
| `tests/unit/application/workspace/workspace-route-access.test.ts` | `/` not workspace-bound; `/dashboard` is; boundary redirects updated |
| `tests/unit/lib/navigation.test.ts` | Dashboard active on `/dashboard` only |
| `tests/integration/auth/protected-boundary.test.ts` | Unauthenticated `/` allowed; `/dashboard` → sign-in |
| `tests/integration/workspace/workspace-boundary.test.ts` | `"/"` assertions that assume dashboard destination |
| `tests/integration/workspace/authorization-isolation.test.ts` | Same |
| `tests/integration/auth/google-oauth.test.ts` | `callbackURL: "/dashboard"` |
| TimeEntry revalidation unit | `/dashboard` |
| `tests/unit/ci/isolation-baseline.test.ts` | Keep locked phrases; onboarding still asserts `/?workspaceId=…` does not grant access (URL may land on `/dashboard` after auth redirect) |

Dashboard integration tests (`dashboard-page.test.ts`) are service-level; no route URL change expected.

---

## 13. E2E impact

Unauthenticated `goto("/")` must stop expecting `/sign-in`.

| File | Change |
| --- | --- |
| `tests/e2e/auth.spec.ts` | Unauthenticated `/` → landing; protected probe uses `/dashboard`; sign-out → `/` |
| `tests/e2e/app-shell.spec.ts` | Shell-behind-auth: `goto("/dashboard")` (or `/clients`); title on landing may still be FreelanceOS |
| `tests/e2e/onboarding.spec.ts` | Post-create URL `/dashboard`; unauthenticated `/` is landing; unauthenticated `/dashboard` → sign-in; authenticated no-workspace `goto("/")` → `/onboarding` |
| `tests/e2e/helpers/first-workspace.ts` | `toHaveURL("/")` → `/dashboard` |
| `tests/e2e/dashboard.spec.ts` | All dashboard URLs `/dashboard`; sign-out → `/`; unauthenticated `/dashboard` → sign-in |
| `tests/e2e/dashboard-accessibility.spec.ts` | `goto("/dashboard")` |
| `tests/e2e/reports.spec.ts` | Dashboard link → `/dashboard` |
| `tests/e2e/mvp-integration-journey.spec.ts` | Dashboard land `/dashboard` |
| New `tests/e2e/landing.spec.ts` | Public `/`; CTAs; authenticated `/` redirect; no AppShell on landing |

Do not rewrite FINDING-QA-001 / FINDING-INT-001 / 002 / 003 as closed. Sign-out URL assertions change; flake classification stays OPEN.

---

## 14. Landing information architecture

No final marketing copy. Implementation uses short factual labels.

| Section | Purpose | Content bound |
| --- | --- | --- |
| Header | Identity + entry | Plain wordmark; Sign In; Sign Up (header Account nav only; no extra hero CTA) |
| Hero | What this is | Product name `h1`; operations statement; supporting statement |
| How it works | Three steps | One bordered Card; 01 Set up; 02 Track; 03 Understand. Stacks on mobile. |
| Capabilities | What exists | Clients; Contracts; Time Tracking; Analytics / Dashboard; Reports; Alerts. Native `<details>/<summary>` Read more. |
| Footer | Not implemented | No footer. No duplicated wordmark. |

Forbidden claims: billing, revenue, invoicing, payments, AI, integrations, Slack, email notifications.

Visual system: Geist, light canvas, existing Button (`default` / `outline`), Card optional, muted supporting text, no gradients, no full-page dark marketing, no excessive animation.

---

## 15. Wordmark treatment

| Rule | Detail |
| --- | --- |
| Mark | Text `FreelanceOS` only |
| Landing | Plain text: `text-sm font-semibold tracking-tight`. No inverted chip. |
| Containment | Header row only |
| Not allowed | SVG/PNG/ICO, symbol, letterform, `.dark` on `<html>`, AuthBrand/AppHeader restyle |
| Auth / AppShell | Unchanged light-canvas wordmark |

---

## 16. Accessibility requirements

- One `h1` on the landing
- Header / main / footer landmarks
- Skip link to main content (match AppShell pattern)
- Sign In / Sign Up are real links (`<Link>` + Button), keyboard reachable, visible focus
- Inverted wordmark contrast using existing near-black/near-white tokens
- No information by color alone
- Unauthenticated landing must not expose Application nav or workspace data

Pre-existing F-104-010 / 011 / 012 remain OPEN and are not this Epic’s closure target.

---

## 17. Responsive requirements

| Viewport | Expectation |
| --- | --- |
| Mobile (~390px) | Header CTAs wrap; no horizontal overflow; stacked capabilities |
| Tablet | Hero + CTAs readable; 2-column capability grid acceptable |
| Desktop | Same light canvas; header row; capability grid 2–3 columns |

Primary target remains desktop productivity. Mobile must be usable.

---

## 18. Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-107-001 | Unauthenticated `GET /` renders the public landing (not `/sign-in`). |
| AC-107-002 | Landing exposes Sign Up and Sign In entry points. |
| AC-107-003 | Authenticated workspace-resolved `GET /` redirects to `/dashboard`. |
| AC-107-004 | `/dashboard` renders the existing dashboard inside AppShell. |
| AC-107-005 | Unauthenticated `GET /dashboard` redirects to `/sign-in`. |
| AC-107-006 | Sign-in / sign-up / Google success land on `/dashboard` or the workspace-gate path. |
| AC-107-007 | Sign-out lands on `/` (landing). |
| AC-107-008 | Password-reset success still goes to `/sign-in`. |
| AC-107-009 | Authenticated user without workspace hitting `/` goes to `/onboarding` (or `/workspace-unavailable` if ambiguous). |
| AC-107-010 | Dashboard nav item highlights on `/dashboard` only. |
| AC-107-011 | TimeEntry mutations revalidate `/dashboard` and keep layout revalidation for the unread badge. |
| AC-107-012 | Landing names only Clients, Contracts, Time Tracking, Analytics/Dashboard, Reports, Alerts. |
| AC-107-013 | Wordmark-only plain text; no new asset; no site-wide dark mode. |
| AC-107-014 | Authenticated app chrome (AppShell, auth forms, settings) is not restyled. |
| AC-107-015 | Landing is usable at 390px and desktop; skip link + one `h1`. |
| AC-107-016 | FINDING-QA-002 and other listed open findings remain OPEN. |
| AC-107-017 | Lint, typecheck, unit, integration, E2E, and build pass (or documented pre-existing flake only). |

---

## 19. Definition of Done

- [x] All six Product Decisions implemented as recorded
- [x] Routing table in §6 true in code
- [x] `(app)` architecture preserved; dashboard is `(app)/dashboard/page.tsx`
- [x] No new dependency, CMS, dark mode, or brand asset
- [x] Unit / integration / E2E updated; new landing E2E exists
- [x] README, `docs/architecture.md`, `docs/testing-strategy.md`, CHANGELOG synchronized in the documentation phase
- [ ] Engineering Review produced
- [x] Open findings listed in §23 still OPEN
- [x] Production Validation **not** started in this Epic
- [ ] Working tree clean at Epic closure

---

## 20. Implementation phases / commits

| Phase | Commit | Status | Deliverable |
| --- | --- | --- | --- |
| P107-00 | `39fdd70` `docs(landing): plan MVP public landing` | COMPLETE | This plan + MASTER_PLAN registration |
| P107-01 | `9a71124` `feat(app): move dashboard to /dashboard` | COMPLETE | `(app)/dashboard/page.tsx`; `DEFAULT_AUTHENTICATED_PATH`; navigation; auth success + Google `callbackURL`; revalidatePath; unit/integration tests |
| P107-02 | `c446585` `feat(landing): add MVP public landing` | COMPLETE | `(public)` layout + page; remove `(app)/page.tsx`; public path classification; sign-out → `/`; landing IA |
| P107-02 follow-up | `d257a4f` `fix(landing): simplify public wordmark` | COMPLETE | Plain wordmark |
| P107-02 follow-up | `b1d7049` `fix(landing): keep auth CTAs in the header only` | COMPLETE | Header Sign Up / Sign In only; no extra hero CTA |
| P107-02 follow-up | `ed44da9` `feat(landing): enrich MVP landing content` | COMPLETE | How it works + capability Read more |
| P107-03 | `2ee06fb` `test(landing): cover public root and dashboard routing` | COMPLETE | Landing E2E; auth/onboarding/app-shell/dashboard routing coverage |
| P107-04 | `docs(landing): synchronize EPIC-107 documentation` | COMPLETE | README, architecture, testing-strategy, CHANGELOG, epic-plan status |
| P107-05 | `docs(landing): EPIC-107 engineering review` | NEXT | `docs/epics/EPIC-107/engineering-review.md` |

P107-03 evidence: targeted E2E 26/26 PASS; broader E2E 40/40 PASS. FINDING-QA-001 not reproduced; remains OPEN.

Do not combine planning and implementation. Do not start Production Validation in any P107 chat.

---

## 21. Risks

| ID | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| RISK-107-001 | Two `page.tsx` files claim `/` | High | Delete `(app)/page.tsx` only after `(public)/page.tsx` exists; P107-01 uses redirect stub |
| RISK-107-002 | Missed `/` hardcoding (E2E, Google, assign, revalidate) | High | Inventory in §8–§13; grep `/` in P107-01/P107-03 |
| RISK-107-003 | Authenticated `/` shows landing (session leak / missed redirect) | High | `(public)` layout uses `resolveSessionWorkspace` + `getWorkspaceResolutionPath` |
| RISK-107-004 | Sign-out E2E flake (FINDING-QA-001 / INT-002) interacts with new destination | Medium | Update expected URL; do not close those findings |
| RISK-107-005 | `revalidatePath("/")` stops refreshing dashboard | Medium | Page path `/dashboard`; keep `"layout"` on `/` |
| RISK-107-006 | isolation-baseline string locks | Medium | Preserve required phrases; adjust URLs around them |
| RISK-107-007 | Accidental dark-mode or asset introduction | Low | PD-LANDING-006; review in P107-05 |
| RISK-107-008 | Landing copy invents unbuilt features | Low | Capability allow-list AC-107-012 |
| RISK-107-009 | FINDING-QA-002 work mixed into this Epic | High | No edits under reporting custom-range / timezone shift |

---

## 22. Rollback

- Revert P107 commits in reverse order.
- Restoring `(app)/page.tsx` at `/` and `DEFAULT_AUTHENTICATED_PATH = "/"` returns prior routing.
- No schema/migration. Rollback is git-only.
- After P107-02, a partial revert that removes `(public)/page.tsx` without restoring `(app)/page.tsx` 404s `/` — revert both together.

---

## 23. Inherited open findings (do not close)

| ID | Status | Note |
| --- | --- | --- |
| FINDING-QA-002 | OPEN / NON-BLOCKING / APPLICATION DEFECT | Custom date range timezone shift west of UTC. Later reporting fix. |
| FINDING-QA-001 | OPEN / TEST DEFECT / FLAKY | Do not close. |
| FINDING-INT-001 | OPEN / TEST DEFECT | Do not close. |
| FINDING-INT-002 | OPEN / NOT REPRODUCED | Do not close. Sign-out URL change is unrelated. |
| FINDING-INT-003 | OPEN / NOT REPRODUCED | Do not close. |
| F-104-007 | PRE-EXISTING | Dashboard `try/catch` vs `NEXT_REDIRECT`. Layout still wins. Do not expand scope. |
| F-104-010 / 011 / 012 | PRE-EXISTING | Accessibility debt. |
| FINDING-UX-004 | OPEN | Custom period UI not implemented. |

---

## 24. Production Validation

This Epic’s own production-like validation is recorded in
`docs/epics/EPIC-107/production-validation.md` (P107-06 — PASS WITH FINDINGS;
full MASTER_PLAN §34 was **not** completed by that phase).

MASTER_PLAN §34 was later executed on candidate `a0ad65f` and revalidated
on `81a22dd`. Evidence: `docs/release/production-validation.md`. Outcome:
**RELEASE BLOCKED**.

Do not start Production Certification in this Epic plan.

---

## 25. Documentation changes in this planning commit

| File | Action |
| --- | --- |
| `docs/epics/EPIC-107/epic-plan.md` | Create |
| `MASTER_PLAN.md` | Register EPIC-107; set next work; defer §34 |

README, architecture, testing-strategy, CHANGELOG wait for P107-04 (this documentation phase).
