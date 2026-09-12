# EPIC-006 — UI Foundation

## 1. Epic Identity

**Epic:** EPIC-006  
**Release:** Release 0 — Foundation  
**Objective:** UI Foundation  
**Status:** COMPLETE — PASS  
**Depends on:** EPIC-001 — Foundation / Repository; EPIC-003 — Authentication; EPIC-004 — Workspace; EPIC-005 — Testing & CI Foundation  
**Next Epic:** EPIC-101 — Clients (`MASTER_PLAN.md` §11 R1-E01 / §43)  
**Canonical source:** `MASTER_PLAN.md` R0-E06 — UI Foundation

```text
IMPLEMENTATION COMPLETE
CERTIFICATION: PASS
PRODUCTION READINESS: NO
READY FOR EPIC-101
```

Reviewed commits:

```text
f94e1873936d2935bc0ba330716ac94ed4ce730f
feat(ui): establish design tokens and foundation primitives

16922dd8d1f13ec560fcf7bac926bf1dc4b1ee24
feat(ui): complete authenticated application shell

06e5df6a743926a06e278320e2ed8e1f39607602
test(ui): cover authenticated shell and accessibility baseline
```

Phase 4 is documentation and certification only. Review:
`docs/epics/EPIC-006/engineering-review.md`.

MASTER_PLAN naming is consistent (`UI Foundation`). Do not invent EPIC-007. After this Epic, the next planned product Epic is Client Management.

This Epic does **not** recreate Next.js, Tailwind, shadcn/ui, or the existing authenticated shell. Those already exist from EPIC-001 and were later bound to Better Auth and workspace resolution. EPIC-006 completes the reusable UI foundation later product Epics can attach to.

---

## 2. Objective

Establish the authenticated FreelanceOS UI foundation required by later product Epics.

From `MASTER_PLAN.md` R0-E06, this Epic establishes:

- shadcn/ui
- Tailwind
- application shell
- typography/layout baseline
- navigation foundation
- accessible form primitives
- loading/error/empty-state primitives

Repository evidence shows Tailwind 4, shadcn configuration, Button, Sheet, AppShell, placeholder navigation, and auth/onboarding layouts already exist. The precise purpose of EPIC-006 is therefore:

```text
formalize the existing presentation stack
→ complete the minimum coherent design system
→ finish the authenticated application shell
→ add reusable page/state primitives
→ lock an accessibility and UI-test baseline
→ synchronize documentation with reality
```

Do not change the MASTER_PLAN objective. Do not interpret “establish” as “rebuild from zero.” Do not implement business UI to make the shell look complete.

---

## 3. Scope

Presentation-layer foundation only.

### In scope

- treat the existing Tailwind 4 + shadcn (`radix-nova`, neutral, CSS variables) stack as the Foundation;
- lock a small primitive set: existing Button and Sheet, plus Input, Label, Card, and a feedback Alert;
- add a form-field composition helper (label + control + error association);
- add page-composition primitives (page header / content frame);
- add loading, error, and empty-state primitives;
- add App Router `loading.tsx` / `error.tsx` for the authenticated `(app)` boundary;
- display server-resolved workspace identity and session user identity in the shell;
- keep existing placeholder destinations as structural placeholders;
- adopt existing Tailwind `md` sidebar collapse as the Foundation breakpoint;
- add focused UI unit tests and one authenticated Playwright shell journey;
- synchronize canonical documents in the documentation phase;
- produce `docs/epics/EPIC-006/engineering-review.md` during the documentation phase.

### Out of scope

See §4.

---

## 4. Non-Goals

Do not implement:

- Client management
- Contracts
- Time entries
- Dashboard business metrics
- Billing calculations
- Reports
- Alerts
- Notifications
- AI features
- E-invoicing
- invitations
- workspace switching
- OWNER / MEMBER permission semantics (OBD-009)
- a theme switcher or dark-mode product
- a large component library (Table, Dialog, Dropdown, Select, Tabs, Checkbox, DataTable)
- new business navigation destinations
- feature modules under `src/features/clients|contracts|time-tracking|dashboard|reporting|alerts|billing`
- redesign of Better Auth, workspace resolution, or authorization
- a client `WorkspaceProvider` that accepts path/query `workspaceId` as authority
- extending `WorkspaceContext` with display fields
- changing auth/onboarding user-visible behavior or Playwright selectors
- a Playwright `/workspace-unavailable` journey (G-004)
- jsdom / React Testing Library unless a later phase proves a primitive cannot be tested as a helper
- `@axe-core/playwright` or WCAG certification
- closing OBD-001 through OBD-012
- fixing F-004-001, EPIC-003 F-001 through F-004, or G-004
- production validation or certification
- `engineering-review.md`, `qa-report.md`, `ux-review.md`, or `production-validation.md` before the documentation phase

Auth and onboarding forms stay as they are unless a primitive swap preserves accessible names and existing E2E selectors. Default: leave those forms unchanged.

---

## 5. Dependencies

| Dependency | Status | Role for this Epic |
| --- | --- | --- |
| EPIC-001 | Complete | Next.js App Router, Tailwind, shadcn bootstrap, AppShell, placeholder routes |
| EPIC-003 | Complete — PASS WITH FINDINGS | Better Auth session; protected `(app)` boundary; auth pages |
| EPIC-004 | Complete — PASS WITH FINDINGS | `WorkspaceContext`, membership resolution, onboarding, fail-closed multi-membership |
| EPIC-005 | Complete — PASS | Vitest, isolated PostgreSQL, Playwright, CI quality gates |
| `getCurrentWorkspaceContext()` | Implemented | Authenticated layout gate |
| `getAuthorizedWorkspace()` | Implemented | Authorized workspace record read for display |
| `getServerAuthSession()` | Implemented | Session user projection for account label |

Do not add a new authorization API for UI display.

---

## 6. Current Repository State

Inspected: `MASTER_PLAN.md`, `docs/product-vision.md`, `docs/architecture.md`, `docs/domain-model.md`, `docs/testing-strategy.md`, EPIC-004/005 engineering reviews, `README.md`, `package.json`, `components.json`, `postcss.config.mjs`, `src/app/**`, `src/components/**`, `src/lib/navigation.ts`, `src/lib/utils.ts`, `src/app/globals.css`, existing auth/workspace forms, `tests/e2e/app-shell.spec.ts`, `tests/unit/lib/navigation.test.ts`.

### 6.1 IMPLEMENTED ALREADY

Do not describe the following as future work.

**Styling / shadcn**

- Tailwind CSS 4.3.3 via `@tailwindcss/postcss`; no `tailwind.config.*`
- `components.json`: style `radix-nova`, RSC, CSS variables, base color `neutral`, lucide, aliases `@/components/ui`
- `src/app/globals.css`: shadcn tokens, light `:root`, unused `.dark` tokens, `h1`/`h2` typography
- Packages: `shadcn` 4.21.0, `radix-ui` 1.6.7, `class-variance-authority` 0.7.1, `lucide-react` 1.44.0, `tw-animate-css` 1.4.0
- Installed primitives: `src/components/ui/button.tsx`, `src/components/ui/sheet.tsx`
- `src/lib/utils.ts` re-exports `cn`

**Application structure**

- Root layout: Geist, `lang="en"`, light only
- `(auth)`: centered sign-in / sign-up / forgot-password
- `(public-auth)`: reset-password
- `(workspace-gate)`: onboarding and workspace-unavailable; header + sign-out; no application nav
- `(app)`: `getCurrentWorkspaceContext()` then `AppShell`; result unused for display
- Placeholder pages: `/`, `/clients`, `/contracts`, `/time-tracking`, `/reports`, `/alerts`, `/settings`
- No `(app)/loading.tsx`, `error.tsx`, or `not-found.tsx`

**Shell**

