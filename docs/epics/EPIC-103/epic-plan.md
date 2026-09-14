# EPIC-103 — Time Tracking

## 1. Epic Identity

**Epic:** EPIC-103  
**Release:** Release 1 — MVP  
**MASTER_PLAN identifier:** R1-E03 — Time Tracking  
**Objective:** Time Tracking  
**Status:** IMPLEMENTED — ENGINEERING COMPLETE (PASS WITH FINDINGS)  
**Depends on:** EPIC-002 — Database & Persistence; EPIC-003 — Authentication; EPIC-004 — Workspace; EPIC-005 — Testing & CI Foundation; EPIC-006 — UI Foundation; EPIC-101 — Clients; EPIC-102 — Contracts  
**Next Epic:** Analytics & Dashboard (`MASTER_PLAN.md` §14 R1-E04)  
**Canonical sources:** `MASTER_PLAN.md` §13 R1-E03; `docs/product-vision.md`; `docs/domain-model.md` §3.5 / §4.2 / §8 / BR-002 / BR-003 / BR-004; `docs/storage.md`; `docs/architecture.md`; `docs/testing-strategy.md`

```text
PLANNING COMPLETE - PRODUCT DECISIONS FINALIZED
IMPLEMENTATION: COMPLETE (P103-01, P103-02, P103-03)
ENGINEERING REVIEW: PASS WITH FINDINGS
PRODUCTION READINESS: NO
```

Engineering Review: `docs/epics/EPIC-103/engineering-review.md`.

This document is the only planning artifact for EPIC-103. Do not create additional planning files.

---

## 2. Status

```text
PLANNING COMPLETE
IMPLEMENTATION: COMPLETE
```

Phase statuses:

```text
P103-01 COMPLETE  934d202
P103-02 COMPLETE  ba1c597
P103-03 COMPLETE  2e67759
P103-04 COMPLETE  documentation & engineering review
FINAL VERDICT: PASS WITH FINDINGS — ENGINEERING COMPLETE; PRODUCTION READINESS NO
```

Final test evidence after EPIC-103: 164 unit, 119 integration, 21 E2E. These are suite totals, not counts of tests added by this Epic.

---

## 3. Objective

Implement workspace-scoped time tracking to enable authenticated workspace members to record, manage, and view work performed under existing Client and Contract relationships.

From `MASTER_PLAN.md` R1-E03, this Epic establishes:

- create time entry
- edit time entry  
- delete time entry
- client selection
- contract selection
- date
- duration
- description
- billable/non-billable
- daily view
- weekly timesheet

Primary success criterion: A normal workday entry should be recordable in less than one minute.

---

## 4. Context

### 4.1 Repository Evidence

TimeEntry persistence model already exists in `prisma/schema.prisma`:

```prisma
model TimeEntry {
  id              String   @id @default(uuid()) @db.Uuid
  workspaceId     String   @db.Uuid
  userId          String
  clientId        String   @db.Uuid
  contractId      String   @db.Uuid
  workDate        DateTime @db.Date
  durationMinutes Int      // Positive duration enforced by CHECK constraint
  description     String?  @db.Text
  billable        Boolean
  createdAt       DateTime @default(now()) @db.Timestamptz(6)
  updatedAt       DateTime @updatedAt @db.Timestamptz(6)
}
```

TimeEntryRepository interface exists in `src/domain/repositories.ts` with:
- `recordTimeEntry(workspaceId, input)` 
- `getTimeEntry(workspaceId, timeEntryId)`
- `listTimeEntriesForDate(workspaceId, workDate)`

Partial infrastructure implementation exists in `src/infrastructure/persistence/time-entry-repository.ts`.

### 4.2 Dependencies Complete

EPIC-101 (Client Management) and EPIC-102 (Contract Management) provide:
- workspace-scoped Client/Contract CRUD
- Client-Contract relationships
- Contract validity model `[validFrom, validTo)`
- Contract billing models (HOURLY/DAILY)
- Archived client behavior
- Contract overlap prevention
- `/contracts` and `/clients` application surfaces

### 4.3 Route Placeholder

`/time-tracking` route exists as placeholder in `src/app/(app)/time-tracking/page.tsx` and is included in application navigation (`src/lib/navigation.ts`).

---

## 5. Dependencies

### 5.1 Foundation Dependencies

All satisfied by completed Epics:
- Database & Persistence (EPIC-002)
- Authentication (EPIC-003)
- Workspace isolation (EPIC-004) 
- Testing & CI foundation (EPIC-005)
- UI foundation (EPIC-006)

### 5.2 Business Dependencies

- Client Management (EPIC-101): Required for Client selection and workspace-scoped client access
- Contract Management (EPIC-102): Required for Contract selection, validity enforcement, and contractId requirement

---

## 6. Existing Implementation Analysis

### 6.1 Persistence Foundation

**Status:** COMPLETE - No schema changes required

Existing `TimeEntry` model satisfies all EPIC-103 requirements:
- Workspace isolation via `workspaceId`
- User association via `userId` and composite FK to `WorkspaceMember`
- Explicit `clientId` and `contractId` requirements
- Date-only `workDate` (not timestamp)
- Integer `durationMinutes` storage (not floating-point hours)
- Optional `description` 
- Boolean `billable` flag
- Workspace-scoped composite FK to `Contract` preserves referential integrity
- Appropriate indexes for workspace/date queries

**Migration Required:** NO

### 6.2 Repository Port

**Status:** PARTIAL - Expansion required

Current `TimeEntryRepository` provides foundation operations but requires expansion for full CRUD:
- ✅ `recordTimeEntry` - create operation
- ✅ `getTimeEntry` - read operation  
- ✅ `listTimeEntriesForDate` - query operation
- ❌ `updateTimeEntry` - edit operation (MISSING)
- ❌ `deleteTimeEntry` - delete operation (MISSING - lifecycle policy TBD)
- ❌ `listTimeEntriesForPeriod` - weekly/monthly views (MISSING)

---

## 7. Scope

### 7.1 Core Time Entry Operations

**Create TimeEntry:**
- Workspace-scoped creation
- Client selection from workspace Clients  
- Contract selection from Client's valid Contracts
- Work date selection
- Duration input (minutes, displayed as hours:minutes)
- Description (optional)
- Billable flag
- Contract validity enforcement
- Server-side validation

