# Phase 2: AI Analytics UX & Information Architecture - Analysis

**Status:** Analysis complete  
**Date:** 2026-10-02

## 1. Current Dashboard/Reports AI Entry Points

### Dashboard
- **Location:** `src/components/dashboard/Dashboard.tsx` line 32
- **Component:** `<AnalyticsAskBox surface="dashboard" />`
- **Placement:** Immediately after PageHeader, before analytics cards
- **Visibility:** Always visible when Dashboard page loads

### Reports
- **Location:** `src/app/(app)/reports/page.tsx` line 83
- **Component:** `<AnalyticsAskBox surface="reports" />`
- **Placement:** After header section, before PeriodSelector
- **Visibility:** Always visible, even in error state (line 141)

## 2. Exact Components Involved

### Core UI Components
1. **`AnalyticsAskBox.tsx`** - Container, question input, submit handler
   - Accepts `surface: "dashboard" | "reports"`
   - Manages question state and submission
   - Renders GuidedPromptList and AiOutcomePanel
   
2. **`AiOutcomePanel.tsx`** - Answer display
   - Shows `result.text` (provider prose)
   - Shows `result.facts[]` with raw metric names
   - Shows `result.citations[]` with "Sources" heading
   - Displays raw values: "120 minutes", "160 EUR"
   
3. **`GuidedPromptList.tsx`** - Guided prompt chips
   - No changes required

4. **`format-ai-citations.ts`** - Helper utilities
   - `displayFactValue()` - returns raw value + unit/currency
   - `citationIdentity()` - extracts label
   - `citationPeriodLabel()` - formats period

### Application Layer
5. **`assemble-grounded-answer.ts`** - Facts construction
   - Assembles structured facts from tool DTOs
   - Preserves minutes, raw currency values
   - No human-readable formatting

6. **`ai-types.ts`** - Type definitions
   - `AiGroundedFact` - metric, value, currency, unit, label
   - `AiCitation` - tool, metric, value, period, labels
   - `AiAskResult` - outcome, text, facts, citations

## 3. Current Answer Data Flow

```
User question
  → askWorkspaceQuestionAction (server action)
  → orchestrator
  → provider adapter (Anthropic)
  → tool execution
  → assembleGroundedAnswer()
    → creates facts[] with raw values
  → provider prose in result.text
  → AiAskResult returned to client
  → AiOutcomePanel renders:
    - result.text (provider prose)
    - facts[] (raw DTO field names)
    - citations[] ("Sources" section)
```

## 4. Current Sources/Citations Presentation

**Problem:** Technical metadata exposed to users.

Example current output:
```
hours: 120 minutes
billableHours: 120 minutes
accrued: 160 EUR
expected: 200 EUR
forecast: 0 EUR

Sources:
get_monthly_analytics · 2026-09-01 – 2026-09-30
accrued · ACME: 160 EUR
```

**Issues:**
- Raw metric names (`billableHours`, `accrued`)
- Raw units (`120 minutes` instead of "2 hours")
- Zero-value noise (`forecast: 0 EUR`)
- Tool names exposed (`get_monthly_analytics`)
- Technical period format

## 5. Recommended Minimal Architecture

### A. Remove Dashboard Entry Point

**Change:** Remove `<AnalyticsAskBox surface="dashboard" />` from Dashboard.

**Rationale:**
- Dashboard is operational overview
- Reports is analytical surface
- AI Analytics belongs with Reports
- Avoid duplicate product concepts

**Impact:**
- Dashboard.tsx - 1 line removal
- E2E test - update dashboard test expectations
- No contract/provider changes

### B. Visual Separation in Reports

**Change:** Add visual distinction to AI area in Reports.

**Approach:**
```tsx
<section 
  aria-labelledby="ai-analytics-heading"
  className="rounded-lg border-2 border-primary/20 bg-primary/5 p-6"
>
  <h2 id="ai-analytics-heading" className="sr-only">
    AI Analytics Assistant
  </h2>
  <AnalyticsAskBox surface="reports" />
</section>
```

**Rationale:**
- Clear visual boundary
- Accessible structure
- No new pages/navigation
- Minimal implementation

### C. Improve Answer Presentation

**Two-layer approach:**

#### Layer 1: Format Helper Enhancement
Enhance `format-ai-citations.ts` with human-readable formatters:

```typescript
export function formatFactForDisplay(fact: AiGroundedFact): string {
  if (fact.value === null) {
    return "Not available";
  }
  
  // Convert minutes to hours
  if (fact.unit === "minutes") {
    const hours = Math.round((fact.value as number) / 60);
    return `${hours}h`;
  }
  
  // Money without redundant zero decimals
  if (fact.currency) {
    return `${fact.value} ${fact.currency}`;
  }
  
  return String(fact.value);
}

export function formatMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    hours: "Hours worked",
    billableHours: "Billable hours",
    accrued: "Accrued revenue",
    expected: "Expected revenue",
    forecast: "Forecast",
    clientHours: "Client hours",
  };
  return labels[metric] || metric;
}
```

#### Layer 2: UI Presentation Update
Update `AiOutcomePanel.tsx`:

```typescript
// Show provider text (grounded)
<p>{result.text}</p>

// Show formatted facts without zeros
{result.facts
  .filter(fact => fact.value !== 0 && fact.value !== null)
  .map(fact => (
    <li key={...}>
      {formatMetricLabel(fact.metric)}: {formatFactForDisplay(fact)}
      {fact.label ? ` (${fact.label})` : ""}
    </li>
  ))
}

// Hide sources section from end users
// (citations remain in result for logging/debugging)
```

**Rationale:**
- Preserves grounding (facts still authoritative)
- No contract changes required
- No provider adapter changes
- Format layer only
- Zero-value filtering at UI layer

### D. Security Preservation

**Unchanged:**
- Application facts remain source of truth
- Provider prose rendered but supplemented by structured facts
- No removal of grounding data
- No changes to orchestrator security boundaries
- FORBIDDEN_TOOL_ARG_KEYS unchanged
- Refusal behavior unchanged

## 6. Files to Change

### Remove Dashboard Entry Point
1. `src/components/dashboard/Dashboard.tsx`
   - Remove line 32: `<AnalyticsAskBox surface="dashboard" />`

### Add Visual Separation in Reports
2. `src/app/(app)/reports/page.tsx`
   - Wrap AnalyticsAskBox in styled section
   - Lines 83 and 141 (normal + error state)

### Improve Answer Presentation
3. `src/components/ai/format-ai-citations.ts`
   - Add `formatFactForDisplay()`
   - Add `formatMetricLabel()`

4. `src/components/ai/AiOutcomePanel.tsx`
   - Use new formatters
   - Filter zero-value facts
   - Hide sources section

### Update Tests
5. `tests/e2e/ai-analytics.spec.ts`
   - Remove Dashboard AI test
   - Keep Reports AI test
   - Update display expectations

6. `tests/unit/components/ai/format-ai-citations.test.ts`
   - Add tests for new formatters

7. `tests/unit/components/ai/ai-ask-box-boundary.test.ts`
   - Update expectations if needed

## 7. Tests Required

### Unit Tests
- `format-ai-citations.test.ts`
  - formatFactForDisplay with minutes → hours
  - formatFactForDisplay with currency
  - formatFactForDisplay with null
  - formatMetricLabel mapping

### E2E Tests
- `ai-analytics.spec.ts`
  - ✅ Keep: Reports ask-box submission
  - ✅ Keep: Reports unavailable state
  - ❌ Remove: Dashboard ask-box test
  - ✅ Add: Verify Dashboard has no AI entry point
  - ✅ Add: Verify Reports AI area is visually distinct

### Regression Tests
- Run typecheck
- Run lint
- Run focused AI tests

### Manual Validation
1. Dashboard has no AI Analytics entry point
2. Reports contains single AI entry point with visual distinction
3. Revenue answer is readable (no "accrued: 160 EUR", shows "Accrued revenue: 160 EUR")
4. Time answer is readable (no "120 minutes", shows "2h")
5. Technical field names not displayed
6. Raw sources not displayed
7. Zero-value metrics filtered
8. Empty/unavailable answers remain understandable
9. Grounding/security unchanged

## 8. Implementation Summary

**Scope:** Minimal, focused changes  
**Contract changes:** None  
**Provider changes:** None  
**Security changes:** None  
**Domain logic changes:** None

**Changes:**
- 1 removal (Dashboard AI entry point)
- 1 visual wrapper (Reports AI section)
- 2 format helpers (display + label)
- 1 UI update (AiOutcomePanel presentation)
- Test updates

**Estimated impact:**
- ~50 lines changed
- No database changes
- No API changes
- No authentication changes
- No Time Tracking changes

**Risk:** Low  
**Validation:** Focused tests + manual UX review