- Desktop: sticky header + `md` sidebar + main `#main-content`
- Mobile: Sheet navigation
- Skip link, `aria-current`, focus rings, `nav aria-label="Application"`
- Header shows product name `FreelanceOS` and `SignOutButton` only
- No workspace name, no account label, no role display

**Navigation**

- `src/lib/navigation.ts`: Dashboard, Clients, Contracts, Time Tracking, Reports, Alerts, Settings
- Active-state helper unit-tested

**Forms today**

- Auth and onboarding use labeled native `input`/`select` plus `Button`
- Duplicated control classes; no shared Field / Input / Label primitives

**Tests today**

- Vitest unit environment: Node (`vitest.config.mts`)
- No `@testing-library/react`, no jsdom
- Playwright: unauthenticated shell gate; onboarding enters `/` and sees Dashboard heading + Application nav
- No authenticated assertion of workspace identity, skip link, or placeholder empty copy

### 6.2 GAPS THIS EPIC CLOSES

- incomplete primitive set for later forms/pages
- no shared loading / error / empty primitives
- no authenticated error/loading boundaries
- workspace and user identity not surfaced from server-resolved state
- no page-composition convention
- typography limited to `h1`/`h2`
- UI test coverage limited to nav helper + unauthenticated shell gate

---

## 7. Architecture Impact

```text
NO RUNTIME ARCHITECTURE CHANGE
```

FreelanceOS remains a Modular Monolith.

```text
Presentation
     ↓
Application
     ↓
Domain
```

Confirmed constraints:

- authorization remains server-side;
- `WorkspaceContext` stays `{ workspaceId, userId, role }`;
- membership resolution 0 / 1 / >1 is unchanged;
- browser `workspaceId` is not authorization;
- UI may consume server-resolved workspace and session projections;
- UI must not import Prisma or the Better Auth server instance;
- no `middleware.ts`; Next.js 15.5.25 still has no `proxy.ts` convention;
- no new application User model.

Workspace name display uses the existing authorized read:

```text
getCurrentWorkspaceContext()
  ↓
getAuthorizedWorkspace(userId, context.workspaceId)
  ↓
workspace.name  →  presentation prop
```

Session user name/email is a display projection of `getServerAuthSession()`, not an authorization source.

Do not put display fields on `WorkspaceContext`. Do not create a client workspace store. Do not add a workspace switcher.

If implementation discovers a genuine need to change those contracts, stop and record an architecture change. Do not silently redesign.

---

## 8. UI Architecture

Keep the existing presentation split.

```text
src/app/                    route groups and App Router boundaries
src/components/ui/          reusable primitives only
src/components/app-shell/   authenticated chrome
src/components/page/        page composition
src/components/states/      loading / error / empty
src/features/*              existing auth and workspace surfaces only
src/lib/                    navigation helper, cn
```

Rules:

- primitives have no domain or workspace authorization logic;
- feature folders for clients/contracts/time/dashboard are not created here;
- placeholder routes remain placeholders;
- `(app)/layout.tsx` remains the authenticated workspace gate;
- shell components receive display props from the server layout;
- client components are limited to interaction (mobile nav, existing sign-out, `(app)/error.tsx`).

Page composition convention:

```text
PageHeader (title, optional description)
  ↓
page content / EmptyState / children
```

Placeholder pages use that convention and keep the current heading text so existing Playwright assertions stay valid.

---

## 9. Design System Strategy

Minimum coherent foundation. Reuse what exists.

| Decision | Foundation choice |
| --- | --- |
| Styling | Tailwind 4 + existing CSS variables |
| Component source | shadcn open components, style `radix-nova` |
| Color | existing neutral tokens; light `:root` is the runtime theme |
| Dark tokens | remain in CSS; unused; no toggle |
| Typography | Geist already loaded; extend base `h1`–`h3` and body/muted styles only |
| Spacing | Tailwind scale; page content keeps `px-4 py-6 md:px-8` |
| Radius / border / ring | existing `--radius` and token mapping |
| Icons | lucide |
| Forms | Input + Label + Field helper; native select stays on onboarding |
| Feedback | Alert primitive + ErrorState |
| Surfaces | Card |
| Overlay already present | Sheet (mobile nav) |
| Deferred primitives | Table, Dialog, Dropdown, Select, Tabs, Checkbox, DataTable |