**Read TimeEntry:**
- Individual entry detail
- Daily time entry lists
- Weekly timesheet view
- Workspace isolation
- Not-found behavior for foreign entries

**Update TimeEntry:**  
- Edit mutable fields only: durationMinutes, description, billable (PD-103-002, PD-103-003)
- Immutable after creation: workDate, clientId, contractId
- Preserve workspace/ownership validation
- Historical correctness maintained via immutable associations
- Validation same as create for mutable fields

**Delete TimeEntry:**
- Hard delete (PD-103-001)
- No archive state or soft delete in MVP
- Preserve workspace/ownership authorization
- Future audit requirements may introduce different lifecycle

### 7.2 Time Entry Lifecycle

Based on finalized Product Owner decisions:

**Create → Edit Mutable Fields → Hard Delete**

- Create: all fields including workDate, clientId, contractId
- Edit: mutable fields only (durationMinutes, description, billable)  
- Delete: hard delete, no archive state in MVP
- Immutable after creation: workDate, clientId, contractId
- Correcting immutable fields requires delete and recreate

### 7.3 Contract Relationship 

**Contract Selection:**
- TimeEntry.contractId is REQUIRED (preserves F-P2-004)
- Client selected first, Contract second (UX flow)
- Only valid Contracts selectable for entry date
- Contract validity: `contract.validFrom <= entry.workDate < contract.validTo`
- Open-ended contracts (validTo = null): `entry.workDate >= contract.validFrom`
- Archived Clients: existing TimeEntries remain readable/editable; new entries REJECTED

**Contract Validation:**
- Entry date must fall within Contract validity period
- Contract must belong to selected Client
- Contract must belong to workspace
- Foreign Contract/Client IDs fail closed (not-found behavior)

### 7.4 UI Surfaces

**Routes (confirmed from navigation):**
- `/time-tracking` - main time tracking surface
- `/time-tracking/new` - create entry  
- `/time-tracking/[timeEntryId]` - entry detail (if justified)
- `/time-tracking/[timeEntryId]/edit` - edit entry

**Views:**
- Daily time entry list (default: today)
- Weekly timesheet view
- Time entry create form
- Time entry edit form  
- Empty states
- Loading states
- Error states

**Navigation Integration:**
- Preserve existing `/time-tracking` navigation item
- Match Client/Contract surface patterns

## PRODUCT DECISIONS FINALIZED

**STATUS:** All blocking decisions resolved by Product Owner.

**Canonical numbering:** the six `PD-103-00x` identifiers used in this document are canonical. Phase handoff notes sometimes refer to a four-item short list that numbers future dates, duplicate entries, and client-first selection differently. The reconciliation table is `docs/epics/EPIC-103/engineering-review.md` §6 (finding F-103-004).

### PD-103-001 — TimeEntry Deletion Mechanism

**DECISION:** HARD DELETE

TimeEntry deletion uses hard delete in Release 1 MVP.
- No persisted TimeEntry archive state
- No `archivedAt` field  
- No TimeEntry status field
- No Prisma migration required for deletion semantics
- Future audit/reporting requirements may introduce dedicated lifecycle through later schema change

### PD-103-002 — workDate Editability

**DECISION:** IMMUTABLE

`TimeEntry.workDate` is immutable after creation.
- Create accepts workDate
- Update does NOT accept workDate
- `UpdateTimeEntryInput` excludes `workDate`
- Application service rejects workDate mutation
- UI edit does not expose workDate as editable
- Correcting work date requires delete and recreate

### PD-103-003 — clientId/contractId Editability

**DECISION:** IMMUTABLE

`TimeEntry.clientId` and `TimeEntry.contractId` are immutable after creation.
- Create accepts clientId and contractId with validation
- Update does NOT accept clientId or contractId
- `UpdateTimeEntryInput` excludes clientId and contractId
- UI edit does not expose client/contract selection
- Changing commercial association requires delete and recreate
- Historical integrity preserved via immutable associations

---

### 7.5 Duration Semantics

**Storage:** Integer minutes (no floating-point persistence)  
**Input:** Hours:minutes format (e.g., "2:30" = 150 minutes)  
**Display:** Hours:minutes format for clarity  
**Validation:** 
- Minimum: 1 minute
- Maximum: 1440 minutes (24 hours)  
- No negative durations
- No zero durations

### 7.6 Date/Time Semantics

**Work Date:** Calendar date only (not timestamp)  
**Timezone:** Client-local date (no timezone complexity in MVP)  
**Future Dates:** PERMITTED (user may plan ahead)  
**Duplicate Entries:** PERMITTED (multiple entries per Contract/date allowed)
**Overlapping Entries:** No validation (user responsibility in MVP)

### 7.7 Billable Semantics

**Definition:** Work eligible for billing under Contract terms  
**Requirement:** TimeEntry.contractId remains required even for billable=false entries (preserves F-P2-004)  
**Calculation:** MVP only stores billable flag; no automatic rate calculations or invoice generation

---

## 8. Non-Goals

Explicitly outside EPIC-103 scope (following MASTER_PLAN §18):

### 8.1 Advanced Time Features
- Running timers/stopwatch functionality
- Background time tracking
- Automatic time detection
- Calendar integration  
- Time blocking/scheduling

### 8.2 Financial/Commercial Features  
- Invoice generation from TimeEntries
- Rate calculations
- Revenue estimation  
- Payment tracking
- Expense tracking
- Profitability calculations

### 8.3 Analytics/Reporting Features
- Dashboard widgets
- Monthly utilization calculations
- Contract analytics
- Trend analysis
- Advanced filtering
- Export functionality

### 8.4 Integration Features
- External calendar sync
- Project management integrations
- Third-party time tracking imports
- API endpoints

### 8.5 Advanced UX Features
- Bulk entry creation
- Entry templates
- Keyboard shortcuts
- Mobile-optimized interfaces
- Offline capability

### 8.6 Administrative Features
- Team time tracking
- Time approval workflows
- Time entry locking/period closure
- Advanced audit logging

---

## 9. Domain Rules & Business Logic

### 9.1 TimeEntry Rules (from domain-model.md §8)

**Established Rules:**
- TimeEntry belongs to one workspace (workspace isolation)
- TimeEntry has one work date (calendar date, not timestamp)
- Duration stored as integer minutes
- TimeEntry has billable/non-billable state  
- TimeEntry must reference a client
- TimeEntry must reference a contract (contractId required)
- Applicable contract must be determinable for work date

