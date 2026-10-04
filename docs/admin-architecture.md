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
    page.tsx       # Admin user management dashboard
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

The Admin navigation item is visible only when `isAuthenticatedUserAdmin()` returns true.

- Visibility is a UX convenience only
- The item is rendered from the server-provided `isAdmin` flag in the application shell
- `ADMIN_GOOGLE_EMAIL` is never sent to the browser
- Server-side `requireAdminAuthorization()` remains authoritative
- Route visibility does not constitute authorization
- Normal users never see the Admin item

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

## Phase 2: User Lifecycle Management (Implemented)

### Overview

Phase 2 establishes the complete server-side User Lifecycle, including:

- User disable/enable
- User delete with workspace cascade
- Delete impact analysis
- Admin self-protection
- Authentication lifecycle enforcement

Phase 2 implements the server-side lifecycle services. The Admin dashboard UI is implemented in Phase 3 and calls these services without duplicating their logic.

### User Lifecycle Fields

#### disabledAt

```typescript
disabledAt: DateTime?
```

Semantics:

- `null` → active user (normal behavior)
- `non-null` → disabled user (authentication blocked)
- Idempotent: disabling an already-disabled user throws `UserAlreadyDisabledError`
- Reversible: `enableUser()` sets `disabledAt = null`
- Disabling does **not** delete workspace data or memberships
- Workspace memberships remain intact

#### deletedAt

```typescript
deletedAt: DateTime?
```

Semantics:

- `null` → active or disabled user
- `non-null` → deleted user (terminal state)
- Terminal: deleted users cannot be re-enabled or restored
- Soft-delete: user identity anonymized but record preserved for referential integrity
- Authentication permanently blocked

### Admin Self-Protection

The configured Admin **cannot**:

- Disable itself
- Delete itself
- Analyze own delete impact

Self-protection is enforced server-side through:

- `AdminSelfProtectionError` thrown before any mutation
- Check performed in every lifecycle operation

### Disable User

**Operation:** `disableUser(targetUserId: string)`

**Authorization:** `requireAdminAuthorization()`

**Behavior:**

1. Reject if target is Admin
2. Reject if target does not exist → `UserNotFoundError`
3. Reject if target is deleted → `UserAlreadyDeletedError`
4. Reject if target already disabled → `UserAlreadyDisabledError`
5. Set `disabledAt = now()`

**Effects:**

- User cannot authenticate (enforced in `getAuthSessionFromHeaders`)
- Workspace memberships preserved
- Workspace data preserved
- User identity preserved

### Enable User

**Operation:** `enableUser(targetUserId: string)`

**Authorization:** `requireAdminAuthorization()`

**Behavior:**

1. Reject if target does not exist → `UserNotFoundError`
2. Reject if target is deleted → `UserDeletedError`
3. Reject if target not disabled → `UserNotDisabledError`
4. Set `disabledAt = null`

**Effects:**

- User can authenticate again
- Workspace memberships unchanged
- User identity unchanged

### Delete User

**Operation:** `deleteUser(targetUserId: string)`

**Authorization:** `requireAdminAuthorization()`

**Behavior:**

1. Reject if target is Admin
2. Reject if target does not exist → `UserNotFoundError`
3. Reject if target already deleted → `UserAlreadyDeletedError`
4. Begin transaction
5. For each owned workspace:
   - If sole OWNER → delete workspace + all workspace data
   - If another OWNER exists → preserve workspace, remove target membership
6. For each MEMBER workspace → remove target membership
7. Delete all target sessions (Better Auth)
8. Delete all target accounts (Better Auth)
9. Anonymize user identity:
   - `email = deleted-user-{userId}@deleted.local`
   - `name = Deleted User`
   - `deletedAt = now()`
   - `disabledAt = now()`
10. Commit transaction

**Atomicity:**

- All-or-nothing transaction
- No partial deletion
- No orphaned workspaces
- No orphaned workspace data
- No invalid membership references

**Workspace Cascade Dependency Order:**

1. Notification (depends on WorkspaceMember, Alert)
2. Alert (depends on Workspace, Client, Contract, Invoice)
3. Payment (depends on Invoice)
4. Invoice (depends on Contract)
5. TimeEntry (depends on WorkspaceMember, Contract, Client)
6. Contract (depends on Client)
7. Client (depends on Workspace)
8. WorkspaceSettings (depends on Workspace)
9. WorkspaceMember (depends on Workspace)
10. Workspace

For sole-owner deletion:

