# EPIC-003 — Authentication

## 1. Epic Identity

**Epic:** EPIC-003  
**Release:** Release 0 — Foundation  
**Objective:** Authentication Foundation  
**Status:** In progress — Phase 4 complete  
**Depends on:** EPIC-001 — Foundation / Repository; EPIC-002 — Database & Persistence  
**Next Epic:** EPIC-004 — Workspace

---

## 2. Objective

Establish the authentication foundation required so FreelanceOS can identify users and maintain secure sessions.

This Epic introduces:

- Better Auth, pinned to a verified compatible version;
- Better Auth-owned persistence;
- email/password registration, sign-in, and sign-out;
- Google OAuth configuration;
- session lifecycle and persistence;
- password recovery;
- a protected server-side auth boundary;
- route protection for authenticated application surfaces;
- authentication tests against PostgreSQL;
- CI coverage that does not require Google production credentials.

The result must be a stable authenticated-user identity that later Epics can attach to `WorkspaceMember` and workspace authorization.

This Epic does **not** implement authorization, workspace onboarding, or business features.

---

## 3. Source of Truth

Implementation must follow these documents in priority order:

1. `MASTER_PLAN.md`
2. `docs/architecture.md`
3. `docs/storage.md`
4. `docs/product-vision.md`
5. `docs/domain-model.md`
6. `docs/testing-strategy.md`
7. this Epic Plan
8. Better Auth documentation for the version pinned in Phase 1

Where implementation details are ambiguous, do not silently invent product rules. Preserve documented open decisions. Record technical findings rather than closing business decisions.

---

## 4. Context

EPIC-001 established the Next.js / TypeScript application, App Router, quality commands, and CI.

EPIC-002 established and certified the persistence foundation:

```text
PASS WITH FINDINGS
READY FOR EPIC-003
```

Review: `docs/epics/EPIC-002/engineering-review.md`.

Available and must be reused, not redesigned:

- PostgreSQL 17;
- Prisma 6.19.3;
- committed Prisma Migrate chain;
- application-owned schema;
- workspace-scoped repository ports;
- Prisma Infrastructure implementations;
- transaction helper;
- deterministic development seed;
- isolated `TEST_DATABASE_URL`;
- CI PostgreSQL gate.

Current stack relevant to this Epic:

| Layer | Current pin |
| --- | --- |
| Next.js | 15.5.25 |
| React | 19.1.0 |
| TypeScript | 5.9.3 |
| Prisma | 6.19.3 |
| PostgreSQL | 17 |
| Vitest | 4.1.11 |
| Playwright | 1.63.0 |

Phase 1 pinned Better Auth 1.7.4 and migrated `user`, `session`, `account`, and `verification`.

Phase 2 implemented email/password registration, sign-in, sign-out, server-side session retrieval, the Better Auth App Router handler at `/api/auth/[...all]`, and an authenticated `(app)` layout boundary.

Phase 3 configured Google OAuth through Better Auth's Google provider. The callback remains `/api/auth/callback/google` on the existing catch-all handler. Account linking uses Better Auth defaults (`requireLocalEmailVerified: true`). Workspace authorization is not implemented.

Phase 4 implemented password recovery through Better Auth's `requestPasswordReset` / `resetPassword` API. Recovery tokens are stored in the existing `verification` table. `revokeSessionsOnPasswordReset` is enabled. Email delivery is an Infrastructure boundary with development/test/production modes; no production email provider is selected. Google/email implicit linking remains unchanged (`requireLocalEmailVerified: true`).

`WorkspaceMember.userId`, `TimeEntry.userId`, and `Notification.userId` are logical auth-user identifiers. The development seed uses opaque ids (`seed-user-owner`, `seed-user-member`) and does not create authentication users.

---

## 5. Current State

```text
Application implementation: NOT STARTED
Authentication: EMAIL/PASSWORD + GOOGLE OAUTH + PASSWORD RECOVERY + SESSIONS IMPLEMENTED
Authorization: NOT STARTED
Workspace onboarding: NOT STARTED
MVP implementation: NOT STARTED
```

Authentication persistence remains outside the application-owned Prisma schema by design.

---

## 6. Architectural Baseline

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

Authentication is an Infrastructure concern with a Presentation surface.

Expected request path:

```text
Browser
   ↓
Auth UI / Better Auth client
   ↓
Better Auth server instance
   ↓
Server-side auth boundary
   ↓
PostgreSQL
```

Dependency rules:

- Domain must not import Better Auth, Prisma, Next.js, or React.
- UI / Client Components must not import the server-only auth instance, Prisma, or secrets.
- Application code may consume an authenticated-user identity. It must not own credentials, sessions, or OAuth.
- Do not create a parallel JWT, session store, or password-hashing implementation.

Preserve the EPIC-002 Infrastructure Prisma client (`server-only`). Better Auth must reuse that PostgreSQL/Prisma boundary rather than opening a second database client lifecycle unless the pinned library requires a documented exception.

---

## 7. Authentication vs Authorization

Authentication answers:

```text
Who is this user?
```

Authorization answers:

```text
What may this user do?
```

EPIC-003 owns identity and session.

EPIC-003 does **not** own:

- workspace membership enforcement;
- `WorkspaceMember.role` semantics;
- permission matrix;
- resource authorization;
- admin permissions;
- tenant isolation as an authorization decision.

Conceptual chain, only the first step is in scope:

```text
Authentication
      ↓
User identity
      ↓
WorkspaceMember          ← EPIC-004
      ↓
Workspace authorization  ← EPIC-004+
```

A valid session proves identity. It does not prove workspace membership or role.

Protected application routes in this Epic mean **authenticated**, not **authorized for a workspace**.

---

## 8. Identity Model

Authenticated user identity is owned by Better Auth.

```text
Auth User
   │
   ├── Sessions
   ├── Accounts (email/password, Google)
   └── WorkspaceMember.userId   ← application reference, not auth ownership
```

Rules:

- Do not create a second application-owned User table.
- Do not treat `WorkspaceMember` as the auth-user table.
- Do not change the domain model to duplicate identity.
- `WorkspaceMember.userId` remains a logical reference to the Better Auth user id.
- Do not add a Prisma relation or database FK from application tables to auth tables in this Epic unless a documented integrity defect requires it. Default: keep the logical FK.
- Registration must not create a workspace or membership. That belongs to EPIC-004.

The authenticated-user identifier used by the application is the Better Auth user id.

---

## 9. Epic Scope

### In Scope — MVP authentication

Product scope from `docs/product-vision.md` F-001–F-005 and `MASTER_PLAN.md` R0-E03:

- Better Auth integration with the existing Prisma/PostgreSQL foundation;
- email/password registration;
- email/password sign-in;
- sign-out;
- password hashing via Better Auth;
- session creation, persistence, retrieval, invalidation, and expiration;
- invalid-credential handling;
- Google OAuth configuration, callback handling, and required account linking;
- password recovery;
- server-side session as the source of truth;
- protection of authenticated application routes;
- environment/secret categories for development, test, and production;
- authentication persistence via Prisma Migrate;
- authentication integration tests against PostgreSQL;
- CI that can run those tests without Google credentials;
- documentation synchronization and Engineering Review.

### Out of Scope — future authentication enhancements

- email verification as a product gate before sign-in, unless the pinned Better Auth version cannot operate email/password without it;
- MFA;
- passkeys;
- enterprise SSO / SAML / OIDC federation beyond Google;
- SCIM;
- invitation system;
- advanced account linking beyond Better Auth's required Google/email behavior;
- native mobile authentication;
- audit logging;
- identity-provider administration UI.

---

## 10. Non-Goals

Do not implement:

- workspace authorization;
- role enforcement;
- permission matrix;
- organization administration;
- workspace creation/onboarding;
- invitation system;
- SCIM;
- enterprise SSO;
- MFA;
- passkeys;
- account linking beyond required OAuth behavior;
- audit logging;
- identity-provider federation;
- native mobile authentication;
- AI;
- client/contract/time-tracking/dashboard/report/alert features;
- production email-provider procurement;
- production deployment;
- redesign of EPIC-002 persistence;
- silent resolution of OBD-009 or any other OBD.

A persistence or UI surface may exist for authentication even though workspace and business features belong to later Epics.

---

## 11. Persistence

Distinguish two ownership boundaries.

### Better Auth-owned persistence

Expected core records, exact names from the pinned Better Auth version:

```text
User
Session
Account
Verification
```

These tables are generated/declared according to Better Auth + Prisma adapter guidance, then applied through the existing Prisma Migrate chain.

Rules:

- Do not hand-author a competing auth schema.
- Use the Better Auth schema-generation path for the pinned version, then review the SQL.
- Apply with `prisma migrate`. Never `db push`.
- Do not fold auth tables into application-owned business models.
- Do not move application-owned models into Better Auth.

The verification table may exist because password recovery uses secure tokens. That is not the same as implementing email-verification-as-product-gate.

### Application-owned persistence

Unchanged:

```text
Workspace
WorkspaceMember
Client
Contract
TimeEntry
WorkspaceSettings
Alert
Notification
```

Do not alter application invariants, indexes, exclusion constraints, or repository ports unless a proven auth-integration defect requires a minimal, documented change.

### Migration discipline

```text
existing EPIC-002 chain
        ↓
reviewed Better Auth schema addition
        ↓
prisma migrate
        ↓
CI migrate deploy on TEST_DATABASE_URL
```

`db push` remains forbidden.

The development seed may keep opaque user ids for persistence fixtures. Auth tests must create real authentication users themselves. Converting the seed into Better Auth users is not required unless E2E cannot otherwise remain deterministic.

---

## 12. Security

Use Better Auth and framework protections. Do not invent a custom security framework.

Required properties:

| Concern | Requirement |
| --- | --- |
| Password hashing | Better Auth native hashing. No custom hash implementation. |
| Session security | Server-managed sessions. No application-owned JWT parallel. |
| Cookies | Secure, HTTP-only session cookies in production according to the library. |
| CSRF | Use Better Auth / Next.js protections. Do not add a second CSRF system. |
| OAuth | Use Better Auth Google provider state/PKCE behavior. |
| Secrets | Server-only. Never `NEXT_PUBLIC_` for secrets. Never commit secrets. |
| Tokens | Recovery tokens expire and are single-use according to the library. |
| Logging | No passwords, session tokens, recovery tokens, or secrets in logs. |
| Brute force | Use Better Auth/framework rate-limiting if available. Do not invent a custom limiter unless a documented gap exists. |
| Production | HTTPS, production secrets, production Google credentials, production app URL. |

Server-only auth code must be isolated so Client Components cannot import it. Reuse the `server-only` convention already used for Prisma.

---

## 13. Environment & Secrets

Define categories, not final names. Final names follow the pinned Better Auth version.

### Required categories

| Category | Purpose | Browser-visible |
| --- | --- | --- |
| Database URL | Existing Prisma connection | No |
| Auth secret | Session/crypto secret | No |
| Application URL | Base URL for callbacks and cookies | No |
| Google client id | OAuth client id | Typically public; confirm with library |
| Google client secret | OAuth client secret | No |

Do not treat `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, or `GOOGLE_CLIENT_SECRET` as the final names until Phase 1 verifies the library.

### Environment split

| Environment | Auth secret | Google credentials | Email delivery |
| --- | --- | --- | --- |
| development | local secret | optional | non-production adapter |
| test / CI | generated test secret | absent | captured/mocked |
| production | managed secret | required for Google | production provider, later |

Rules:

- Tests and CI must not require real Google OAuth credentials.
- Tests and CI must not require a production email provider.
- `.env.example` documents categories and non-secret examples only.
- Do not commit `.env`.

---

## 14. Server / Client Boundary

```text
Browser
   ↓
Auth UI / Better Auth client
   ↓
Better Auth HTTP handler
   ↓
Server-only auth instance
   ↓