### 9.2 Contract Validity Rules

**Date Validation:**
- For finite contracts: `validFrom <= workDate < validTo` (validTo exclusive)
- For open contracts: `workDate >= validFrom`
- Entry date validation occurs on create and edit
- Invalid dates are REJECTED with clear error message

**Contract Changes (Historical Correctness):**
- Existing TimeEntries remain valid after Contract validity changes
- TimeEntry.contractId preserved for historical reporting (BR-003)
- No automatic TimeEntry updates when Contract changes
- P102-F-001 limitation accepted: no commercial snapshots in MVP

### 9.3 Archived Client Behavior

**Consistency with OBD-015:**
- Existing TimeEntries for archived Clients remain readable
- Existing TimeEntries for archived Clients remain editable  
- NEW TimeEntries for archived Clients are REJECTED
- Contract selection excludes Contracts from archived Clients

### 9.4 Workspace Isolation Rules

**Authorization:**
- Browser-supplied workspaceId is NEVER authoritative
- Workspace context resolved server-side via authentication
- Foreign TimeEntry IDs fail closed (not-found behavior)
- Foreign Client/Contract IDs in forms fail closed
- All TimeEntry operations workspace-scoped

---

## 10. Historical Correctness Analysis

### 10.1 Inherited Limitations

**P102-F-001 (OPEN):**
Commercial Contract edits can change interpretation of historical TimeEntries because TimeEntry stores `contractId` without rate snapshots. EPIC-103 does NOT resolve this limitation.

**Impact on Time Tracking:**
- TimeEntry records explicit contractId for historical reference
- Rate changes in Contract affect historical TimeEntry billing interpretation  
- No automatic protection against commercial reinterpretation
- Limitation accepted for MVP; documented in Engineering Review

### 10.2 TimeEntry Historical Guarantees

**What Time Tracking DOES preserve:**
- TimeEntry.contractId explicit relationship (BR-003, immutable per PD-103-003)
- TimeEntry.clientId explicit relationship (immutable per PD-103-003)
- TimeEntry.workDate preserved (immutable per PD-103-002)
- Client and Contract identity preserved via foreign keys
- Integer duration storage without floating-point corruption
- Historical associations cannot be accidentally changed via edit

**What Time Tracking CANNOT guarantee (due to P102-F-001):**
- Billing rate consistency if Contract.rate changes
- Billing model consistency if Contract.billingModel changes  
- Commercial terms consistency if Contract terms change

### 10.3 Edit Policy

**TimeEntry Edit Policy (finalized per Product Owner decisions):**
- Edit affects mutable fields only: durationMinutes, description, billable
- Immutable fields preserved: workDate, clientId, contractId, userId, workspaceId
- Edit preserves workspace isolation and authorization context
- Historical associations cannot be changed (BR-003 compliance)
- No contract revalidation needed since workDate/clientId/contractId are immutable
- Future audit/period closure requirements deferred to later releases (OBD-008)

---

## 11. Persistence Impact

### 11.1 Schema Changes

**Required:** NONE

Existing `TimeEntry` model satisfies all requirements. No migration needed.

### 11.2 Repository Expansion

**Required Updates to `TimeEntryRepository`:**

```typescript
updateTimeEntry(
  workspaceId: string, 
  timeEntryId: string, 
  input: UpdateTimeEntryInput
): Promise<TimeEntryRecord>;

deleteTimeEntry(
  workspaceId: string,
  timeEntryId: string  
): Promise<void>;

listTimeEntriesForPeriod(
  workspaceId: string,
  startDate: Date,
  endDate: Date
): Promise<TimeEntryRecord[]>;
```

### 11.3 New Domain Types

```typescript
export type UpdateTimeEntryInput = {
  durationMinutes?: number;
  description?: string | null;
  billable?: boolean;
};
```

**Excluded from UpdateTimeEntryInput (immutable per Product Owner decisions):**
- workDate (PD-103-002)
- clientId (PD-103-003)
- contractId (PD-103-003)
- workspaceId, userId, id, createdAt (system fields)

---

## 12. Application Architecture

### 12.1 Service Layer

Following established Server Action → Application Service → Repository pattern:

**Required Application Services:**
- `createTimeEntry(workspaceContext, input)` - create with validation
- `getTimeEntry(workspaceContext, timeEntryId)` - read with authorization  
- `listTimeEntriesForDate(workspaceContext, date)` - daily view
- `listTimeEntriesForPeriod(workspaceContext, start, end)` - weekly view
- `updateTimeEntry(workspaceContext, timeEntryId, input)` - edit mutable fields with validation
- `deleteTimeEntry(workspaceContext, timeEntryId)` - hard delete

### 12.2 Validation Services

**Contract Eligibility Service:**
```typescript
getEligibleContracts(
  workspaceContext: WorkspaceContext,
  clientId: string,
  workDate: Date
): Promise<ContractRecord[]>
```

**Contract Validation Service:**
```typescript  
validateContractForDate(
  workspaceContext: WorkspaceContext,
  contractId: string, 
  workDate: Date
): Promise<ValidationResult>
```

### 12.3 Error Handling

**Domain Errors:**
- `ContractNotValidForDate`
- `ClientArchived` 
- `TimeEntryNotFound`
- `InvalidDuration`
- `WorkspaceAccessDenied`
- `ForeignResourceAccess`

Follow established error mapping pattern from Client/Contract management.

---

## 13. Routes & UI Architecture

### 13.1 Route Structure

**Primary Routes:**
- `/time-tracking` - Daily time entries (default: today)
- `/time-tracking/new` - Create new time entry
- `/time-tracking/[timeEntryId]/edit` - Edit existing entry

**Query Parameters:**
- `/time-tracking?date=2024-01-15` - Specific date view
- `/time-tracking?view=week&start=2024-01-15` - Weekly view
- `/time-tracking/new?clientId=uuid&contractId=uuid` - Pre-selected context

### 13.2 UI Component Structure  

```
/time-tracking/
├── page.tsx                    # Daily/weekly time entry list
├── new/
│   └── page.tsx               # Create form
├── [timeEntryId]/
│   └── edit/
│       └── page.tsx           # Edit form
└── components/
    ├── TimeEntryList.tsx      # Daily entries list
    ├── TimeEntryForm.tsx      # Create/edit form
    ├── WeeklyTimesheet.tsx    # Weekly grid view
    ├── ClientContractSelector.tsx # Client/Contract picker
    └── DurationInput.tsx      # Hours:minutes input
```