- All entities deleted in dependency order
- No cascade left to Prisma foreign keys

For preserved workspaces:

- Only target user's dependent records deleted (TimeEntry, Notification)
- Only target user's membership deleted
- Other members and workspace data preserved

### Delete Impact Analysis

**Operation:** `analyzeUserDeleteImpact(targetUserId: string)`

**Authorization:** `requireAdminAuthorization()`

**Behavior:**

1. Reject if target is Admin
2. Reject if target does not exist → `UserNotFoundError`
3. Find all workspaces where target is OWNER
4. For each workspace, determine:
   - `isSoleOwner` (count of OWNER members === 1)
   - `willBeDeleted` (same as `isSoleOwner`)
5. Return `DeleteImpactAnalysis`

**Result Type:**

```typescript
type DeleteImpactAnalysis = {
  targetUserId: string;
  targetUserEmail: string;
  workspaces: WorkspaceImpact[];
  canDelete: boolean;
  reason?: string;
};

type WorkspaceImpact = {
  workspaceId: string;
  workspaceName: string;
  isSoleOwner: boolean;
  willBeDeleted: boolean;
};
```

**Purpose:**

- Server-side operation reused by the Admin delete confirmation UI
- Provides confirmation data for delete decisions

### Authentication Lifecycle Enforcement

**Modified:** `src/infrastructure/auth/session.ts`

**Function:** `validateUserLifecycleState(session: AuthSession | null)`

**Behavior:**

1. If session is null → return null
2. Query `User.disabledAt` and `User.deletedAt`
3. If user not found → return null
4. If `disabledAt` is set → return null
5. If `deletedAt` is set → return null
6. Otherwise → return session

**Applied to:**

- `getAuthSessionFromHeaders()`
- `getServerAuthSession()`

**Effect:**

- Disabled users treated as unauthenticated
- Deleted users treated as unauthenticated
- Admin users subject to same lifecycle checks (unless Admin itself)
- Central enforcement; no per-route duplication required

### No Ownership Transfer

Delete never automatically transfers workspace ownership.

If the user is the sole OWNER:

- Workspace is deleted
- No transfer to MEMBER
- No promotion of another user

Ownership transfer (if needed) must be performed manually before deletion.

### Terminal State

Deleted users are **terminal** for normal lifecycle:

- `enableUser()` rejects deleted users
- `disableUser()` rejects deleted users (already checked via `deletedAt`)
- No restoration workflow
- Anonymized identity permanent

### Error Classes

**New errors in** `src/application/admin/user-lifecycle-errors.ts`:

- `UserNotFoundError`
- `AdminSelfProtectionError`
- `UserAlreadyDisabledError`
- `UserNotDisabledError`
- `UserAlreadyDeletedError`
- `UserDeletedError`

### Application Services

**New modules:**

- `src/application/admin/disable-user.ts`
- `src/application/admin/enable-user.ts`
- `src/application/admin/delete-user.ts`
- `src/application/admin/analyze-user-delete-impact.ts`
- `src/application/admin/user-lifecycle-errors.ts`

**Each service:**

- Calls `requireAdminAuthorization()` first
- Validates input and target state
- Performs atomic mutations
- Throws explicit domain errors

### Prisma Schema Changes

**Migration:** `20261003192057_add_user_lifecycle_fields`

```sql
ALTER TABLE "user" ADD COLUMN "disabledAt" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN "deletedAt" TIMESTAMP(3);
```

**Fields added to User model:**

```prisma
model User {
  id            String    @id
  name          String
  email         String
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  disabledAt    DateTime?
  deletedAt     DateTime?
  sessions      Session[]
  accounts      Account[]

  @@unique([email])
  @@map("user")
}
```

### Security Guarantees

1. **Admin self-protection:** Admin cannot delete/disable itself
2. **Authorization boundary:** All operations require `requireAdminAuthorization()`
3. **Atomicity:** Delete is all-or-nothing transaction
4. **Referential integrity:** No orphaned workspaces or membership records
5. **Authentication enforcement:** Disabled/deleted users cannot authenticate
6. **Terminal deletion:** Deleted users cannot be restored
7. **Workspace cascade:** Sole-owner workspace deletion is explicit and complete
8. **No privilege escalation:** Admin cannot bypass workspace authorization
9. **No partial deletion:** Transaction rollback on any failure

### Testing

#### Unit Tests

**New:**

- `tests/unit/application/admin/disable-user.test.ts`
- `tests/unit/application/admin/enable-user.test.ts`