Prisma / PostgreSQL
```

| Code | Allowed |
| --- | --- |
| Server Components, Route Handlers, `proxy` | Server auth instance, session read, Prisma |
| Client Components | Better Auth client only |
| Domain | Neither |

Phase 2 must choose the Better Auth Next.js App Router handler path recommended by the pinned version.

One source of truth: the server session. Client auth state is a projection, not an authority.

---

## 15. Route Protection

Protect application routes that require an authenticated user.

Evaluate, in this order:

1. Better Auth's recommended Next.js 15 session API;
2. server-side session checks in Server Components / layouts / route handlers;
3. Next.js request-interception (`proxy`; `middleware` is deprecated in project convention).

Rules:

- Do not design a second session mechanism.
- Edge/proxy gating, if used, is a fast reject. Server-side session validation remains authoritative.
- Unauthenticated access to protected routes redirects to sign-in.
- Authenticated access to auth pages may redirect into the application.
- Auth pages remain reachable without a session.
- Existing placeholder application routes become authenticated surfaces.
- Do not check `WorkspaceMember.role` or workspace membership.

Document the chosen mechanism and why it matches both Better Auth and the project's `proxy` convention. If the pinned Next.js 15.5 / Better Auth combination still documents `middleware` and `proxy` is not available, record that as a finding and use the supported library path rather than inventing a shim.

---

## 16. Authentication Features

### Email / password

- registration;
- sign-in;
- sign-out;
- password hashing;
- session creation and persistence;
- invalid credentials;
- account lifecycle sufficient for create/authenticate/invalidate.

### Google OAuth

- provider configuration;
- callback handling;
- account linking required by Better Auth when the same user uses Google and email/password;
- environment-specific configuration;
- development/test behavior without production Google credentials.

### Sessions

- create on successful authentication;
- retrieve on the server;
- invalidate on logout;
- expire according to Better Auth configuration;
- cookie/security model from the library.

### Password recovery — in scope

Product requirement F-004.

- reset request;
- secure token;
- expiration;
- password replacement;
- invalid/expired token behavior;
- subsequent sign-in with the new password.

Email delivery is an Infrastructure adapter. Production provider remains TBD. Development/test must use a captured or console adapter so CI never sends real email.

### Email verification — not a product requirement

F-001–F-005 do not require verifying email before use.

Default: do not implement verification-as-sign-in-gate.

If the pinned Better Auth version cannot persist recovery tokens without a verification table, the table may exist. That does not enable a verification product flow.

If Phase 1 discovers email/password cannot function without verification, record it as a technical finding and implement the minimum required by the library.

---

## 17. Testing Strategy

Follow `docs/testing-strategy.md`. Do not replace EPIC-002 persistence tests.

### Unit

Only for application/auth utilities that contain real logic. Do not unit-test Better Auth internals.

### Integration — PostgreSQL, real migration chain

When the relevant phase lands, verify:

- auth user persistence;
- credential persistence;
- session persistence;
- successful email/password sign-in;
- sign-out invalidates the session;
- invalid credentials fail;
- password recovery token/password replacement invariants that can be tested without a real mailbox;
- application-owned tables still migrate and pass existing persistence tests.

Use `TEST_DATABASE_URL`. Never `freelance_os`. Apply migrations with `pnpm test:db:migrate`. Never `db push`.

### OAuth

Configuration/wiring tests and controlled provider mocking.

Do not call Google. Do not build a fake production OAuth provider.

### E2E

Minimum authentication journeys:

```text
register → login → authenticated session → logout
invalid credentials rejected
unauthenticated protected-route access redirects to sign-in
password recovery in the test environment → login with new password
```

Google is not a CI E2E journey against the real provider.

Expired-session behavior is in scope where it can be made deterministic.

---

## 18. CI

Preserve:

```text
PostgreSQL service
      ↓
Prisma migrations
      ↓
Auth persistence
      ↓
Integration tests
      ↓
