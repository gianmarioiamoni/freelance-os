# EPIC-104 — Analytics & Dashboard

**Epic:** EPIC-104  
**Release:** Release 1 — MVP  
**MASTER_PLAN identifier:** R1-E04 — Analytics & Dashboard  
**Status:** PLANNING  
**Dependencies:** EPIC-002, EPIC-003, EPIC-004, EPIC-005, EPIC-006, EPIC-101, EPIC-102, EPIC-103  
**Previous Epic:** EPIC-103 Time Tracking  
**Product Owner:** Human  
**Architect:** Assistant  
**Implementation Engineer:** Cursor  

---

## 1. Product Objective

Create a shared deterministic analytics layer and expose the operational dashboard to provide freelancers with real-time visibility into their working patterns, contract utilization, and operational health.

The analytics layer must become the authoritative source for all numerical facts used by dashboard, future reporting, alerts, and AI queries. No calculation should be duplicated across presentation surfaces.

---

## 2. User Problems Solved

### Current State Pain Points
- No visibility into monthly working patterns
- No understanding of contract utilization rates  
- No awareness of approaching contract thresholds
- No operational overview of client allocation
- Raw time entries without analytical summaries
- No shared calculation foundation for future reporting

### Target State Solutions
- Real-time monthly dashboard showing hours, utilization, and client allocation
- Deterministic analytics calculations shared across all presentation surfaces
- Foundation for future alerts and reporting capabilities
- Clear operational awareness without manual calculation

---

## 3. Success Criteria

### Primary Success Metrics
- Dashboard loads current month analytics within 2 seconds
- All calculations are mathematically deterministic and consistent
- Analytics layer supports workspace isolation completely
- Historical contract semantics are preserved in calculations
- Archived client time entries are handled explicitly (not silently omitted)

### Acceptance Criteria
- User can view current month total hours, billable hours, and client allocation
- Contract utilization percentages are accurate against contracted monthly hours
- All analytics respect workspace boundaries server-side
- Empty periods, loading states, and error states are handled gracefully
- Analytics calculations can be consumed by future reporting and alerts

---

## 4. Scope

### In Scope - Analytics Foundation
- `AnalyticsService` as shared calculation layer
- Monthly time aggregation (current month default)
- Billable vs non-billable hour calculations
- Client allocation calculations
- Contract utilization calculations (consumed/contracted hours)
- Period-based analytics (daily, weekly, monthly boundaries)
- Workspace-scoped analytics queries
- Historical contract interpretation preservation

### In Scope - Dashboard UI  
- `/dashboard` route as authenticated default landing
- Current month overview dashboard
- Monthly total hours display
- Billable hours and percentage
- Client allocation breakdown
- Contract utilization summary
- Empty state for new workspaces
- Loading and error state handling
- Mobile-responsive dashboard layout

### In Scope - Infrastructure
- Analytics repository layer for aggregation queries
- Date/period utilities for consistent boundary calculations
- Analytics domain services and value objects
- Integration with existing TimeEntry/Contract/Client data

---

## 5. Explicit Non-Goals

### Revenue/Financial Calculations (Deferred to Future Release)
- No monetary amount calculations
- No revenue estimation or billing totals
- No rate × hours computations
- No invoice preparation or commercial snapshots
- No currency conversion or multi-currency analytics

### Advanced Analytics (Future)
- No historical trend analysis beyond current month
- No forecasting or predictive analytics
- No comparative period analysis (month-over-month)
- No capacity planning or workload forecasting
- No profitability or efficiency metrics

### Reporting Features (R1-E05)
- No export functionality (CSV, PDF)
- No custom date range selection
- No detailed client/contract reports
- No printable reports or report generation

### Alert System (R1-E06)
- No threshold monitoring or alert generation
- No notification delivery
- No alert configuration UI
- Analytics must support future alerts but not implement them

---

## 6. Required Analytics Calculations

### Time Aggregations
- **Total Minutes**: SUM(TimeEntry.durationMinutes) for period/scope
- **Billable Minutes**: SUM(TimeEntry.durationMinutes WHERE billable = true)
- **Non-billable Minutes**: SUM(TimeEntry.durationMinutes WHERE billable = false)
- **Billable Percentage**: billableMinutes / totalMinutes (handle zero denominator)