### 13.3 Form Flow

**Create TimeEntry:**
1. Select Client (required)
2. Select Contract from eligible Contracts (required)  
3. Select work date (default: today)
4. Enter duration (hours:minutes format)
5. Enter description (optional)
6. Set billable flag (default: true)
7. Server-side validation
8. Redirect to daily view

**Edit TimeEntry:**
1. Load existing entry (with workspace validation)
2. Pre-populate form with mutable fields only
3. Allow changes to: duration, description, billable
4. Do NOT expose: workDate, client, contract selection
5. Server-side validation for mutable fields
6. Redirect to daily view

---

## 14. Validation Strategy

### 14.1 Client-Side Validation

**Form Validation:**
- Required fields: Client, Contract, date, duration
- Duration format: HH:MM or decimal hours
- Duration range: 0.02-24.00 hours (1-1440 minutes)
- Date format validation
- Description length limits

**Immediate Feedback:**
- Contract eligibility updates when Client or date changes
- Duration format conversion display
- Field-level error messages

### 14.2 Server-Side Validation (Authoritative)

**TimeEntry Input Validation:**
```typescript
validateTimeEntryInput(input: CreateTimeEntryInput): ValidationResult {
  // Required fields
  // Duration bounds (1-1440 minutes)  
  // Date format
  // Description length
  // Billable boolean
}
```

**Business Rule Validation:**
```typescript
validateTimeEntryBusinessRules(
  workspaceContext: WorkspaceContext,
  input: CreateTimeEntryInput
): Promise<ValidationResult> {
  // Workspace access to Client/Contract
  // Contract belongs to Client
  // Contract valid for work date  
  // Client not archived (for new entries)
}
```

### 14.3 Contract Validation Details

**Contract Eligibility Logic:**
```typescript
function isContractValidForDate(contract: ContractRecord, date: Date): boolean {
  const workDate = date.getTime();
  const validFrom = contract.validFrom.getTime();
  
  if (workDate < validFrom) return false;
  
  if (contract.validTo === null) return true; // Open-ended
  
  return workDate < contract.validTo.getTime(); // validTo exclusive
}
```

---

## 15. State Management & Loading

### 15.1 Server-Side State (RSC Pattern)

**Page-Level Data Loading:**
- Daily entries via RSC data fetching
- Weekly timesheet via RSC data fetching  
- Client/Contract options via RSC data fetching
- No client-side caching for MVP

### 15.2 Form State Management

**Create/Edit Forms:**
- React controlled components (useState)
- Form validation via react-hook-form or similar
- No global state management library
- Server Actions for mutations

### 15.3 Loading States

**Loading Indicators:**
- Page-level loading for initial data
- Form submission loading states  
- Contract eligibility loading when Client/date changes
- Optimistic updates for quick operations

### 15.4 Error States

**Error Boundaries:**
- Page-level error boundaries for server errors
- Form-level error handling for validation failures
- Network error recovery
- Graceful degradation

### 15.5 Empty States

**Empty State Scenarios:**
- No time entries for selected date
- No time entries for selected week  
- No eligible Contracts for selected Client/date
- No Clients in workspace (edge case)

---

## 16. Testing Strategy

### 16.1 Unit Testing

**Repository Tests:**
- `createTimeEntry` with valid input
- `updateTimeEntry` with workspace validation
- `deleteTimeEntry` with authorization (hard delete per PD-103-001; the earlier `archiveTimeEntry` wording predates that decision)
- `getTimeEntry` with foreign ID (should return null)
- `listTimeEntriesForDate` workspace isolation
- Error mapping for database constraints

**Application Service Tests:**
- Contract eligibility calculation
- Contract validation for work dates
- Workspace context validation  
- Domain error generation
- Input sanitization

**Validation Tests:**
- Duration bounds validation
- Date format validation
- Contract validity logic
- Archived Client rejection

### 16.2 Integration Testing

**Server Action Integration:**
- Complete create flow with database
- Complete update flow with database  
- Workspace isolation enforcement
- Foreign resource access rejection
- Contract relationship integrity
- Error handling end-to-end

**Database Integration:**  
- TimeEntry CRUD operations
- Workspace-scoped queries
- Foreign key constraint enforcement
- Composite key validation

### 16.3 End-to-End Testing

**Core Time Tracking Journey:**
1. Authenticate user
2. Navigate to time tracking
3. Create new time entry  
4. Select Client and Contract
5. Enter work details
6. Save entry
7. Verify entry appears in daily view
8. Edit entry
9. Verify changes persist
10. Archive entry
11. Verify entry no longer appears

**Contract Validation Journey:**
1. Create time entry for valid Contract
2. Attempt time entry for expired Contract (should fail)
3. Attempt time entry for future Contract (should fail)
4. Attempt time entry for archived Client (should fail)

**Workspace Isolation Journey:**
1. Create time entry in workspace A
2. Switch to workspace B  
3. Verify time entry not visible
4. Attempt direct access to workspace A entry (should fail)

### 16.4 Test Data Strategy

**Test Database:**
- Follow EPIC-005 `_test` database requirement
- Isolated test workspace
- Predefined Client/Contract test data
- Various contract validity scenarios
- Archived Client test data

---

## 17. Accessibility

### 17.1 Baseline Requirements

Following established EPIC-006 accessibility baseline:

**Semantic Structure:**
- Proper heading hierarchy (h1, h2, h3)
- Semantic form elements
- Associated labels for all inputs
- Fieldset/legend for grouped controls

**Keyboard Navigation:**  
- Tab order through forms
- Enter to submit forms
- Escape to cancel operations
- Arrow keys for date navigation

**Screen Reader Support:**
- Descriptive labels for Client/Contract selectors
- Duration input format explanation  
- Error message association with fields
- Loading state announcements

### 17.2 Time Tracking Specific Accessibility

**Duration Input:**
- Clear format instructions ("Enter time as hours:minutes, e.g., 2:30")
- Input validation with helpful error messages
- Alternative decimal format support

**Client/Contract Selection:**
- Descriptive option text including relevant context
- Search/filtering for large Client lists
- Clear indication of Contract validity

**Date Navigation:**
- Keyboard shortcuts for common date operations
- Clear current date indication  
- Date format assistance

---

## 18. Observability & Audit Considerations

### 18.1 Current Audit Limitations