lint / typecheck / unit / build
```

CI must:

- apply the full migration chain, including auth tables;
- run authentication integration tests;
- continue to run EPIC-002 persistence tests;
- supply a test auth secret and application URL;
- not require Google credentials;
- not require a production email provider;
- not echo secrets.

Do not add unnecessary external services.

Playwright auth E2E may run locally and in CI only if they remain deterministic without Google or real email. If E2E cannot be made deterministic in CI during Phase 5, document the gap; do not block on a live Google flow.

---

## 19. Dependencies

### Completed

- EPIC-001 — Repository & Application Bootstrap
- EPIC-002 — Database & Persistence

### Required from EPIC-002

- PostgreSQL;
- Prisma;
- migration chain;
- test database;
- repository/infrastructure conventions;
- CI database service.

### This Epic supplies to later work

Authenticated user identity for EPIC-004 Workspace and all authorization.

### Must not pull forward

Workspace onboarding, role model, resource authorization.

---

## 20. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R-001 | Better Auth version incompatibility with Next.js 15 / React 19 / Prisma 6 | Medium | High | Phase 1 verifies and pins a compatible version. Do not upgrade Prisma to 7 unless a documented blocker requires it. |
| R-002 | Auth schema conflicts with application Prisma schema | Medium | High | Generate via official adapter/CLI, review SQL, migrate only. Keep ownership boundaries. |
| R-003 | Accidental merge of auth and application identity | Low | High | No application User table. Logical `userId` only. |
| R-004 | Session or cookie misconfiguration | Medium | High | Use Better Auth defaults; verify production cookie flags. |
| R-005 | Google OAuth blocks local/CI work | Medium | Medium | Optional in development; mocked/absent in test/CI. |
| R-006 | Non-deterministic auth tests | Medium | High | Isolated test DB, captured email, no live Google, no shared clock assumptions where expiration matters. |
| R-007 | Environment/secret leakage | Medium | High | Server-only secrets; `.env.example` without secrets; no credential logging. |
| R-008 | Server auth imported into Client Components | Medium | High | `server-only`; split client/server modules; typecheck/lint. |
| R-009 | Future workspace authorization assumes auth does too much | Medium | Medium | Keep membership/role out of this Epic. Session ≠ authorization. |
| R-010 | Migration-chain break | Medium | High | Additive reviewed migration; CI `migrate deploy`; no `db push`. |

---

## 21. Open Decisions

Do not close any OBD.

| ID | Relevance to EPIC-003 | Phase that might consume it later | Blocks EPIC-003? |
| --- | --- | --- | --- |
| OBD-009 | `WorkspaceMember.role` exists (`OWNER` / `MEMBER`). Auth must work without a permission matrix. Preserve F-P2-005. | EPIC-004+ | No |
| OBD-008 | Future audit trails will need authenticated user ids. Do not implement audit. | Release 2 | No |
| OBD-001–007, OBD-010–012 | Billing, time, capacity, currency. Not auth. | Later Epics | No |

### Technical decisions to resolve during implementation, not as OBDs

| Decision | Phase | Rule |
| --- | --- | --- |
| Better Auth version pin | Phase 1 | Verify against current Next.js / React / TypeScript / Prisma / PostgreSQL. |
| Exact environment variable names | Phase 1 | Follow the pinned library. |
| Request-interception mechanism (`proxy` vs library `middleware`) | Phase 2 | Prefer project `proxy` convention if supported; otherwise use the library-supported Next.js 15 path and record a finding. |
| Email delivery adapter for recovery | Phase 4 | Non-production adapter for development/test. Production provider remains TBD. |
| Email verification gate | Phase 1 / 4 | Off unless the library cannot function without it. |

---

## 22. Documentation Requirements

Update only when the corresponding behavior exists:

| Document | When |
| --- | --- |
| `docs/architecture.md` | After Better Auth is the implemented auth adapter and the server/client boundary is real |
| `docs/storage.md` | After auth tables exist; keep the ownership boundary explicit |
| `docs/testing-strategy.md` | After auth integration/E2E commands exist |
| `README.md` | After env vars, scripts, or setup steps change |
| `CHANGELOG.md` | Each phase |
| `MASTER_PLAN.md` | Epic completion / status change |
| ADR-006 — Authentication ownership | Only if Phase 6 judges the decision architectural enough for a standalone ADR |

Do not describe planned behavior as implemented.

Preserve EPIC-002 findings: F-P3-002, F-P2-003, F-P2-004, F-P2-005.

---

## 23. Phases

Each phase:

```text
NEW CHAT
One objective
One commit
Do not start the next phase
```

Corrections stay in the same phase chat.

---

### Phase 1 — Authentication architecture & persistence foundation

**Cursor chat:** NEW CHAT  
**Commit expected:** YES

#### Objective

Pin Better Auth and persist its schema on the existing PostgreSQL/Prisma foundation.

**Pinned version:** Better Auth `1.7.4` with `@better-auth/prisma-adapter` `1.7.4`. Verified compatible with Next.js 15.5.25, React 19.1.0, TypeScript 5.9.3, Prisma 6.19.3, and PostgreSQL 17. Prisma remains on 6.19.3.

#### Scope

- Verify a stable Better Auth version compatible with Next.js 15.5, React 19, TypeScript 5.9, Prisma 6.19, and PostgreSQL 17.
- Add the library and Prisma adapter.
- Create the server-only Better Auth instance in Infrastructure.
- Generate Better Auth Prisma models through the official path.
- Add a reviewed Prisma migration. Never `db push`.
- Document environment-variable categories in `.env.example`.
- Keep application-owned models unchanged.

#### Non-Goals

No auth UI. No email/password product flow. No Google. No route protection. No password recovery. No workspace changes. No Prisma major upgrade unless a documented compatibility blocker exists.

#### Dependencies

EPIC-002 persistence foundation.

#### Implementation

- Pin versions in the lockfile.
- Reuse the existing server-only Prisma client unless the adapter requires a documented exception.
- Auth tables remain Better Auth-owned.
- Confirm `WorkspaceMember.userId` can store the Better Auth user id without a schema change.

#### Tests

Migration-from-clean-database still passes. Existing persistence tests still pass. No product auth tests yet.

#### Documentation

`.env.example` categories. Brief architecture/storage notes only if required to avoid describing fiction as implemented. Prefer Phase 6 for full synchronization.

#### Expected commit

```text
feat(auth): establish better auth persistence foundation
```

#### Exit criteria

- Compatible Better Auth version is pinned and recorded.
- Auth tables exist only via committed migrations.
- Server-only auth instance exists and is not imported by Client Components.
- Application-owned schema is unchanged except for reviewed auth-table additions.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, and `pnpm build` pass.
- No OBD closed.

---

### Phase 2 — Email/password authentication, sessions & protected server boundary

**Cursor chat:** NEW CHAT  
**Commit expected:** YES

#### Objective

A user can register, sign in, remain authenticated, access protected application routes, and sign out.

#### Scope

- Email/password registration, sign-in, sign-out.
- Session create / read / invalidate / expire via Better Auth.
- Invalid-credential behavior.
- Minimal auth UI sufficient for those flows.
- Better Auth Next.js HTTP handler.
- Better Auth client for Client Components.
- Server-side session as the source of truth.
- Protection of existing application placeholder routes.
- Redirect behavior for unauthenticated and authenticated users.
- Request-interception evaluation (`proxy` vs library-supported path).

#### Non-Goals

No Google. No password recovery UI. No email verification gate. No workspace creation. No role checks. No business CRUD.

#### Dependencies

Phase 1.

#### Implementation

- Follow the pinned Better Auth Next.js App Router integration.
- Keep secrets and the auth instance server-side.
- Do not implement a parallel session/JWT layer.
- Registration does not create `Workspace` or `WorkspaceMember`.

#### Tests

Integration coverage for register, valid sign-in, invalid credentials, session persistence, and sign-out. Targeted E2E for the same happy path if it can stay deterministic.

#### Documentation

README setup notes if developers need new env values or auth routes.

#### Expected commit

```text
feat(auth): implement email password sessions and route protection
```

#### Exit criteria

- Email/password register, sign-in, and sign-out work.
- Sessions persist and are invalidated on logout.
- Invalid credentials are rejected.
- Protected routes require a server-side session.
- Client Components do not import server auth.
- Quality gate passes.

#### Phase 2 finding

Next.js 15.5.25 does not provide `proxy.ts`. Better Auth still documents `middleware.ts` for this version. Project convention deprecates `middleware`. Phase 2 therefore uses server-side session checks in the authenticated App Router layout as the authoritative boundary. No `middleware.ts` or invented `proxy` shim was added.

---

### Phase 3 — Google OAuth

**Cursor chat:** NEW CHAT  
**Commit expected:** YES

#### Objective

Configure Google as an authentication provider without making CI or local tests depend on real Google credentials.

#### Scope

- Google provider configuration in Better Auth.
- Callback handling.
- Required account linking behavior.
- Environment-variable wiring.
- Development behavior when Google credentials are present.
- Test/CI behavior when they are absent.
- Minimal UI entry point for Google sign-in.

#### Non-Goals

No additional social providers. No enterprise SSO. No advanced multi-account linking product. No live Google calls in CI.

#### Dependencies

Phase 2.

#### Implementation

- Use Better Auth's Google provider.
- Keep the client secret server-side.
- Document that production Google credentials are a deployment concern.
- If credentials are missing locally, the email/password path remains usable.

#### Tests

Configuration/wiring tests and controlled mocking. No real Google user.

#### Documentation

README / `.env.example` Google categories. Production vs development/test behavior.

#### Expected commit

```text
feat(auth): add google oauth
```

#### Exit criteria

- Google is configured through Better Auth.
- Callbacks are wired.
- Required account linking is the library behavior, not a custom linker.
- CI passes without Google credentials.
- Email/password still works.

#### Phase 3 finding

Better Auth 1.7.4 implicit account linking requires the existing local user to have `emailVerified: true`. Email/password registration does not verify email. A later Google sign-in for that same email is therefore rejected (`account not linked`) rather than merged. FreelanceOS does not override `requireLocalEmailVerified`. Full Google consent/callback is not automated in CI.

---

### Phase 4 — Password recovery

**Cursor chat:** NEW CHAT  
**Commit expected:** YES

#### Objective

A user can recover access with a secure, expiring token and a new password.

#### Scope

- Reset request.
- Secure token persistence and expiration.
- Password replacement.
- Invalid/expired token behavior.
- Sign-in with the new password.
- Non-production email/capture adapter.
- Recovery UI sufficient for the flow.

#### Non-Goals

No production email vendor selection. No notification-center email. No email-verification-as-sign-in-gate unless Phase 1 recorded a library requirement. No MFA.

#### Dependencies

Phase 2. Phase 3 is not required, but this phase starts only after Phase 3 is complete to preserve Epic order.

#### Implementation

- Use Better Auth password-reset facilities.
- Do not invent a custom token table if Better Auth already owns verification/reset records.
- Development/test delivery must be inspectable without a real mailbox.
- Tokens and passwords must not be logged.

#### Tests

Integration and E2E for request → replace password → sign-in, plus invalid/expired token cases, using the test adapter.

#### Documentation

Document the development/test recovery adapter and that production email remains TBD.

#### Expected commit

```text
feat(auth): implement password recovery
```

#### Exit criteria

- Recovery request issues a secure expiring token.
- A valid token replaces the password.
- Invalid/expired tokens fail safely.
- The user can sign in with the new password.
- CI does not send real email.
- Quality gate passes.

#### Phase 4 notes

- Better Auth 1.7.4 APIs: `requestPasswordReset`, `resetPassword`, `emailAndPassword.sendResetPassword`.
- Token persistence: existing `verification` rows, identifier `reset-password:${token}`. No migration.
- Session behavior: `revokeSessionsOnPasswordReset: true` (library default is `false`).
- Email: `AUTH_EMAIL_DELIVERY` = development | test | production. Production provider remains TBD. Tokens and reset URLs are never logged.
- Account enumeration: Better Auth returns the same status/message for known and unknown emails. The UI uses a single acknowledgement.
- Preserved Phase 3 finding: implicit Google/email linking still requires `emailVerified: true`. Not changed.

---

### Phase 5 — Authentication integration testing & CI

**Cursor chat:** NEW CHAT  
**Commit expected:** YES

#### Objective

Prove authentication persistence and flows against PostgreSQL and keep CI deterministic.

#### Scope

- Complete the auth integration suite on the real migration chain.
- Complete deterministic email/password and recovery E2E if not already sufficient.
- Confirm OAuth tests remain credential-free.
- Confirm CI applies auth migrations and runs auth tests.
- Confirm EPIC-002 persistence tests still pass.
- Confirm secrets are not required from Google or a production mailer.

#### Non-Goals

No new product features. No live Google E2E. No production deployment.

#### Dependencies

Phases 1–4.

#### Implementation

Add only tests, fixtures, CI env, and the minimum harness required for determinism.

#### Tests

Minimum verifiable set:

- auth user and session persistence;
- email/password sign-in and sign-out;
- invalid credentials;
- protected-route redirect;
- password recovery without real email;
- OAuth wiring without Google credentials;
- existing persistence invariants still pass;
- clean-database migration chain still applies.

#### Documentation

`docs/testing-strategy.md` only if commands or CI behavior change.

#### Expected commit

```text
test(auth): verify authentication persistence and flows
```

#### Exit criteria

- Integration suite covers the invariants above.
- CI is green without Google credentials.
- Auth tables are created by migrations in CI.
- No flaky dependency on wall-clock email providers.

---

### Phase 6 — Documentation & Authentication Engineering Review

**Cursor chat:** NEW CHAT  
**Commit expected:** YES

#### Objective

Certify that implementation matches this plan and the architecture, then prepare EPIC-004.

#### Scope

- Synchronize `docs/architecture.md`, `docs/storage.md`, `docs/testing-strategy.md`, `README.md`, `CHANGELOG.md`, and `MASTER_PLAN.md` with implemented reality.
- Evaluate ADR-006.
- Review server/client boundary, secrets, migrations, tests, and CI.
- Produce `docs/epics/EPIC-003/engineering-review.md`.
- Run the final quality gate.

#### Non-Goals

No new authentication features. No authorization. No workspace onboarding.

#### Dependencies

Phases 1–5.

#### Implementation

Documentation and review only.

#### Tests

Re-run the established quality gate. Do not invent extra suites.

#### Documentation

Engineering review artifact plus synchronized baseline docs.

#### Expected commit

```text
docs(auth): complete authentication engineering review
```

#### Exit criteria

- Documentation describes implemented behavior only.
- Engineering review exists.
- No unresolved Blocker or High findings.
- Authentication boundary is ready for EPIC-004.
- Verdict is explicit.

---

## 24. Phase Discipline

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
- do not redesign EPIC-002.

---

## 25. Cursor Chat Strategy

| Work | Chat |
| --- | --- |
| Epic planning | NEW CHAT (this document) |
| Phase 1 | NEW CHAT |
| Phase 2 | NEW CHAT |
| Phase 3 | NEW CHAT |
| Phase 4 | NEW CHAT |
| Phase 5 | NEW CHAT |
| Phase 6 / Engineering Review | NEW CHAT |

Continue the current chat only for a correction inside the same phase.

Each new chat recovers context from the repository, not from previous conversation memory.

---

## 26. Token-Saving / Cursor Execution Rules

- Read only documents required for the current phase.
- Do not reprint entire files.
- Inspect with targeted searches. No repository-wide exploration.
- Smallest change that satisfies the phase.
- No speculative abstractions or extra dependencies.
- Do not install packages, modify Prisma, or change CI except in the phase that requires it.
- Do not resolve OBDs.
- After a fix, rerun affected checks. Do not repeat green checks with no relevant change.
- Final reports: changed files, decisions, verification, findings, commit hash.
- Token saving never skips architecture, migration review, security, tests, or Git review.

---

## 27. Epic Acceptance Criteria

Each criterion is verifiable.

1. A user can register with email and password and a Better Auth user record is persisted.
2. A user can sign in with valid email and password and receive a server session.
3. Invalid credentials do not create a session.
4. A user can sign out and the session is invalidated.
5. The session persists across a subsequent authenticated request according to Better Auth configuration.
6. Google OAuth is configured through Better Auth, with callbacks wired and secrets kept server-side.
7. CI and automated tests pass without real Google credentials.
8. A user can complete password recovery with a secure expiring token and sign in with the new password.
9. Recovery does not require a production email provider in development, test, or CI.
10. Auth tables are created by committed Prisma migrations on a clean database.
11. Application-owned tables remain application-owned; no second User identity exists.
12. `WorkspaceMember` is unchanged as the membership model; roles are not enforced.
13. Server Components / route handlers obtain identity from the Better Auth server session.
14. Client Components cannot import server-only auth or database code.
15. Unauthenticated requests to protected application routes redirect to sign-in.
16. Secrets are absent from the repository and from client bundles.
17. Existing EPIC-002 persistence integration tests still pass.
18. Authentication integration tests pass against PostgreSQL.
19. Documented email/password E2E auth flows pass.
20. CI applies the migration chain, runs auth tests, and remains green.
21. Architecture, storage, testing, README, and changelog describe implemented auth behavior.
22. No Blocker or High finding remains unresolved.

---

## 28. Epic Exit Criteria

```text
Better Auth pinned
      ↓