### Client Analytics  
- **Client Hours**: GROUP BY clientId, SUM(durationMinutes) — includes archived Clients per PD-104-001
- **Client Billable Hours**: GROUP BY clientId, SUM(durationMinutes WHERE billable = true) — includes archived Clients
- **Client Percentage**: clientMinutes / totalMinutes for period — archived Client status presented explicitly

### Contract Analytics
- **Contract Utilization**: ALL tracked TimeEntry minutes (billable + non-billable) per PD-104-002
- **Contract Consumed Hours**: SUM(durationMinutes) grouped by contractId for period
- **Utilization Display**: consumedMinutes / contractedMinutes for finite contracts; "→ Ongoing" for unlimited contracts per PD-104-004

### Period Calculations
- **Daily Totals**: GROUP BY workDate
- **Weekly Totals**: GROUP BY WEEK(workDate) 
- **Monthly Totals**: GROUP BY YEAR-MONTH(workDate)

---

## 7. Dashboard Information Architecture

### Page Layout
```
┌─────────────────────────────────────────┐
│ Dashboard - [Month Year]                │
├─────────────────────────────────────────┤
│ Monthly Summary                         │
│ ├─ Total Hours: 120h 30m               │
│ ├─- Billable: 95h 15m (79%)            │
│ └── Non-billable: 25h 15m (21%)        │
├─────────────────────────────────────────┤
│ Client Allocation                       │
│ ├── ACME Corp: 65h 30m (54%)          │
│ ├── Beta Ltd: 40h 15m (33%)           │
│ └── Gamma Inc: 14h 45m (12%)          │
├─────────────────────────────────────────┤
│ Contract Utilization                    │
│ ├── ACME Retainer: 65h / 80h (81%)    │
│ ├── Beta Project: 40h / 60h (67%)     │
│ └── Gamma Support: 15h → Ongoing      │
└─────────────────────────────────────────┘
```

### Data Requirements per Widget
- **Monthly Summary**: Requires period total aggregation
- **Client Allocation**: Requires client-grouped time with percentages  
- **Contract Utilization**: Requires contract consumption vs contracted hours
- **Period Selection**: Current month default, future: custom range selection

---

## 8. Data Sources and Dependencies

### Primary Data Sources
- `TimeEntry` table: duration, billable status, work dates, client/contract associations
- `Contract` table: monthly contracted minutes, validity periods, client ownership
- `Client` table: client names, active/archived status
- `Workspace` table: timezone for period boundary calculations

### Data Flow Architecture
```
TimeEntry + Contract + Client
          ↓
AnalyticsRepository (aggregation queries)
          ↓
AnalyticsService (business rules)
          ↓
Dashboard Components (presentation)
```

### Repository Layer Requirements
- Workspace-scoped aggregation queries with explicit workspaceId filtering
- Date range filtering with inclusive period boundaries
- Client and contract join operations for enriched analytics
- Efficient GROUP BY operations for client allocation and contract utilization

---

## 9. Domain Rules and Business Logic

### Workspace Isolation Rules
- **BR-104-001**: All analytics calculations must be scoped to authenticated workspace
- **BR-104-002**: Browser-supplied workspaceId cannot be authoritative for analytics data
- **BR-104-003**: Cross-workspace data leakage in analytics is a security violation

### Historical Correctness Rules
- **BR-104-004**: TimeEntry historical associations to archived clients must be preserved in analytics per PD-104-001
- **BR-104-005**: Contract utilization must use the contract valid at time of work, not current contract
- **BR-104-006**: Changing current contract terms must not retroactively change historical analytics

### Contract Validity Rules
- **BR-104-007**: Contract utilization calculation must respect `[validFrom, validTo)` semantics
- **BR-104-008**: Open-ended contracts (`validTo = null`) are valid indefinitely for utilization
- **BR-104-009**: Contracts not valid for the analytics period must not contribute to utilization denominators

### Calculation Accuracy Rules
- **BR-104-010**: All duration calculations use integer minutes, never floating-point hours
- **BR-104-011**: Percentage calculations must handle zero denominators gracefully  
- **BR-104-012**: Billable percentage = billableMinutes / totalMinutes (undefined for zero total)

---

## 10. Workspace Isolation Implementation