**OBD-008 (Open):** No audit system implemented in MVP

**Implications for Time Tracking:**
- TimeEntry edits are not audited
- TimeEntry deletions (archives) are not audited
- No change history available
- No "who changed what when" tracking

**Accepted for MVP:** Basic edit/archive operations without audit trail

### 18.2 Basic Observability

**Application Logging:**
- TimeEntry creation/update/archive events
- Contract validation failures  
- Workspace isolation violations
- Performance metrics for common operations

**Error Tracking:**
- Validation errors
- Database constraint violations
- Foreign resource access attempts
- Server Action failures

---

## 19. Phases

### 19.1 Phase Overview

**P103-01:** TimeEntry Application Services & Validation  
**P103-02:** Authenticated Time Tracking UI  
**P103-03:** Integration Tests & Workspace Isolation  
**P103-04:** Documentation & Engineering Review

Each phase = one commit; each phase = NEW CURSOR CHAT

### 19.2 Phase 1 — TimeEntry Application Services & Validation

**Objective:** Complete TimeEntry business logic, application services, and server-side validation

**Scope:**
- Expand `TimeEntryRepository` with update (mutable fields only) and delete operations
- Implement application services (`createTimeEntry`, `updateTimeEntry`, `deleteTimeEntry`, etc.)
- Contract eligibility and validation services
- Domain error classes and mapping
- Server Actions for all TimeEntry operations
- Input validation and business rule enforcement (immutability constraints)
- Unit tests for all services and validation logic

**Files/Modules:**
- `src/domain/repositories.ts` - expand TimeEntryRepository interface
- `src/domain/persistence-types.ts` - add UpdateTimeEntryInput (mutable fields only)
- `src/infrastructure/persistence/time-entry-repository.ts` - implement new operations
- `src/application/services/time-entry.ts` - NEW application services
- `src/application/actions/time-entry.ts` - NEW Server Actions  
- `src/domain/errors.ts` - add TimeEntry domain errors
- `tests/unit/application/services/time-entry.test.ts` - NEW unit tests
- `tests/unit/infrastructure/persistence/time-entry-repository.test.ts` - NEW unit tests

**Non-Goals:**  
- No UI implementation
- No routes changes
- No form components
- No authentication changes

**Implementation Constraints:**
- Preserve existing TimeEntry schema (no migrations)
- Follow established Server Action → Application Service → Repository pattern
- Maintain workspace isolation at all layers
- Use existing domain error patterns

**Tests:**
- Unit tests for all application services
- Repository operation tests with workspace isolation
- Contract validation logic tests  
- Error mapping tests

**Validation Commands:**
```bash
npm run typecheck
npm run test -- time-entry
npm run test:integration -- time-entry
```

**Acceptance Criteria:**
- [ ] All TimeEntry CRUD operations implemented in application layer
- [ ] Contract eligibility service correctly filters by validity and workspace
- [ ] Contract validation enforces business rules  
- [ ] Workspace isolation prevents foreign resource access
- [ ] All domain errors properly mapped and tested
- [ ] Unit test coverage > 90% for new application services
- [ ] No schema changes or migrations required
- [ ] All existing tests continue to pass

**Exact Commit Message:**
```text
feat(time-tracking): add TimeEntry application services and validation
```

**Expected Result:** Complete TimeEntry business logic foundation ready for UI implementation

---

### 19.3 Phase 2 — Authenticated Time Tracking UI

**Objective:** Replace `/time-tracking` placeholder with complete authenticated time tracking interface

**Scope:**
- Main time tracking page with daily/weekly views
- TimeEntry create form with Client/Contract selection
- TimeEntry edit form
- Duration input component (hours:minutes format)
- Client/Contract selector with eligibility filtering
- Loading, error, and empty states
- Form validation with server-side error display
- Navigation integration

**Files/Modules:**
- `src/app/(app)/time-tracking/page.tsx` - replace placeholder with main view
- `src/app/(app)/time-tracking/new/page.tsx` - NEW create form  
- `src/app/(app)/time-tracking/[timeEntryId]/edit/page.tsx` - NEW edit form
- `src/components/time-tracking/TimeEntryList.tsx` - NEW daily entries list
- `src/components/time-tracking/TimeEntryForm.tsx` - NEW create/edit form
- `src/components/time-tracking/WeeklyTimesheet.tsx` - NEW weekly view
- `src/components/time-tracking/ClientContractSelector.tsx` - NEW selector component
- `src/components/time-tracking/DurationInput.tsx` - NEW duration input
- `src/lib/time-tracking.ts` - NEW utility functions for time formatting

**Non-Goals:**
- No advanced filtering or search
- No bulk operations  
- No export functionality
- No timer/stopwatch features
- No mobile-specific optimizations

**Implementation Constraints:**
- Use established shadcn/ui components
- Follow RSC-first architecture (minimal client components)
- Preserve existing navigation structure
- Match Client/Contract management UX patterns
- Server Actions for all mutations

**Tests:**
- Component unit tests for form validation
- Integration tests for Server Action flows
- Accessibility testing for form components

**Validation Commands:**
```bash
npm run typecheck  
npm run test -- time-tracking
npm run build
npm run dev # manual verification
```

**Acceptance Criteria:**
- [ ] `/time-tracking` shows daily time entries for current date
- [ ] Weekly timesheet view accessible and functional
- [ ] Create form successfully creates TimeEntry with Client/Contract selection
- [ ] Edit form pre-populates and updates mutable fields only (duration, description, billable)
- [ ] Edit form does NOT expose workDate, client, or contract selection
- [ ] Duration input accepts hours:minutes format and validates bounds
- [ ] Client/Contract selector shows only eligible options (create only)
- [ ] Form validation displays helpful error messages
- [ ] Loading states display during operations
- [ ] Empty states guide user to create first entry
- [ ] Error states handle network/validation failures gracefully
- [ ] All forms are keyboard accessible
- [ ] Screen readers can navigate forms effectively

**Exact Commit Message:**
```text
feat(time-tracking): add authenticated time tracking UI and forms
```

**Expected Result:** Complete time tracking user interface ready for integration testing

---

### 19.4 Phase 3 — Integration Tests & Workspace Isolation

**Objective:** Validate workspace isolation, integration flows, and end-to-end time tracking journey

**Scope:**
- Integration tests for complete TimeEntry lifecycle  
- Workspace isolation enforcement tests
- Foreign resource access security tests
- Contract validation integration tests
- Playwright E2E journey for time tracking workflow
- Performance baseline for common operations

