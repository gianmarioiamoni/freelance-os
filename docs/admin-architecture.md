# Admin Architecture

## Overview

FreelanceOS Admin is a server-side administrative boundary that provides a single system administrator with platform-level capabilities independent of workspace context. This document describes the Admin Phase 1 implementation: the authorization foundation.

## Admin Model

### Single Admin

FreelanceOS supports exactly **one** administrative account.

- Configured server-side through `ADMIN_GOOGLE_EMAIL` environment variable
- No Admin creation UI
- No Admin management UI
- No multiple Admins

The Admin identity is determined at runtime by comparing the authenticated session against the configured Google account email.

### Admin Identity Requirements

For a user to be authorized as Admin, they must satisfy **all** of the following:

1. Be authenticated through Better Auth
2. Have an email address matching `ADMIN_GOOGLE_EMAIL` (case-insensitive, whitespace-trimmed)
3. Have a linked Google OAuth provider account in Better Auth's `Account` table
4. The Google provider link must correspond to the authenticated user's `userId`

Email matching alone is **insufficient**. The system verifies that the authenticated identity is actually linked to Google using Better Auth's existing account/provider data.

### Admin as Normal User

The Admin is a normal FreelanceOS user who can:

- Create workspaces
- Join workspaces as OWNER or MEMBER
- Use all standard application features
- Access the `/admin` area

The Admin does **not** have elevated privileges within workspaces. Workspace authorization remains based on `WorkspaceMember` role (OWNER/MEMBER).

## Architecture

### Authorization Boundary

Admin authorization is enforced through `requireAdminAuthorization()` in:

```
src/application/admin/admin-authorization.ts
```

This function:

1. Obtains the current authenticated server session through `getServerAuthSession()`
2. Rejects unauthenticated users with `UnauthorizedAdminAccessError`
3. Reads `ADMIN_GOOGLE_EMAIL` (server-only)
4. Normalizes both the configured email and authenticated email (lowercase, trimmed)
5. Verifies the authenticated identity has a linked Google provider account
6. Rejects non-Google authenticated sessions even if email matches
7. Rejects if `ADMIN_GOOGLE_EMAIL` is missing or invalid with `InvalidAdminConfigurationError`
8. Returns `AdminAuthorizationResult` containing `userId` and `email`

The function never exposes `ADMIN_GOOGLE_EMAIL` to client code.

### Helper Function

`isAuthenticatedUserAdmin()` provides a safe way to determine if the current authenticated user is the Admin for **display purposes only** (e.g., showing/hiding admin menu). It:

- Returns `false` for any error or invalid configuration
- Never throws
- Is not authoritative for security decisions
- Must not be used as authorization

All Admin server operations must independently call `requireAdminAuthorization()`.

### Admin Routes

Admin functionality lives in the `(admin)` route group:

```
src/app/(admin)/
  layout.tsx       # Enforces requireAdminAuthorization()
  admin/
    page.tsx       # Admin placeholder page
```

The `(admin)` layout:

1. Verifies the user is authenticated
2. Calls `requireAdminAuthorization()`
3. Renders a minimal header with sign-out capability
4. Does **not** resolve workspace context
5. Does **not** require workspace membership

### Route Isolation

Admin routes exist independently of the workspace resolution flow:

- `(workspace-gate)` → requires authenticated user, resolves workspace
- `(app)` → requires authenticated user + resolved workspace
- `(admin)` → requires authenticated Admin, **no workspace resolution**

Admin authorization does not weaken workspace protection. The existing `(app)` layout continues to enforce workspace membership through `getCurrentWorkspaceContext()` and `getAuthorizedWorkspace()`.

## Environment Configuration

### ADMIN_GOOGLE_EMAIL

- **Required for Admin access**
- Server-only (never use `NEXT_PUBLIC_*`)
- Must contain the Google account email authorized as Admin
- Case-insensitive, whitespace-trimmed at runtime
- If unset or invalid, all Admin access is rejected

Example `.env`:

```
ADMIN_GOOGLE_EMAIL="admin@example.com"
```

Production must configure this separately through Vercel environment variables.

### Security Constraints

- Never commit a real admin email to source control
- Never expose through client-side code
- Never trust client-side admin determination for authorization
- Never rely on route visibility as authorization
- Every Admin server operation must independently verify authorization

## Error Handling

### UnauthorizedAdminAccessError

Thrown when:

- User is not authenticated
- Authenticated user's email does not match `ADMIN_GOOGLE_EMAIL`
- User has matching email but no Google provider link
- User is authenticated through a non-Google provider

### InvalidAdminConfigurationError

Thrown when:

- `ADMIN_GOOGLE_EMAIL` is missing
- `ADMIN_GOOGLE_EMAIL` is empty or whitespace-only
- Environment configuration is invalid