### Server-Side Context Resolution
```typescript
// Analytics must follow established pattern
getCurrentWorkspaceContext() 
  → WorkspaceContext 
  → AnalyticsService.getMonthlyAnalytics(workspaceId, period)
  → AnalyticsRepository queries scoped by workspaceId
```

### Authorization Boundary
- Analytics dashboard accessible only to authenticated workspace members
- All analytics queries MUST include `WHERE workspaceId = ?` constraints
- No client-side workspace selection or browser-controlled workspace context
- Analytics calculations never cross workspace boundaries

### Security Invariants  
- **SI-104-001**: `getAnalytics(workspaceId, period)` must verify caller membership in workspaceId
- **SI-104-002**: Analytics aggregation queries must not be callable without workspace context
- **SI-104-003**: Dashboard must not render analytics for foreign workspaces

---

## 11. Historical Semantics and Contract Interpretation

### Contract Association Preservation
Following `TimeEntry.contractId` immutability from EPIC-103:
- Analytics calculations must respect stored `contractId` references
- Time entries retain association with contract valid at time of work
- Later contract changes do not retroactively affect historical analytics

### Archived Client Handling
**RESOLVED DECISION PD-104-001**: Analytics MUST include TimeEntries associated with archived Clients when those TimeEntries fall within the selected analytics date range.

**Rationale**: 
- Archiving a Client must not retroactively remove historical tracked time from analytics
- TimeEntry history remains meaningful for operational analysis
- Current Client status must not alter historical totals

**Implementation**: For Client breakdowns, archived Clients remain visible when they have qualifying TimeEntries, with their archived status presented explicitly where relevant.

**Acknowledgment**: This decision explicitly addresses EPIC-103 F-103-002, where daily/weekly views join against ACTIVE clients only. Analytics has its own explicit inclusion rule that differs from Time Tracking display behavior.

### Contract Commercial Terms (Inherited from EPIC-102)
**INHERITED FINDING P102-F-001**: TimeEntry stores contractId but no commercial snapshot. Contract rate/terms changes affect historical interpretation.

Analytics calculations that depend on contract terms (utilization) are subject to this limitation. EPIC-104 does not resolve P102-F-001 but must document the implication for utilization accuracy.

---

## 12. Date Range and Period Semantics

### Default Period Boundaries
- **Default Range**: Current calendar month (1st to last day of month)
- **Timezone Handling**: Use workspace.timezone for month boundary calculations
- **Period Inclusion**: Inclusive range `[monthStart, monthEnd]` for TimeEntry.workDate
- **Current Date**: Server-resolved "today" in workspace timezone

### Default Dashboard Period
**RESOLVED DECISION PD-104-003**: Default dashboard period spans from the first day of the current calendar month through today, using date-based workDate semantics consistent with Time Tracking.

**Rationale**:
- Aligns with business reporting conventions (calendar month boundaries)
- Provides meaningful period context for operational planning
- Maintains consistency with existing Time Tracking date semantics

**Implementation**: Use workspace timezone for month boundary calculations. Future TimeEntries remain permitted when the user explicitly selects a future period.

**Date Range Boundaries**: Dashboard must define date-range boundaries clearly and consider EPIC-103 F-103-006 concerning invalid date parameters without silently inheriting ambiguous behavior.

### Date Range Implementation  
```typescript
// Current month default in workspace timezone
const now = new Date(); // Server time
const workspaceTimezone = workspace.timezone; // 'Europe/Rome'
const monthStart = startOfMonth(zonedTimeToUtc(now, workspaceTimezone));
const today = startOfDay(zonedTimeToUtc(now, workspaceTimezone));
// Query: WHERE workDate >= monthStart AND workDate <= today
```

### Future Date Handling
- **Future Entries**: Include future TimeEntries when user explicitly selects a future period  
- **Invalid Dates**: Invalid parameters fall back to current month with user notification
- **Empty Periods**: Handle months with no time entries gracefully with empty state

---

## 13. Billable vs Non-Billable Semantics

### Billable Classification Rules
- **Billable Time**: `TimeEntry.billable = true` regardless of contract billing model
- **Non-billable Time**: `TimeEntry.billable = false` 
- **Contract Independence**: Billable flag is independent of Contract.billingModel (HOURLY/DAILY)