**Files/Modules:**
- `tests/integration/time-tracking.test.ts` - NEW integration test suite
- `tests/e2e/time-tracking-journey.spec.ts` - NEW Playwright E2E tests
- `tests/security/time-tracking-isolation.test.ts` - NEW security tests
- Update existing integration test setup as needed

**Non-Goals:**
- No application code changes
- No schema changes
- No UI modifications  
- No new features

**Implementation Constraints:**
- Use established `_test` database pattern
- Follow EPIC-005 testing conventions
- Maintain CI compatibility
- 1 worker for Playwright tests where required

**Tests:**
- Complete TimeEntry CRUD integration tests
- Multi-workspace isolation verification
- Contract relationship integrity tests
- Foreign ID injection prevention tests  
- End-to-end user journey from login to time entry creation
- Performance benchmarks for data loading

**Validation Commands:**
```bash
npm run test:integration
npm run test:e2e  
npm run test:security
```

**Acceptance Criteria:**
- [ ] Integration tests cover complete TimeEntry lifecycle with database
- [ ] Workspace isolation prevents cross-workspace data access  
- [ ] Foreign Client/Contract IDs properly rejected
- [ ] Contract validation properly enforces business rules
- [ ] E2E tests cover complete user journey successfully
- [ ] Security tests verify authorization boundaries
- [ ] All tests pass consistently in CI environment
- [ ] No test-induced database pollution
- [ ] Performance meets baseline requirements

**Exact Commit Message:**
```text
test(time-tracking): add integration tests and E2E journey
```

**Expected Result:** Comprehensive test coverage demonstrating secure, correct time tracking implementation

---

### 19.5 Phase 4 — Documentation & Engineering Review

**Objective:** Synchronize documentation and perform engineering review

**Scope:**
- Update affected canonical documentation
- Create comprehensive engineering review
- Document implementation decisions and findings  
- Verify production readiness assessment
- Record inherited and new findings

**Files/Modules:**
- `docs/epics/EPIC-103/engineering-review.md` - NEW comprehensive review
- `MASTER_PLAN.md` - update with EPIC-103 completion status
- `CHANGELOG.md` - add EPIC-103 entry
- Other documentation as required by implementation changes

**Non-Goals:**
- No application code changes
- No test implementation  
- No schema modifications
- No UI changes

**Implementation Constraints:**
- Follow established engineering review format from EPIC-101/102
- Document all findings with appropriate severity
- Assess production readiness honestly
- Preserve all inherited findings

**Review Areas:**
- Architecture compliance
- Domain model correctness  
- Workspace isolation implementation
- Historical correctness preservation
- Testing coverage and quality
- UX accessibility baseline
- Security boundary enforcement
- Performance characteristics

**Validation Commands:**
```bash
npm run typecheck
npm run test
npm run test:integration  
npm run test:e2e
npm run build
```

**Acceptance Criteria:**
- [ ] Engineering review documents all implementation decisions
- [ ] All inherited findings properly recorded
- [ ] New findings identified and classified
- [ ] Production readiness assessment completed
- [ ] Documentation synchronized with implemented reality
- [ ] MASTER_PLAN updated with EPIC-103 completion
- [ ] Verdict and next steps clearly documented

**Exact Commit Message:**
```text
docs(time-tracking): complete EPIC-103 engineering review
```

**Expected Result:** EPIC-103 engineering completion with clear verdict and production readiness assessment

---

## 20. Engineering Review Requirements

### 20.1 Review Scope

**Architecture Review:**
- Compliance with established modular monolith architecture
- Server Action → Application Service → Repository pattern adherence
- Workspace isolation implementation  
- Domain boundary preservation

**Domain Correctness Review:**
- TimeEntry business rules implementation
- Contract validity enforcement  
- Historical correctness preservation (with P102-F-001 limitation)
- Client/Contract relationship integrity

**Security Review:**
- Workspace authorization enforcement
- Foreign resource access prevention
- Browser workspaceId rejection
- Input validation completeness

**Quality Review:**
- Test coverage assessment (unit, integration, E2E)
- Accessibility baseline compliance
- Error handling robustness
- Performance characteristics

### 20.2 Expected Findings

**Inherited Findings (to be confirmed):**
- P102-F-001: Commercial Contract edits rewrite historical meaning
- F-P2-004: TimeEntry.contractId required for non-billable entries
- F-004-001: Concurrent first-workspace limitation  
- Other EPIC-003, EPIC-004 findings as applicable

**Potential New Findings:**
- Time entry edit audit limitations (related to OBD-008)
- Duration input UX limitations  
- Contract selection performance with large datasets
- Weekly timesheet scalability limitations

### 20.3 Verdict Options

**PASS:** Implementation meets all architectural and quality requirements  
**PASS WITH FINDINGS:** Implementation acceptable with documented limitations
**FAIL:** Implementation has blocking defects requiring resolution

### 20.4 Production Readiness Assessment

Engineering Review assesses engineering completion, NOT production certification.

**Engineering Complete** means:
- Architecture compliance verified
- Business rules correctly implemented  
- Security boundaries enforced
- Test coverage adequate
- Documentation synchronized

**Production Readiness** requires separate validation/certification process outside this Epic.

---

## 21. Documentation Synchronization

### 21.1 Required Updates

**MASTER_PLAN.md:**
- Update EPIC-103 status to COMPLETE
- Record engineering review verdict  
- Update next Epic to R1-E04 (Analytics & Dashboard)
- Update overall MVP implementation status

**CHANGELOG.md:**
- Add EPIC-103 Time Tracking implementation entry
- Document major features added
- Reference relevant commits

**Other Documentation (if affected):**  
- Domain model updates if TimeEntry rules refined
- Architecture updates if patterns modified
- Storage documentation if query patterns documented

### 21.2 Documentation Standards

**Only implemented features** described as implemented
**Known limitations** explicitly documented  
**Inherited findings** carried forward accurately
**New findings** properly classified and described

---

## 22. Findings & Open Decisions

### 22.1 Inherited Findings (Confirmed from Repository)

**P102-F-001 (OPEN - EPIC-102):**
- **Description:** Commercial Contract edits can change interpretation of historical TimeEntries because TimeEntry stores `contractId` and no rate snapshot
- **Impact:** Historical TimeEntry billing calculations may change if Contract terms are modified
- **EPIC-103 Decision:** Accepted limitation; not resolved by Time Tracking implementation