Add primitives with the pinned `shadcn` 4.21.0 workflow so they match `components.json`. Do not install another UI kit.

Product brand colors, illustration, and marketing visual identity are not specified. Do not invent a brand system. Existing tokens are the Foundation default. No new OBD is required to implement this Epic.

---

## 10. Application Shell Strategy

Complete the existing shell. Do not replace it.

### Desktop

```text
[ skip link ]
header: product mark | workspace name | account label | Sign out
sidebar (md+): Application nav with active state
main#main-content: page composition
```

### Mobile

```text
header: menu button | product mark | account / sign out
Sheet: Application nav
main#main-content
```

Keep `md` (`768px`) as the sidebar breakpoint already used by `AppSidebar` / `MobileNav`.

### Workspace identity

Show `workspace.name` from `getAuthorizedWorkspace`.  
Do not show `workspaceId`.  
Do not show `role` (OBD-009).  
Do not add a switcher.  
`/workspace-unavailable` remains fail-closed copy, not a selector.

### Account controls

Show session `name` if present, otherwise `email`.  
Keep the existing `SignOutButton`.  
No account menu, settings dropdown, or avatar system.

### Navigation destinations

Retain the existing seven placeholder items. They are structural, not product implementations. Do not add or remove destinations.

### Loading / error boundaries

- `(app)/loading.tsx` → LoadingState
- `(app)/error.tsx` → user-safe ErrorState, no stack traces / Prisma / SQL
- optional `(app)/not-found.tsx` → same empty/error language, no business links

`(workspace-gate)` and `(auth)` keep their existing layouts.

---

## 11. Accessibility Strategy

Baseline, not certification. Do not claim WCAG conformance.

| Requirement | Foundation expectation |
| --- | --- |
| Semantic HTML | `header`, `nav`, `main`, headings |
| Skip link | keep existing `#main-content` target |
| Keyboard | nav links, menu button, Sheet, Sign out |
| Focus | visible `focus-visible` rings on controls and nav |
| Labels | every control has an accessible name |
| Active nav | `aria-current="page"` plus non-color cue (existing font-medium / background) |
| Dialog/Sheet | keep title/description already present on MobileNav |
| Contrast | use existing tokens; do not invent a second palette |
| Reduced color reliance | state text + structure, not color alone |
| Status | loading/error/empty expose text / `role="status"` or `role="alert"` as appropriate |
| Responsive | desktop productivity first; tablet/mobile remain usable |

Manual UX review remains a later lifecycle stage.

---

## 12. Testing Strategy

Use the existing pyramid. Do not add a UI test framework.

| Level | Command | EPIC-006 use |
| --- | --- | --- |
| Unit | `pnpm test` | helpers: navigation (existing), any new display/page-state helpers |
| Integration | `pnpm test:integration` | unchanged; no UI persistence work |
| E2E | `pnpm test:e2e` | one authenticated shell journey; keep unauthenticated gate |

Rules:

- Vitest stays Node. Do not add jsdom/RTL in this Epic.
- Do not duplicate auth or onboarding coverage. Extract a small E2E helper from the existing onboarding register/create-workspace steps if a new spec needs the same setup.
- Playwright asserts user-visible shell behavior: workspace name, Application nav, placeholder heading, skip link, one placeholder route.
- Do not add `/workspace-unavailable` E2E (G-004).
- Do not add axe, coverage thresholds, or extra browsers.
- Keep `CI=true` / one worker / `pnpm dev` / `TEST_DATABASE_URL` (EPIC-003 F-004, EPIC-005 contract).
- Accessibility checks are role/label/focus assertions in that Playwright journey, not a separate a11y suite.

Existing tests that must remain green:

- `tests/e2e/app-shell.spec.ts` unauthenticated gate
- `tests/e2e/onboarding.spec.ts` Dashboard heading + Application nav
- `tests/unit/lib/navigation.test.ts`