### Calculation Rules
- **Total Hours**: Sum of all entries regardless of billable status
- **Billable Hours**: Sum of entries WHERE billable = true
- **Non-billable Hours**: Sum of entries WHERE billable = false  
- **Billable Percentage**: billableMinutes / totalMinutes * 100 (show 0% for zero total)

### Contract Utilization vs Billable Hours
**RESOLVED DECISION PD-104-002**: Where Contract utilization is applicable and a valid contractual capacity denominator exists, the numerator equals ALL tracked TimeEntry minutes (both billable and non-billable time are included).

**Rationale**: 
- Utilization measures total contract consumption, not just billable activity
- Billable time remains a separate metric distinct from utilization
- Contract capacity represents total available working time allocation

**Explicit Exclusions**: Do NOT introduce revenue calculation, invoice calculation, payment calculation, profitability, forecasting, or rate-based billing calculations.

**Boundary Condition**: If contractual capacity is not semantically available for a Contract type, do not invent a denominator. Analytics will display consumed hours without percentage when capacity is undefined.

---

## 14. Empty, Loading, and Error State Specifications

### Empty States
- **New Workspace**: "No time entries yet. Start by creating your first client and logging some work."
- **Empty Month**: "No work recorded in [Month Year]. You can add time entries from the Time Tracking page."
- **No Billable Time**: Show 0h billable, 100% non-billable in monthly summary
- **No Active Contracts**: Contract utilization section shows "No contracts for current month period"

### Loading States  
- **Dashboard Loading**: Skeleton placeholders for each analytics section
- **Partial Loading**: Individual section loading states if analytics queries are independent
- **Progressive Enhancement**: Show available data while remaining sections load

### Error States
- **Analytics Calculation Error**: "Unable to calculate analytics. Please try again."
- **Database Error**: "Dashboard temporarily unavailable. Please refresh the page."
- **Authorization Error**: Redirect to workspace selection or sign-in
- **Workspace Context Lost**: Redirect to authentication flow

### Performance Expectations
- **Target Load Time**: Complete dashboard analytics within 2 seconds for MVP data volumes
- **Acceptable Degradation**: Up to 5 seconds for large workspaces (100+ clients, 1000+ entries)
- **Future Optimization**: Document when caching or materialized views become necessary

---

## 15. Accessibility Requirements

### Baseline Requirements
- **Semantic HTML**: Proper heading hierarchy (h1 → h2 → h3) for dashboard sections  
- **Screen Reader Support**: Analytics data announced as data tables or description lists
- **Color Independence**: Information not conveyed by color alone (percentages, not just color bars)
- **Keyboard Navigation**: All interactive elements keyboard accessible
- **Focus Management**: Logical focus order through dashboard components

### Data Presentation  
- **Percentage Accessibility**: "65 hours, 81 percent of contracted time" not just "65h (81%)"
- **Time Duration Format**: "2 hours 30 minutes" or "2h 30m" consistently
- **Client Names**: Never truncate client names without full-text alternatives
- **Utilization Status**: Text indicators like "Under limit" / "Over limit" alongside percentages

### Responsive Requirements
- **Mobile Layout**: Single-column layout for mobile with readable font sizes
- **Tablet Layout**: Two-column layout with adequate touch targets  
- **Desktop Layout**: Three-column layout optimizing screen real estate
- **Text Scaling**: Readable at 200% zoom without horizontal scrolling

---

## 16. Testing Strategy

### Unit Testing Coverage
- **Analytics Calculations**: Test all aggregation formulas with known data sets
- **Period Boundaries**: Test month/week/day boundary calculations across timezones
- **Percentage Calculations**: Test zero denominators, rounding, edge cases  
- **Workspace Filtering**: Test analytics calculations filter by workspaceId correctly
- **Contract Utilization**: Test unlimited contracts, historical contracts, overlapping periods
- **Client Allocation**: Test client grouping, archived clients, percentage totals

### Integration Testing Coverage  
- **Analytics Repository**: Test aggregation queries against real PostgreSQL data
- **Workspace Isolation**: Test cross-workspace data leakage prevention
- **Historical Correctness**: Test archived client time entries included in analytics
- **Contract Validity**: Test time entries respect contract validity periods in utilization
- **Date Range Queries**: Test inclusive period boundaries and timezone handling