**Coverage:**

- Admin authorization enforcement
- Self-protection checks
- State validation
- Error conditions

#### Integration Tests

**New:**

- `tests/integration/admin/user-lifecycle.test.ts`
- `tests/integration/admin/authentication-lifecycle.test.ts`

**Coverage:**

- Disable → enable flow
- Workspace membership preservation after disable/enable
- Delete with sole-owner workspace (workspace deleted)
- Delete with shared ownership (workspace preserved)
- Delete impact analysis correctness
- Admin self-protection (disable, delete, analyze)
- Deleted user terminal state
- Authentication blocking for disabled users
- Authentication blocking for deleted users
- Atomicity failure scenarios

## Phase 3: Admin Dashboard UI (Implemented)

### Overview

Phase 3 adds the first usable Admin UI over the existing Phase 2 application services.

The dashboard is operational, not analytical. It does **not** implement search, filtering, pagination, bulk actions, audit logs, analytics, or workspace management.

### Admin Dashboard

`/admin` is a server-rendered page in the `(admin)` route group.

- Calls `listUsers()` after layout-level `requireAdminAuthorization()`
- Works without workspace context
- Shows a user table and lifecycle actions
- Uses `revalidatePath("/admin")` after mutations

### User Lifecycle UI

The table displays name, email, lifecycle status, registration date (`createdAt`), and actions.

Status values:

- **Active**
- **Disabled**
- **Deleted**

Deleted users show the anonymized identity persisted by Phase 2. The UI does not reconstruct original identity and does not expose Enable, Disable, or Delete for deleted users.

### Delete Impact Preview

Opening Delete calls `analyzeUserDeleteImpact()` before any mutation.

The dialog displays only data returned by that service:

- Sole-owner workspaces as **Workspaces That Will Be Deleted**
- Shared-owner workspaces as **Workspaces That Will Be Preserved**
- An explicit no-workspace message when the user owns no workspaces

If any workspace will be deleted, the Admin must check an explicit confirmation control before **Delete User** is enabled.

Cancel closes the dialog without calling `deleteUser()`.

### Admin Self-Protection in UI

The Admin row is labeled **(Admin)** and shows **Admin (protected)** instead of Disable/Delete.

This is display-only. `AdminSelfProtectionError` remains enforced in the application services.

### Authorization

- `listUsers()` and every lifecycle server action call `requireAdminAuthorization()`
- Navigation visibility uses `isAuthenticatedUserAdmin()` only
- The UI never calculates delete impact itself
- Server-side authorization remains authoritative

## Future Phases (Not Implemented)

### Phase 4: Admin Audit

- Audit trail for lifecycle operations
- Admin activity log
- User lifecycle history

### Generic RBAC

- Role-based access control
- Permission system
- Multiple admin roles
- Admin role assignment

These capabilities are explicitly **not** part of Phase 3.

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
- `src/application/admin/list-users.ts`
- `src/application/admin/disable-user.ts`
- `src/application/admin/enable-user.ts`
- `src/application/admin/delete-user.ts`
- `src/application/admin/analyze-user-delete-impact.ts`

### Routes

- `src/app/(admin)/layout.tsx`
- `src/app/(admin)/admin/page.tsx`

### UI

- `src/features/admin/UserListTable.tsx`
- `src/features/admin/UserStatus.tsx`
- `src/features/admin/UserActions.tsx`
- `src/features/admin/DisableUserDialog.tsx`
- `src/features/admin/EnableUserDialog.tsx`
- `src/features/admin/DeleteUserDialog.tsx`
- `src/features/admin/DeleteImpactPreview.tsx`

### Tests

- `tests/integration/admin/admin-authorization.test.ts`
- `tests/integration/admin/admin-ui-authorization.test.ts`
- `tests/integration/admin/workspace-protection.test.ts`
- `tests/integration/admin/helpers.ts`
- `tests/unit/application/admin/admin-configuration.test.ts`
- `tests/unit/features/admin/`
- `tests/e2e/admin.spec.ts`

### Configuration

- `.env.example` (ADMIN_GOOGLE_EMAIL documentation)

## Next Steps

Future Admin phases will build upon this authorization and dashboard foundation:

1. Admin audit trail
2. Admin activity history

Each phase will:

- Use `requireAdminAuthorization()` for all server operations
- Follow the established security model
- Maintain the single-admin constraint
- Preserve workspace isolation
- Apply the architectural decisions documented here