Auth persistence migrated
      ↓
Email/password
      ↓
Sessions
      ↓
Google OAuth configured
      ↓
Password recovery
      ↓
Protected server boundary
      ↓
Integration tests
      ↓
E2E auth flows
      ↓
CI
      ↓
Documentation synchronized
      ↓
Engineering Review
      ↓
READY FOR EPIC-004
```

Certification requires:

- authentication flows function as specified;
- persistence verified on PostgreSQL;
- session lifecycle verified;
- security checks passed;
- integration tests pass;
- planned E2E auth flows pass;
- CI passes without Google credentials;
- documentation synchronized;
- no unresolved Blocker/High findings;
- identity boundary ready for workspace authorization.

---

## 29. Definition of Done

EPIC-003 is complete only when:

- [ ] Better Auth is pinned to a verified compatible version.
- [ ] Auth tables exist via committed Prisma migrations.
- [ ] Email/password registration, sign-in, and sign-out work.
- [ ] Sessions persist and can be invalidated.
- [ ] Google OAuth is configured without blocking CI.
- [ ] Password recovery works with secure expiring tokens.
- [ ] Server-side session is the auth source of truth.
- [ ] Protected application routes require authentication.
- [ ] Server/client auth modules are separated.
- [ ] Secrets are not in the repository or client bundle.
- [ ] No application-owned User table was added.
- [ ] `WorkspaceMember.role` / OBD-009 remain unresolved.
- [ ] Authorization was not implemented.
- [ ] Integration tests cover auth persistence and session flows.
- [ ] Planned E2E auth flows pass.
- [ ] CI passes, including migrations and auth tests.
- [ ] EPIC-002 persistence tests still pass.
- [ ] Documentation is synchronized.
- [ ] Engineering Review exists.
- [ ] No unresolved Blocker/High findings.
- [ ] Repository is ready for EPIC-004.

---

## 30. Epic-Level Verification

Final quality gate:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

plus documented auth E2E if added.

Migration verification:

```text
clean database
      ↓
migration chain including auth tables
      ↓
existing persistence tests
      ↓
auth integration tests
      ↓
PASS
```

---

## 31. Certification

Certification happens in Phase 6.

Required artifact:

```text
docs/epics/EPIC-003/engineering-review.md
```

Allowed verdicts:

```text
PASS
PASS WITH FINDINGS
BLOCKED
```

Ready for EPIC-004 only when the review says so and no Blocker/High finding remains.

---

## 32. Next Epic

After EPIC-003 certification:

**EPIC-004 — Workspace**

EPIC-004 will introduce workspace lifecycle, membership, server-side workspace resolution, and tenant isolation primitives that consume the authenticated user id established here.

EPIC-003 must not implement those concerns.