### E2E Testing Coverage
- **Dashboard Journey**: Sign in → navigate to dashboard → verify analytics display
- **Empty State**: New workspace → empty dashboard → create time entry → refresh dashboard
- **Analytics Accuracy**: Create known time entries → verify dashboard calculations
- **Mobile Responsive**: Dashboard usability on mobile viewport
- **Error Handling**: Simulate analytics failure → verify error state → recovery path

### Performance Testing Approach
- **Baseline Performance**: Measure dashboard load time with MVP-size dataset  
- **Scalability Testing**: Test with 100 clients, 50 contracts, 1000 time entries
- **Query Performance**: Measure analytics aggregation query execution time
- **Memory Usage**: Verify analytics calculations don't cause memory leaks

---

## 17. Observability and Monitoring

### Analytics Performance Metrics
- **Dashboard Load Time**: Time from route navigation to analytics display
- **Query Execution Time**: Time for analytics aggregation queries  
- **Cache Hit Rate**: Future metric when caching is introduced
- **Error Rate**: Percentage of analytics requests failing

### Business Metrics
- **Dashboard Usage**: Frequency of dashboard visits per workspace
- **Analytics Accuracy**: Verification that calculations match expected results
- **Empty State Rate**: Percentage of workspaces with no analytics data

### Error Monitoring
- **Analytics Calculation Failures**: Log and alert on calculation errors
- **Query Performance**: Alert on queries exceeding acceptable thresholds  
- **Workspace Isolation Violations**: Alert on any cross-workspace data access
- **Data Consistency**: Monitor for analytics/source-data discrepancies

---

## 18. Security and Privacy Considerations

### Data Access Security
- **Workspace Isolation**: Analytics calculations must never cross workspace boundaries
- **Authorization**: Verify workspace membership before serving analytics data
- **Query Injection**: Use parameterized queries for all analytics aggregation
- **Data Minimization**: Analytics endpoints return only necessary data for dashboard

### Privacy Considerations  
- **Client Data**: Client names in analytics must respect workspace access controls
- **Time Data**: Work patterns are sensitive; ensure workspace-scoped access only
- **Cross-Client Analytics**: Client allocation percentages reveal competitive information

### Audit Requirements
- **Analytics Access**: Log analytics access for sensitive workspaces (future requirement)
- **Calculation Integrity**: Ensure analytics calculations are deterministic and auditable  
- **Data Retention**: Analytics calculations must not create duplicate retention requirements

---

## 19. Dependencies and Integration Points

### Hard Dependencies (Must be Complete)
- **EPIC-102**: Contract management with monthly contracted hours
- **EPIC-103**: Time tracking with workspace-scoped TimeEntry CRUD  
- **EPIC-006**: Authenticated UI foundation and navigation
- **EPIC-004**: Workspace isolation and authorization patterns

### Soft Dependencies (Inform Implementation)
- **EPIC-101**: Client management for client allocation analytics
- **EPIC-005**: Testing foundation for analytics test coverage
- **Architecture baseline**: Modular monolith, shared application services

### Future Integration Points
- **R1-E05 Reporting**: Must consume same AnalyticsService calculations
- **R1-E06 Alerts**: Must use analytics thresholds from same calculation foundation
- **Future AI**: Must query analytics through controlled application services

### External Dependencies
- **PostgreSQL**: Analytics queries require efficient aggregation support
- **Prisma**: Analytics repository implementation through existing ORM
- **Next.js**: Server-side analytics calculation and dashboard rendering  

---

## 20. Resolved Product Decisions

### PD-104-001: Archived Client Time in Analytics — RESOLVED: INCLUDE
**Decision**: Analytics MUST include TimeEntries associated with archived Clients when those TimeEntries fall within the selected analytics date range.
**Rationale**: Archiving a client must not retroactively remove historical tracked time from analytics; TimeEntry history remains meaningful; current Client status must not alter historical totals.
**Implementation**: For Client breakdowns, archived Clients remain visible when they have qualifying TimeEntries, with their archived status presented explicitly where relevant.
**Acknowledgment**: This decision explicitly addresses EPIC-103 F-103-002.