---

## 13. Phase Structure

Four phases. One objective each. One commit each. New Cursor chat per phase.

```text
Phase 1 — Design system and primitives
Phase 2 — Authenticated shell and page composition
Phase 3 — UI tests and accessibility baseline
Phase 4 — Documentation and Engineering Review
```

---

### Phase 1 — Design system and primitives

**Phase ID:** P6-01  
**Entry conditions:** this plan exists; no EPIC-006 implementation yet.

#### Objective

Lock the minimum design tokens and reusable primitives later pages can use.

#### Scope

- keep Tailwind 4 / `components.json` / existing CSS variables;
- extend `globals.css` typography (`h1`–`h3`, body, muted) without a brand redesign;
- add shadcn Input, Label, Card, Alert;
- add `Field` composition (label, control slot, optional hint/error, `aria-invalid` / `aria-describedby`);
- add `LoadingState`, `ErrorState`, `EmptyState`;
- normalize `cn` imports to `@/lib/utils` only if a touched file already imports `cn`.

#### Non-goals

- AppShell / header identity
- `loading.tsx` / `error.tsx`
- Table, Dialog, Dropdown, Select
- auth/onboarding restyle
- product pages

#### Dependencies

Existing shadcn Button/Sheet and `globals.css`.

#### Files / areas likely affected