**F-P2-004 (OPEN - EPIC-002):**  
- **Description:** TimeEntry.contractId is required; non-billable entries without a contract cannot be stored
- **Impact:** All TimeEntries must have explicit Contract relationship even if billable=false
- **EPIC-103 Decision:** Preserved requirement; Contract selection mandatory in all Time Tracking forms

**F-004-001 (OPEN - EPIC-004):**
- **Description:** Concurrent first-workspace limitation 
- **Impact:** User experience issues during workspace creation
- **EPIC-103 Decision:** No impact on Time Tracking; limitation inherited unchanged

**Other inherited findings:** EPIC-003 findings, remaining EPIC-002 findings as documented in prior engineering reviews

### 22.2 New EPIC-103 Planning Findings

**F-103-P-001 - TimeEntry Edit Audit Limitation:**
- **Severity:** Low  
- **Blocking:** No
- **Description:** TimeEntry edits are not audited due to OBD-008 (no audit system). Edit history is not preserved.
- **Mitigation:** Accepted for MVP; audit system deferred to later releases

**F-103-P-002 - Contract Selection Performance:**
- **Severity:** Low
- **Blocking:** No  
- **Description:** Contract selection may become slow with large numbers of Contracts per Client
- **Mitigation:** Acceptable for MVP scope; optimization deferred if needed

### 22.3 Open Business Decisions (Inherited)

All OBDs from MASTER_PLAN remain open and are NOT resolved by EPIC-103:

**OBD-001:** Daily-rate semantics / partial days  
**OBD-002:** Monetary rounding  
**OBD-003:** Midnight-crossing entries  
**OBD-006:** Capacity warning threshold  
**OBD-008:** Audit requirements (related to F-103-P-001)  
**OBD-009:** Workspace roles  
**OBD-010:** Payment-term catalog  
**OBD-011:** Multi-currency  
**OBD-012:** Contract-hour rollover/expiry  

**Proposed OBDs from EPIC-102 (NOT accepted as policy):**
**OBD-013:** Contract overlap validation strictness  
**OBD-014:** Contract commercial edit restrictions
**OBD-015:** Archived Client interaction policy  
**OBD-016:** TimeEntry commercial snapshot requirements

### 22.4 Product Decisions Finalized

**PD-103-001 - TimeEntry Deletion Mechanism:**
- **Status:** RESOLVED
- **Decision:** Hard delete
- **Impact:** No schema change required; simple repository interface; no archive state

**PD-103-002 - workDate Editability:**
- **Status:** RESOLVED
- **Decision:** Immutable after creation  
- **Impact:** Simplified validation; excluded from UpdateTimeEntryInput; UI edit excludes workDate

**PD-103-003 - clientId/contractId Editability:**
- **Status:** RESOLVED
- **Decision:** Immutable after creation
- **Impact:** Historical integrity preserved; excluded from UpdateTimeEntryInput; UI edit excludes client/contract

### 22.5 Non-Blocking Planning Decisions (Resolved)

**PD-103-004 - Future Date TimeEntry Policy:**
- **Decision:** PERMITTED for MVP (user may plan ahead)
- **Rationale:** Simple policy; common use case; no business rule violation

**PD-103-005 - Duplicate TimeEntry Policy:**
- **Decision:** PERMITTED for MVP  
- **Rationale:** User responsibility; no technical constraint; flexibility preferred

**PD-103-006 - Contract Selection UX Flow:**
- **Decision:** Client-first, then eligible Contracts  
- **Rationale:** Matches domain model; Contract belongs to Client; clearer UX flow

---

## 23. Production Readiness Statement

### 23.1 Engineering Completion Criteria

EPIC-103 engineering completion requires:

- [ ] All TimeEntry CRUD operations implemented
- [ ] Contract validation and eligibility correctly enforced  
- [ ] Workspace isolation security boundaries verified
- [ ] Complete test coverage (unit, integration, E2E)
- [ ] Accessibility baseline compliance
- [ ] Documentation synchronized with implementation
- [ ] Engineering review completed with verdict

### 23.2 Production Readiness Limitations

**Engineering Complete ≠ Production Ready**

Production readiness requires additional validation outside EPIC-103 scope:
- Formal UX review and polish
- Production environment validation  
- Performance testing at scale
- Security penetration testing  
- Operational monitoring setup
- Production certification process

### 23.3 Known Production Limitations

**Inherited Limitations:**
- P102-F-001: Historical TimeEntry commercial reinterpretation risk
- F-P2-004: Non-billable entries still require Contract selection
- OBD-008: No audit trail for TimeEntry changes

**EPIC-103 Limitations:**
- F-103-P-001: TimeEntry edit history not preserved
- F-103-P-002: Contract selection performance with large datasets
- No bulk operations or advanced filtering
- No timer/stopwatch functionality  
- No mobile optimization

**Acceptable for MVP:** All limitations documented and accepted for initial release

---

## 24. Implementation Order & Dependencies

### 24.1 Critical Path

```text
P103-01 Application Services
        ↓
P103-02 UI Implementation  
        ↓
P103-03 Integration Testing
        ↓
P103-04 Engineering Review
```

**No parallelization possible:** Each phase depends on prior phase completion

### 24.2 External Dependencies

**Blocking Dependencies (must be satisfied):**
- [ ] EPIC-101 Client Management (COMPLETE)
- [ ] EPIC-102 Contract Management (COMPLETE) 
- [ ] All foundation Epics (COMPLETE)

**Non-blocking Dependencies:**
- Analytics system (R1-E04) not required for Time Tracking
- Reporting system (R1-E05) not required for Time Tracking  
- Alerts system (R1-E06) not required for Time Tracking

### 24.3 Implementation Readiness

**Ready to proceed:** All blocking dependencies satisfied
**Next action:** Start P103-01 in NEW CURSOR CHAT
**Implementation order:** P103-01 → P103-02 → P103-03 → P103-04

---

## 25. Cursor Chat Protocol

### 25.1 Phase Execution Rules

**Each Phase = NEW CURSOR CHAT**
- P103-01: Start new chat for application services implementation  
- P103-02: Start new chat for UI implementation
- P103-03: Start new chat for integration testing
- P103-04: Start new chat for engineering review