## Navigation

Admin Phase 1 does **not** implement the Admin dashboard UI or navigation menu entry.

The navigation architecture has been prepared to support future Admin menu visibility through `isAuthenticatedUserAdmin()`, but:

- No UI changes are included in Phase 1
- Navigation rendering is a UX convenience only
- Server-side authorization remains authoritative
- Route visibility does not constitute authorization

## Testing

Admin authorization is covered by:

### Integration Tests

`tests/integration/admin/admin-authorization.test.ts`

- ✓ Rejects unauthenticated access
- ✓ Rejects authenticated normal user
- ✓ Rejects matching email with non-Google identity
- ✓ Accepts configured Google Admin
- ✓ Rejects missing `ADMIN_GOOGLE_EMAIL`
- ✓ Normalizes email (case)
- ✓ Normalizes email (whitespace)
- ✓ `isAuthenticatedUserAdmin()` returns correct values

`tests/integration/admin/workspace-protection.test.ts`

- ✓ Existing workspace protection remains unaffected

### Unit Tests

`tests/unit/application/admin/admin-configuration.test.ts`

- ✓ `ADMIN_GOOGLE_EMAIL` not exposed through `NEXT_PUBLIC_*`
- ✓ Admin module remains server-only

### E2E Tests

`tests/e2e/admin.spec.ts`

- ✓ Unauthenticated users cannot access `/admin`
- ✓ Authenticated normal users cannot access `/admin`
- ✓ Admin route does not require workspace context

## Future Phases (Not Implemented)

The following are explicitly **not** implemented in Phase 1:

### User Management

- User listing
- User status fields (`disabledAt`, `deletedAt`)
- User disable
- User enable
- User delete
- User search
- User filtering

### Admin Dashboard

- Admin landing page
- User table
- Admin navigation menu
- Admin audit UI

### Generic RBAC

- Role-based access control
- Permission system
- Multiple admin roles
- Admin role assignment

### User Delete Behavior (Architectural Decision)

When Admin user delete is implemented in a future phase, the following behavior must be enforced:

#### Sole Owner Workspace Cascade

If the user owns a workspace where they are the **only OWNER**:

- Deleting the user **must** also permanently delete that workspace
- All workspace-owned data must be deleted atomically
- No automatic ownership transfer

#### Multiple Owners

If another OWNER exists in the workspace:

- Preserve the workspace
- Delete only the user

#### Multiple Workspaces

If the user owns multiple workspaces:

- Apply the sole-owner rule independently to each workspace
- Delete user + affected workspaces atomically

#### Admin Self-Delete

Deleting the Admin account itself must always be **forbidden**.

#### Implementation Requirements (Future)

- The operation must be atomic (all-or-nothing)
- The Admin UI must show workspace/data impact before confirmation
- Explicit tests must verify the cascade behavior
- Audit trail must be maintained

This decision is architectural and must be preserved, but the actual delete functionality is **not** implemented in Phase 1.

## Security Invariants

Admin Phase 1 establishes the following security guarantees:

1. **Server-side authorization**: All Admin operations enforce authorization independently
2. **Google identity verification**: Matching email alone is insufficient
3. **No client-side trust**: Admin determination for UI purposes is not authoritative
4. **Secret isolation**: `ADMIN_GOOGLE_EMAIL` never exposed to client
5. **Workspace isolation preservation**: Admin authorization does not weaken workspace protection
6. **Independent verification**: Every Admin route/action calls `requireAdminAuthorization()`
7. **No privilege escalation**: Admin has no elevated workspace privileges
8. **Route protection**: Direct `/admin` URL access is protected

## Implementation Files

### Core

- `src/application/admin/admin-authorization.ts`
- `src/application/admin/admin-errors.ts`

### Routes

- `src/app/(admin)/layout.tsx`
- `src/app/(admin)/admin/page.tsx`

### Tests

- `tests/integration/admin/admin-authorization.test.ts`
- `tests/integration/admin/workspace-protection.test.ts`
- `tests/integration/admin/helpers.ts`
- `tests/unit/application/admin/admin-configuration.test.ts`
- `tests/e2e/admin.spec.ts`

### Configuration

- `.env.example` (ADMIN_GOOGLE_EMAIL documentation)

## Next Steps

Future Admin phases will build upon this authorization foundation:

1. Admin dashboard UI
2. User listing
3. User status management (`disabledAt`)
4. User disable/enable
5. User delete with workspace cascade
6. Admin audit trail

Each phase will:

- Use `requireAdminAuthorization()` for all server operations
- Follow the established security model
- Maintain the single-admin constraint
- Preserve workspace isolation
- Apply the architectural decisions documented here