### PD-104-002: Contract Utilization Calculation Basis — RESOLVED: ALL TIME
**Decision**: Where Contract utilization is applicable and a valid contractual capacity denominator exists, numerator = ALL tracked TimeEntry minutes; both billable and non-billable time are included.
**Rationale**: Utilization measures total contract consumption; billable time remains a separate metric; do NOT equate utilization with billable percentage.
**Exclusions**: Do NOT introduce revenue calculation, invoice calculation, payment calculation, profitability, forecasting, or rate-based billing calculations.

### PD-104-003: Dashboard Default Date Range — RESOLVED: CURRENT MONTH
**Decision**: Default dashboard period spans first day of the current calendar month through today.
**Rationale**: Aligns with business reporting conventions; provides meaningful period context; maintains consistency with Time Tracking date semantics.
**Implementation**: Use workspace timezone for boundaries; future TimeEntries remain permitted when user explicitly selects a future period.

### PD-104-004: Unlimited Contract Display Format — RESOLVED: ONGOING
**Decision**: For Contracts where validTo is null, display "validFrom → Ongoing". For finite Contracts, display "validFrom → validTo".
**Rationale**: This is presentation only and does not change existing Contract validity semantics (finite: validFrom <= workDate < validTo; open-ended: workDate >= validFrom).
**Implementation**: Contract utilization section shows consumed hours with "→ Ongoing" indicator rather than percentage calculation.

---

## 21. Findings Inherited from Previous Epics

### F-103-002: Archived Client Visibility (HIGH PRIORITY)
**Impact on Analytics**: Daily/weekly time views join against ACTIVE clients only. Analytics has its own explicit inclusion rule per resolved PD-104-001.
**Resolution**: Analytics MUST include TimeEntries associated with archived Clients when those TimeEntries fall within the selected analytics date range.
**Testing**: Integration tests must verify archived-client time included in analytics calculations consistently.

### P102-F-001: Contract Commercial Terms Mutability (MEDIUM PRIORITY)  
**Impact on Analytics**: Contract utilization calculations subject to commercial terms changes affecting historical interpretation.
**EPIC-104 Approach**: Document the limitation; do not attempt to resolve with snapshots without Product Owner decision.
**Testing**: Verify current behavior; document utilization calculation dependencies on current contract terms.

### F-103-005: Unused Domain Error Classes (LOW PRIORITY)
**Impact on Analytics**: WorkspaceAccessDeniedError and ForeignResourceAccessError are unused; analytics should follow established fail-closed patterns.
**Resolution**: Use established not-found error patterns for authorization failures.

### EPIC-003 F-003: Production Email Provider (FUTURE)
**Impact on Analytics**: No direct impact; required for production deployment.
**No Action Required**: Outside EPIC-104 scope.

---

## 22. Phase and Commit Breakdown

### Phase 1: Analytics Foundation
**Objective**: Implement AnalyticsService and repository layer for deterministic calculations
**Scope**: Core analytics calculations without UI  
**Commit**: `feat(analytics): implement shared analytics calculation services`

**Implementation Notes:**
- Create `AnalyticsService` with workspace-scoped calculation methods
- Implement `AnalyticsRepository` for efficient aggregation queries  
- Add analytics domain value objects (MonthlyAnalytics, ClientAllocation, ContractUtilization)
- Add period boundary utilities with timezone support
- Implement all analytics calculations per domain rules section

**Validation:**
- Unit tests verify calculation accuracy with known datasets
- Integration tests verify workspace isolation in analytics queries
- All calculations handle edge cases (zero totals, unlimited contracts)

**Expected Tests**: 25-35 unit tests, 15-20 integration tests
**Dependencies**: None (builds on EPIC-103 completed state)

**Acceptance Criteria:**
- `AnalyticsService.getMonthlyAnalytics(workspaceId, period)` returns deterministic calculations
- All analytics calculations respect workspace boundaries  
- Contract utilization handles unlimited contracts gracefully
- Archived-client time entries included per resolved PD-104-001

---

### Phase 2: Dashboard UI Implementation  
**Objective**: Create dashboard route and components consuming AnalyticsService
**Scope**: Dashboard UI with analytics display, responsive layout, accessibility baseline
**Commit**: `feat(dashboard): implement monthly analytics dashboard with responsive layout`

**Implementation Notes:**  
- Replace `/dashboard` placeholder with functional analytics dashboard
- Implement dashboard components: MonthlyAnalytics, ClientAllocation, ContractUtilization  
- Add responsive layout for mobile/tablet/desktop
- Implement loading, empty, and error state handling
- Add dashboard navigation as authenticated default landing