- `src/app/globals.css`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/field.tsx` or `src/components/forms/Field.tsx`
- `src/components/states/*`

#### Implementation notes

Use pinned `shadcn` 4.21.0. Primitives are presentational. No workspace or session reads. No `any`. Components remain function declarations.

#### Tests

Unit-test Field association / EmptyState required title if logic exists as a helper. Otherwise Phase 3 covers rendering via Playwright.

#### Validation commands

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

#### Acceptance criteria

- Input, Label, Card, Alert, Field, LoadingState, ErrorState, EmptyState exist.
- Light tokens remain the runtime theme.
- No auth/onboarding behavior change.
- No architecture or authorization change.

#### Expected commit

```text
feat(ui): establish design tokens and foundation primitives
```

---

### Phase 2 — Authenticated shell and page composition

**Phase ID:** P6-02  
**Entry conditions:** Phase 1 complete.

#### Objective

Finish the authenticated chrome and page composition without adding product features.

#### Scope

- pass workspace name and account label from `(app)/layout.tsx` into the shell;
- display those values in the header;
- add `PageHeader` / page frame;
- update `PlaceholderPage` to use PageHeader + EmptyState while keeping current `h1` titles;
- add `(app)/loading.tsx` and `(app)/error.tsx`;
- optional `(app)/not-found.tsx` with the same state language;
- keep mobile Sheet and desktop sidebar behavior.

#### Non-goals

- workspace switcher
- role badge
- new routes
- invitations
- settings product
- changing `(workspace-gate)` fail-closed copy into a selector
- changing `WorkspaceContext`

#### Dependencies

Phase 1 primitives; `getCurrentWorkspaceContext`; `getAuthorizedWorkspace`; `getServerAuthSession`; `createRepositories()`.

#### Files / areas likely affected

- `src/app/(app)/layout.tsx`
- `src/app/(app)/loading.tsx`
- `src/app/(app)/error.tsx`
- `src/app/(app)/not-found.tsx`
- `src/components/app-shell/*`
- `src/components/page/*`
- `src/components/placeholder/PlaceholderPage.tsx`

#### Implementation notes

Layout remains a server component. Header can stay a server component and receive props. Do not read `searchParams.workspaceId`. Do not display `workspaceId` or `role`. If `getAuthorizedWorkspace` fails after a resolved context, fail closed with the existing error primitive — do not invent a client retry against another workspace.

#### Tests

Existing onboarding E2E must still see `Dashboard` and Application nav. New assertions wait for Phase 3.

#### Validation commands

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
CI=true pnpm test:e2e
```

#### Acceptance criteria

- Header shows server-resolved workspace name and account label.
- Placeholder pages still render the same `h1` titles.
- `(app)` has loading and error boundaries.
- No switcher, no new destinations, no authorization change.

#### Expected commit

```text
feat(ui): complete authenticated application shell
```

---

### Phase 3 — UI tests and accessibility baseline

**Phase ID:** P6-03  
**Entry conditions:** Phase 2 complete.

#### Objective

Prove the visible foundation shell and accessibility baseline without duplicating auth/onboarding suites.

#### Scope

- unit tests for any new display/page helpers;
- one authenticated Playwright journey: register → first workspace → shell shows workspace name, Application nav, Dashboard placeholder, skip link, and one other placeholder route;
- extract a small E2E setup helper if needed instead of copying onboarding assertions;
- keep the existing unauthenticated `app-shell` gate.

#### Non-goals

- jsdom/RTL
- axe suite
- G-004 fail-closed journey
- client/contract/time E2E
- rewriting EPIC-003/004 tests

#### Dependencies

Phase 2 shell; existing Playwright auth/onboarding helpers and `TEST_DATABASE_URL`.

#### Files / areas likely affected

- `tests/unit/lib/*` or `tests/unit/components/*` helpers only
- `tests/e2e/app-shell.spec.ts` and/or `tests/e2e/helpers/*`

#### Implementation notes

Reuse unique-email + isolated `*_test` database. Do not assert business widgets. Do not assert dark mode. Skip-link assertion may use keyboard focus; do not require visual screenshot review.

#### Tests / validation

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
CI=true pnpm test:e2e
```

#### Acceptance criteria

- Authenticated shell journey passes under one Playwright worker.
- Existing 12-plus foundation journeys remain passing (count may increase by the new shell assertions only).
- No new test framework.
- Isolation/authorization baseline untouched.

#### Expected commit

```text
test(ui): cover authenticated shell and accessibility baseline
```

---

### Phase 4 — Documentation and Engineering Review

**Phase ID:** P6-04  
**Entry conditions:** Phases 1–3 complete.

#### Objective

Synchronize documents with the implemented UI foundation and record the Engineering Review.

#### Scope

Update only what this Epic changed or left stale:

- `MASTER_PLAN.md` — current phase complete; next work EPIC-101; Foundation gate “initial UI shell works” only if implementation earned it;
- `docs/architecture.md` §14 — describe implemented UI foundation, not a future rebuild;
- `docs/testing-strategy.md` — Foundation UI/E2E additions; no MVP UI completeness claim;
- `README.md` / `CHANGELOG.md` as needed;
- `docs/epics/EPIC-006/engineering-review.md` — create here, not earlier;
- this plan’s status block → implementation complete after review.

#### Non-goals

- `qa-report.md`, `ux-review.md`, `production-validation.md`
- `docs/ux-principles.md` (referenced in architecture repo sketch; does not exist; do not create it here)
- closing OBDs or prior findings
- further UI implementation

#### Files / areas likely affected

- documents listed above

#### Implementation notes

Describe implemented behavior only. Record source discrepancies from §19 rather than rewriting earlier Epic reviews.

#### Validation commands

Cite only commands that match `package.json`. Re-run quality gates if the review claims they passed.

#### Acceptance criteria

- Documents no longer describe the UI foundation as missing.
- Engineering Review exists and does not claim production readiness.
- MASTER_PLAN next epic is EPIC-101.
- OBD-001 through OBD-012 remain open.

#### Expected commit

```text
docs: certify EPIC-006 ui foundation
```

---

## 14. Acceptance Criteria

EPIC-006 is engineering-complete when:

1. Tailwind + shadcn remain the Foundation styling system.
2. Button, Sheet, Input, Label, Card, Alert, Field, LoadingState, ErrorState, and EmptyState exist.
3. Authenticated AppShell shows server-resolved workspace name and session account label.
4. Desktop sidebar and mobile Sheet navigation remain, with active states.
5. Placeholder destinations remain placeholders with stable `h1` titles.
6. `(app)` loading and error boundaries render user-safe states.
7. Accessibility baseline in §11 is present and checked in Playwright where practical.
8. Existing auth, onboarding, isolation, and CI contracts still pass.
9. No runtime architecture, authorization, or workspace-resolution change.
10. No business module from §4 was implemented.
11. Inherited findings and OBD-001 through OBD-012 remain open.
12. `docs/epics/EPIC-006/engineering-review.md` exists after Phase 4.

---

## 15. Risks / Findings

Carry forward. Do not silently close.

| ID | Item | Disposition |
| --- | --- | --- |
| F-004-001 | Concurrent first-workspace creation can yield two memberships | Open. Out of scope. |
| EPIC-003 F-001 | Google/email implicit linking requires `emailVerified` | Open. Out of scope. |
| EPIC-003 F-002 | Full Google consent/callback not in CI | Open. Out of scope. |
| EPIC-003 F-003 | Production password-reset email provider unset | Open. Out of scope. |
| EPIC-003 F-004 | Playwright CI = `pnpm dev` + 1 worker | Preserve. Do not switch to `next start`. |
| G-004 | No Playwright `/workspace-unavailable` journey | Accepted. Unit/integration remain sufficient. |
| G-006 | Lint is the CI style gate; no `format:check` | Accepted. |
| G-002 | E2E uses unique emails; no truncate framework | Accepted. |

EPIC-006 planning observations (not prior defects):

| ID | Item | Disposition |
| --- | --- | --- |
| P6-G-001 | EPIC-001 already shipped a bootstrap shell | Complete it; do not rebuild. |
| P6-G-002 | `(app)/layout.tsx` discards `WorkspaceContext` | Close in Phase 2 via authorized display read. |
| P6-G-003 | `.dark` tokens exist without a product theme | Leave unused. No toggle. |
| P6-G-004 | Auth/onboarding forms use native controls | Leave unchanged by default. |
| P6-R-001 | Header identity work could leak `workspaceId` into the client as authority | Display name only; server layout owns the read. |
| P6-R-002 | Restyling auth forms could break E2E | Default: do not restyle. |
| P6-R-003 | Adding jsdom/RTL would expand the test stack | Do not add. |

No Blocker. No new Medium security finding.

---

## 16. Open Business / Product Decisions

Preserve all MASTER_PLAN OBDs. EPIC-006 must not resolve any of them.

| ID | Decision | Blocks EPIC-006? |
| --- | --- | --- |
| OBD-001 | Daily-rate semantics / partial days | No |
| OBD-002 | Monetary rounding | No |
| OBD-003 | Midnight-crossing entries | No |
| OBD-004 | Holiday model | No |
| OBD-005 | Vacation/absence model | No |
| OBD-006 | Capacity warning threshold | No |
| OBD-007 | Post-closure edits/deletes | No |
| OBD-008 | Audit requirements | No |
| OBD-009 | Workspace roles | No — do not display or interpret `role` |
| OBD-010 | Payment-term catalog | No |
| OBD-011 | Multi-currency | No |
| OBD-012 | Contract-hour rollover/expiry | No |
| — | Google/email identity linking | No — EPIC-003 F-001 |
| — | Production email provider | No — EPIC-003 F-003 |

Evaluated and **not** created as new OBDs:

| Candidate | Why no new OBD |
| --- | --- |
| Visual theme / brand | Existing shadcn neutral tokens are a sufficient Foundation default |
| Navigation information architecture | Existing seven placeholders stay |
| Dark / light mode | Light is the Foundation default; dark tokens unused |
| Workspace switcher | Already decided: absent; >1 membership fails closed |
| Responsive breakpoints | Existing Tailwind `md` sidebar collapse is sufficient |

No additional product decision is required to start implementation.

---

## 17. Implementation Order

```text
P6-01 Design system and primitives
        ↓
P6-02 Authenticated shell and page composition
        ↓
P6-03 UI tests and accessibility baseline
        ↓
P6-04 Documentation and Engineering Review
        ↓
EPIC-101 — Clients
```

Each phase: new Cursor chat, one commit, no later-phase work.

After a passing Engineering Review, Release 0 UI-shell gate may be checked. MVP feature work starts at EPIC-101 only after that review.

---

## 18. Source of Truth

Implementation must follow these documents in priority order:

1. `MASTER_PLAN.md`
2. `docs/architecture.md`
3. this Epic Plan
4. `docs/testing-strategy.md`
5. `docs/epics/EPIC-005/engineering-review.md`
6. `docs/epics/EPIC-004/engineering-review.md`
7. `docs/product-vision.md`
8. `docs/domain-model.md`

Where documents disagree, do not silently reconcile them. Record the discrepancy in the Engineering Review. Authoritative status and next work remain `MASTER_PLAN.md`. Authorization ownership remains the EPIC-004 boundary. Authentication ownership remains the EPIC-003 boundary.

---

## 19. Source Discrepancies

Do not silently reconcile.

| Sources | Discrepancy |
| --- | --- |
| `MASTER_PLAN.md` R0-E06 vs repository | Plan says “establish” shadcn, Tailwind, shell, typography, nav, form primitives, loading/error/empty. Tailwind, shadcn config, Button/Sheet, AppShell, and placeholder nav already exist from EPIC-001. This Epic completes them. |
| `MASTER_PLAN.md` §45 Phase 2 | That “Application Shell” increment belonged to EPIC-001. EPIC-006 is the formal R0-E06 UI Foundation. |
| `MASTER_PLAN.md` §4 | Still says “Application implementation: NOT STARTED” while auth, workspace, and a bootstrap shell exist. Status language is product-vs-foundation. Do not rewrite as if MVP started. |
| `docs/architecture.md` §14.2 | Suggests `src/features/clients` and siblings. Those modules are EPIC-101+. Do not create them here. |
| `docs/architecture.md` §14.3 | Says the visual system should be defined explicitly. Tokens exist as shadcn defaults, not a product brand system. Foundation keeps those defaults. |
| `docs/architecture.md` §29 | Lists `docs/ux-principles.md`. The file does not exist. Do not create it in this Epic. |
| `docs/testing-strategy.md` §34 / §45 | Lists accessibility E2E for login, dashboard, and later product forms. Login already exists; product screens do not. This Epic covers shell/placeholder a11y only. |
| EPIC-004 review | AppShell destinations were already placeholders. Keep that interpretation. |

---

## 20. Implementation Chat Protocol

Every new Cursor chat starts from zero context.

For each phase, read:

```text
MASTER_PLAN.md
docs/epics/EPIC-006/epic-plan.md
docs/architecture.md
docs/epics/EPIC-005/engineering-review.md
```

plus the files named in that phase. Do not implement later phases in the same chat.

---

## 21. Exit Criteria / Certification

| State | Meaning for EPIC-006 |
| --- | --- |
| Engineering completion | Phases 1–4 done; Engineering Review written |
| Validation | Quality commands pass; not a separate QA report in this Epic |
| Certification | Engineering Review verdict only. Not production certification |
| Production readiness | **NO** |

```text
EPIC-006 engineering completion
        ≠
production validation
        ≠
production certification
        ≠
READY FOR RELEASE
```

---

## 22. Final Planning Gate

This planning document is complete when:

- [x] Epic identity and MASTER_PLAN objective are recorded
- [x] Implemented UI state is separated from gaps
- [x] Non-goals prevent product and prior-finding work
- [x] Architecture impact is no runtime change
- [x] Design system, shell, accessibility, and testing strategies match the repository
- [x] Phases are small, coherent, and one-commit
- [x] Inherited findings and OBD-001 through OBD-012 remain open
- [x] No unjustified new OBD was invented
- [x] Next Epic is EPIC-101, not an invented EPIC-007
- [x] Production readiness is not claimed

```text
EPIC-006 IMPLEMENTATION COMPLETE
READY FOR EPIC-101
```

Do not start EPIC-101 in this chat.