**Context Recovery per Phase:**
- Read this epic plan in full
- Read MASTER_PLAN.md current status  
- Read relevant architecture documents  
- Inspect current repository state
- Do NOT assume prior phase context

### 25.2 Phase Handoff Protocol  

**Phase Completion Checklist:**
1. All phase acceptance criteria met
2. Validation commands pass  
3. Commit message matches exact specification
4. Phase result documented
5. Next phase ready to start

**Phase Documentation:**
Each phase documents its completion in commit message and any implementation notes for Engineering Review.

### 25.3 Implementation Guidance

**Code Generation Rules:**
- Follow established repository patterns
- Maintain architectural consistency  
- Preserve workspace isolation
- Use TypeScript strictly
- Follow existing error handling patterns
- Match established UX conventions

---

## 26. Final Planning Gate

### 26.1 Planning Verification Checklist

**Epic Identity:**
- [x] Exact Epic identifier confirmed from MASTER_PLAN.md: EPIC-103
- [x] Epic title confirmed: R1-E03 — Time Tracking  
- [x] Dependencies verified as complete

**Implementation Readiness:**
- [x] No schema changes required (existing TimeEntry model sufficient)
- [x] TimeEntry persistence foundation exists
- [x] Repository interface partially implemented  
- [x] No migrations needed
- [x] Application architecture defined

**Business Rules Clarity:**
- [x] TimeEntry lifecycle defined (create → edit mutable fields → hard delete)
- [x] Contract relationship preserved (contractId required)  
- [x] Contract validity enforcement specified
- [x] Historical correctness limitations acknowledged (P102-F-001)
- [x] Archived Client behavior defined
- [x] Duration semantics specified (integer minutes)
- [x] Workspace isolation requirements specified

**Quality Assurance:**  
- [x] Testing strategy comprehensive (unit, integration, E2E)
- [x] Accessibility baseline defined
- [x] Security boundaries specified
- [x] Error handling approach defined

**Process Compliance:**
- [x] Four phases defined with clear boundaries
- [x] Each phase independently implementable  
- [x] One phase = one commit rule established
- [x] NEW CURSOR CHAT rule established
- [x] Engineering Review as final phase (not production certification)

### 26.2 Unresolved Planning Issues

**NONE IDENTIFIED**

All product decisions required for implementation have been made or explicitly deferred to appropriate OBDs. All technical decisions have been resolved based on repository evidence.

### 26.3 Planning Verdict

**PASS**

EPIC-103 planning is complete and implementation-ready.

---

## 27. Final Report

### 27.1 Epic Summary

**Epic Identifier:** EPIC-103 — Time Tracking  
**MASTER_PLAN Reference:** R1-E03 — Time Tracking  
**Planning Status:** COMPLETE  
**Implementation Status:** READY TO START

### 27.2 Key Planning Decisions

1. **No Schema Changes:** Existing TimeEntry model is sufficient for all requirements
2. **Lifecycle Policy:** Create → Edit mutable fields → Hard delete (PD-103-001; no archive state, no soft delete)
3. **Contract Requirement:** Preserved F-P2-004 (contractId required for all entries)  
4. **Historical Limitation:** Accepted P102-F-001 (commercial reinterpretation risk)
5. **UI Flow:** Client-first selection, then eligible Contracts
6. **Duration Format:** Integer minutes storage, hours:minutes display

### 27.3 Scope Boundaries

**Included:** Core TimeEntry CRUD, Contract validation, daily/weekly views, workspace isolation
**Excluded:** Timers, analytics, reporting, invoicing, advanced UX, mobile optimization

### 27.4 Risk Assessment  

**Low Risk:** Well-defined domain model, established patterns, complete dependencies
**Inherited Risks:** P102-F-001 commercial reinterpretation, F-P2-004 Contract requirement complexity

### 27.5 Success Criteria

**Primary:** Normal workday entry recordable in < 1 minute  
**Technical:** Complete CRUD with workspace isolation and Contract validation
**Quality:** Comprehensive test coverage and accessibility compliance

### 27.6 Next Steps

1. **Immediate:** Start P103-01 in NEW CURSOR CHAT
2. **Phase Sequence:** P103-01 → P103-02 → P103-03 → P103-04  
3. **Final Deliverable:** Engineering Review with PASS/PASS WITH FINDINGS/FAIL verdict
4. **Follow-up:** R1-E04 Analytics & Dashboard Epic planning

## Implementation Status

**IMPLEMENTED — ENGINEERING COMPLETE (PASS WITH FINDINGS)**

Delivered: workspace-scoped TimeEntry create / read / update / hard delete, contract eligibility and `[validFrom, validTo)` validity at create, archived-client create rejection, client-first selection, daily view, weekly timesheet, and the authenticated `/time-tracking`, `/time-tracking/new`, and `/time-tracking/[timeEntryId]/edit` surfaces. No Prisma schema change and no migration.

Not delivered from `MASTER_PLAN.md` §13 scope and recorded as deferred: calendar view, and copy-previous-entry which remains conditional on UX Review. The optional `/time-tracking/[timeEntryId]` detail route was not justified; the edit route carries read-only context and delete.

Open EPIC-103 findings: F-103-002 (archived-client entries not listed in the daily/weekly views), F-103-003 (contract-selector stale selection unverified), F-103-004, F-103-005, F-103-006, F-103-P-001, F-103-P-002. F-103-001 (`redirect()` inside `try`/`catch`) was a real application defect and is RESOLVED. Details in `docs/epics/EPIC-103/engineering-review.md`.

Production readiness is NO. Later production validation and certification remain required.

All Product Owner decisions have been finalized:

1. **TimeEntry deletion mechanism** → Hard delete (PD-103-001)
2. **workDate editability** → Immutable after creation (PD-103-002)  
3. **clientId/contractId editability** → Immutable after creation (PD-103-003)

These decisions establish:
- Repository interface: create, get, list, update (mutable fields), delete (hard)
- Application services: full CRUD with immutability constraints
- Domain validation: workspace isolation, contract validity at create, mutable-field validation on update
- UI forms: full create form, restricted edit form (duration/description/billable only)
- Database schema: no changes required for EPIC-103

**Next Action:** Plan EPIC-104 — Analytics & Dashboard (`MASTER_PLAN.md` §14 R1-E04) in a NEW CURSOR CHAT.

**Planning Status:** COMPLETE  
**Implementation Status:** COMPLETE  
**Engineering Review:** PASS WITH FINDINGS  
**Production Readiness:** NO