**Validation:**
- Dashboard displays analytics accurately for current month
- Responsive layout verified across viewport sizes  
- Loading and error states function correctly
- Accessibility baseline verified (semantic HTML, keyboard navigation)

**Expected Tests**: 15-20 component unit tests, 10-15 integration tests
**Dependencies**: Phase 1 complete

**Acceptance Criteria:**
- Dashboard loads within 2 seconds for MVP data volumes
- All analytics displayed with proper formatting and accessibility
- Empty states guide users to create first time entries  
- Mobile layout remains usable with readable text sizes

---

### Phase 3: Integration Testing and E2E Coverage
**Objective**: Add comprehensive testing coverage for analytics accuracy and dashboard journey  
**Scope**: Integration tests, E2E dashboard journey, performance validation
**Commit**: `test(analytics): add comprehensive analytics and dashboard test coverage`

**Implementation Notes:**
- Add integration tests for analytics workspace isolation  
- Add E2E dashboard journey from authentication through analytics display
- Add performance testing baseline for analytics queries
- Test archived-client handling per resolved PD-104-001
- Verify historical correctness of contract utilization calculations

**Validation:**
- Integration tests prove workspace isolation for analytics
- E2E tests verify dashboard journey from sign-in to analytics display
- Performance tests establish baseline for acceptable load times
- Cross-workspace data leakage prevention verified

**Expected Tests**: 20-25 integration tests, 8-10 E2E tests  
**Dependencies**: Phase 2 complete

**Acceptance Criteria:**
- All analytics calculations tested for accuracy and isolation
- Dashboard E2E journey passes reliably in CI
- Performance baseline documented for future optimization
- Archived-client analytics behavior verified per resolved PD-104-001

---

## 23. Engineering Review Requirements

### Scope Compliance Verification
- Analytics calculations implemented per domain rules BR-104-001 through BR-104-012
- Dashboard UI implemented with responsive layout and accessibility baseline
- All product decisions PD-104-001 through PD-104-004 resolved and implemented consistently
- No revenue calculations or commercial amounts calculated (explicit non-goal verified)

### Architecture Compliance Review
- AnalyticsService follows established application service patterns  
- Analytics calculations consume shared services (no duplicate business logic)
- Dashboard components follow established UI architecture (RSC + client islands)
- No client-side workspace selection or browser-controlled analytics scope

### Historical Correctness Review  
- TimeEntry historical associations preserved in analytics calculations
- Contract utilization respects stored contractId references  
- Archived-client handling explicitly implemented per resolved PD-104-001
- P102-F-001 impact documented but not resolved (outside scope)

### Security and Isolation Review
- All analytics queries scoped by authenticated workspaceId
- Cross-workspace data leakage prevention verified by integration tests
- Dashboard authorization follows established workspace access patterns  
- No analytics data served without workspace membership verification

### Testing Completeness Review
- Unit test coverage for all calculation formulas and edge cases
- Integration test coverage for workspace isolation and query accuracy
- E2E coverage for complete dashboard journey  
- Performance baseline established for acceptable analytics load times

---

## 24. Production Readiness Boundary

EPIC-104 engineering completion **IS NOT** production readiness. Production deployment requires:

### Post-EPIC-104 Requirements  
- R1-E05 Reporting implementation (analytics consumption verification)
- R1-E06 Alerts & Notifications implementation (shared calculation services)
- Formal UX Review of dashboard design and accessibility
- Production performance validation with realistic data volumes
- Production monitoring and alerting for analytics query performance

### Inherited Production Blockers (Not Resolved by EPIC-104)
- EPIC-003 F-003: Production password-reset email provider selection
- EPIC-003 F-001: Google/email identity linking product decision  
- P102-F-001: Contract commercial terms mutability (historical interpretation)
- Production database performance validation for analytics aggregation

### Security Production Requirements
- Production workspace isolation audit
- Analytics query performance monitoring in production
- Security review of analytics data exposure in dashboard

**EPIC-104 Boundary**: Engineering-complete analytics and dashboard foundation. **NOT** production-certified.

---

## 25. Commit Messages and Git Strategy

### Phase 1 Commit
```
feat(analytics): implement shared analytics calculation services

- Add AnalyticsService with workspace-scoped monthly calculations
- Add AnalyticsRepository for efficient TimeEntry aggregation  
- Add analytics domain value objects and period utilities
- Implement client allocation and contract utilization calculations
- Add timezone-aware period boundary calculations
- Include archived-client time entries per resolved PD-104-001

Closes: Analytics foundation requirements for R1-E04
Tested: Unit and integration coverage for calculation accuracy
```

### Phase 2 Commit  
```
feat(dashboard): implement monthly analytics dashboard with responsive layout

- Replace /dashboard placeholder with functional analytics display
- Add MonthlyAnalytics, ClientAllocation, ContractUtilization components  
- Implement responsive mobile/tablet/desktop layout
- Add loading, empty, and error state handling
- Set dashboard as authenticated default landing route

Closes: Dashboard UI requirements for R1-E04  
Tested: Component and integration coverage for UI behavior
```

### Phase 3 Commit
```  
test(analytics): add comprehensive analytics and dashboard test coverage

- Add integration tests for analytics workspace isolation
- Add E2E dashboard journey from authentication to analytics
- Add performance testing baseline for analytics queries  
- Test archived-client analytics handling per resolved PD-104-001
- Verify contract utilization historical correctness

Closes: Testing requirements for R1-E04 engineering completion
Tested: Integration and E2E coverage for analytics accuracy
```

---

## 26. Acceptance Criteria Summary

### Phase 1: Analytics Foundation
- [ ] AnalyticsService implements all calculations per domain rules BR-104-001 to BR-104-012
- [ ] AnalyticsRepository provides workspace-scoped aggregation queries
- [ ] Contract utilization handles unlimited contracts gracefully  
- [ ] Archived-client time entries included per PD-104-001 resolution
- [ ] Period boundary calculations use workspace timezone correctly
- [ ] Unit tests verify calculation accuracy with edge cases
- [ ] Integration tests verify workspace isolation for analytics queries

### Phase 2: Dashboard UI
- [ ] Dashboard route displays monthly analytics with proper formatting
- [ ] Responsive layout functions across mobile/tablet/desktop viewports
- [ ] Loading, empty, and error states implemented and functional
- [ ] Dashboard loads within 2 seconds for MVP data volumes  
- [ ] Accessibility baseline verified (semantic HTML, keyboard navigation)
- [ ] Client allocation and contract utilization displayed accurately
- [ ] Dashboard set as default authenticated landing route

### Phase 3: Testing & Integration  
- [ ] Integration tests verify analytics workspace isolation completely
- [ ] E2E dashboard journey passes reliably from sign-in to analytics display
- [ ] Performance baseline documented for analytics query execution
- [ ] Cross-workspace data leakage prevention verified
- [ ] Archived-client analytics behavior matches resolved PD-104-001
- [ ] Historical contract utilization accuracy verified

### Engineering Review Gate
- [ ] All analytics calculations mathematically deterministic  
- [ ] No revenue or commercial amount calculations present (non-goal verified)
- [ ] Analytics layer ready for consumption by future reporting and alerts
- [ ] Documentation updated to reflect implemented analytics capabilities
- [ ] All findings and product decisions explicitly addressed or documented

---

## 27. Next Steps After EPIC-104

### Immediate Follow-up (R1-E05 Reporting)
**Required**: Verify AnalyticsService consumption by reporting features
**Validation**: Reports and dashboard produce identical analytical results  
**Dependency**: EPIC-104 AnalyticsService must be stable and tested

### Future Analytics Extensions (Later Releases)
- Historical trend analysis and period comparisons
- Advanced client profitability metrics  
- Forecasting and capacity planning analytics
- Revenue calculations (after commercial calculation decisions)

### Production Readiness Path  
- UX Review: Dashboard design and workflow optimization
- Performance Review: Analytics query optimization for production data volumes  
- Security Review: Workspace isolation and data exposure audit
- Production Validation: End-to-end system verification

---

## Document Status

**Planning Status**: COMPLETE  
**Product Decisions**: 4 resolved, implemented consistently throughout plan  
**Inherited Findings**: 3 documented, resolution approach defined  
**Architecture Compliance**: Verified against existing patterns  
**Implementation Ready**: YES

**Next Action**: Proceed to Phase 1 implementation with resolved product decisions.