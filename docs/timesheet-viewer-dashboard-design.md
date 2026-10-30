# Timesheet Viewer Dashboard – Analisi e Progettazione

## 1. Analisi del contesto esistente

### 1.1 Infrastruttura disponibile

**Route e Layout:**
- Management interno: `/timesheet-viewer` - gestione inviti e autorizzazioni
- API disponibili:
  - `GET /api/timesheet-viewer/access/[viewerAccessId]/contracts` - lista contratti autorizzati
  - `GET /api/timesheet-viewer/access/[viewerAccessId]/time-entries` - time entries autorizzate
  - `GET /api/timesheet-viewer/anomalies` - segnalazioni anomalie

**Servizi applicativi:**
- `getAuthorizedTimeEntries()` - filtra time entries per contratti autorizzati
- `activateViewer()` - attivazione viewer dopo accettazione invito
- Sistema di autorizzazione granulare per contract

**Modelli disponibili:**
- `TimesheetViewerAccess` - stato viewer (PENDING/ACTIVE/REVOKED)
- `TimesheetViewerContract` - autorizzazioni per contratto
- `TimeEntry` - entries con snapshot commerciali
- `AnomalyReport` - segnalazioni (OPEN/ACKNOWLEDGED/RESOLVED)

**Componenti UI riutilizzabili:**
- Dashboard interna: `MonthlyAnalytics`, `MonthlyHours`, `Dashboard`
- Componenti base: `Card`, `Button`, `PageHeader`, `EmptyState`
- Non ci sono librerie grafiche installate (no recharts, no tremor)

### 1.2 Funzionalità non ancora implementate

**Manca:**
- Layout dedicato per viewer esterni (portale pubblico)
- Autenticazione viewer (sessione separata da workspace)
- Route dashboard viewer (`/viewer-portal/dashboard` o simile)
- Componenti UI specifici per viewer
- Aggregazioni temporali dedicate per viewer
- Sistema di navigazione del portale esterno

## 2. Proposta architetturale Dashboard Viewer

### 2.1 Struttura route e layout

```
src/app/
├── (viewer-portal)/          # Nuovo layout group
│   ├── layout.tsx           # Layout pubblico per viewer
│   ├── dashboard/
│   │   └── page.tsx         # Dashboard viewer
│   └── time-entries/
│       └── page.tsx         # Dettaglio time entries (opzionale)
└── api/
    └── viewer-portal/        # API dedicate
        └── dashboard/
            └── [viewerAccessId]/
                └── route.ts  # Aggregazioni dashboard
```

**Note architetturali:**
- Layout separato `(viewer-portal)` senza sidebar workspace
- Autenticazione viewer indipendente (non workspace-based)
- URL con `viewerAccessId` come identificatore di sessione
- No navigation verso risorse interne workspace

### 2.2 Indicatori della Dashboard

#### Metriche principali (KPI Cards)

1. **Ore totali registrate**
   - Somma `durationMinutes` nel periodo selezionato
   - Conversione in formato ore:minuti (`XXh XXm`)
   - Fonte: `TimeEntry.durationMinutes`

2. **Giornate lavorate**
   - Count distinct `workDate` nel periodo
   - Indicazione giorni unici con attività
   - Fonte: `TimeEntry.workDate`

3. **Numero di attività**
   - Count totale `TimeEntry` nel periodo
   - Rappresenta il numero di registrazioni
   - Fonte: count `TimeEntry.id`

4. **Ore billable vs non-billable**
   - Somma separata per `billable = true/false`
   - Percentuale billable sul totale
   - Fonte: `TimeEntry.billable`, `durationMinutes`

5. **Media giornaliera**
   - Ore totali / giornate lavorate
   - Indica carico medio per giorno
   - Calcolato client-side

#### Indicatori secondari

6. **Anomalie pendenti**
   - Count `AnomalyReport` con `status = 'OPEN'`
   - Alert visivo se > 0
   - Fonte: `AnomalyReport.status`

7. **Ultime anomalie risolte**
   - Count `AnomalyReport` con `status = 'RESOLVED'` nel periodo
   - Feedback positivo su gestione segnalazioni
   - Fonte: `AnomalyReport.status`, `resolvedAt`

#### Visualizzazione temporale

**Grafico a barre giornaliere** (senza librerie esterne):
- Asse X: giorni del mese
- Asse Y: ore lavorate
- Implementazione: CSS Grid + div proporzionali
- Colori: billable (primario) vs non-billable (secondario)
- Tooltip al hover con dettagli giornata

**Alternativa minimalista:**
- Lista giornaliera con progress bar
- Simile a `MonthlyHours` esistente
- Più accessibile e responsive

### 2.3 Filtri temporali

```typescript
type ViewerDashboardFilters = {
  month: number;    // 1-12
  year: number;     // YYYY
}
```

**Funzionalità:**
- Selector mese corrente (default)
- Selector mesi precedenti (ultimi 12 mesi)
- Selector anno (ultimi 3 anni)
- Disabilitare periodi futuri
- Persistenza selezione in URL query params (`?month=10&year=2026`)

**Limitazioni:**
- No custom range (semplifica UX)
- No filtri per contratto (per requisito: "non mostrare contratti")
- No drill-down su singoli time entry

### 2.4 Sicurezza e autorizzazioni

**Validazioni server-side:**

```typescript
// src/application/timesheet-viewer/get-viewer-dashboard.ts
export async function getViewerDashboard(
  viewerAccessId: string,
  month: number,
  year: number,
  repositories: ViewerRepositories
): Promise<ViewerDashboardData> {
  // 1. Verificare viewer ACTIVE
  const viewer = await repositories.viewerAccess.getById(workspaceId, viewerAccessId);
  if (!viewer || viewer.status !== 'ACTIVE') {
    throw new ViewerAccessNotFoundError();
  }
  
  // 2. Recuperare contratti autorizzati
  const authorizedContracts = await repositories.viewerAccess.listAuthorizedContracts(
    workspaceId,
    viewerAccessId
  );
  
  if (authorizedContracts.length === 0) {
    throw new ViewerUnauthorizedError();
  }
  
  // 3. Calcolare periodo
  const period = calculateMonthPeriod(year, month, viewer.workspace.timezone);
  
  // 4. Recuperare time entries autorizzate
  const entries = await getAuthorizedTimeEntries(
    { workspaceId: viewer.workspaceId },
    viewerAccessId,
    { startDate: period.startDate, endDate: period.endDate },
    repositories.viewerAccess,
    repositories.timeEntries
  );
  
  // 5. Aggregare metriche
  return aggregateViewerDashboard(entries, authorizedContracts, period);
}
```

**Requisiti sicurezza:**
- ✅ Viewer deve essere ACTIVE (status check)
- ✅ Filtrare solo contratti autorizzati (lista autorizzazioni)
- ✅ No esposizione dati commerciali (rate, currency, billing model)
- ✅ No esposizione nomi/ID contratti
- ✅ Workspace isolation (via `workspaceId` del viewer)
- ✅ Revoca immediata: viewer REVOKED → 401 Unauthorized

**Dati non esposti:**
- `TimeEntry.snapshotRate`
- `TimeEntry.snapshotCurrency`
- `TimeEntry.snapshotBillingModel`
- `Contract.reference`, `Contract.rate`, ecc.
- `TimesheetViewerContract.contractId` (solo aggregazioni)
- `TimesheetViewerContract.displayLabel` (non usato in dashboard)

**Dati esposti:**
- `TimeEntry.workDate`
- `TimeEntry.durationMinutes`
- `TimeEntry.billable`
- `TimeEntry.description` (opzionale, se policy lo permette)
- `AnomalyReport.status`, `message`, `workDate`

### 2.5 Aggregazioni e computazioni

```typescript
export type ViewerDashboardData = {
  period: {
    month: number;
    year: number;
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    totalMinutes: number;
    billableMinutes: number;
    nonBillableMinutes: number;
    billablePercentage: number | null;
    workingDays: number;
    totalEntries: number;
    averageMinutesPerDay: number | null;
  };
  anomalies: {
    pendingCount: number;
    resolvedCount: number;
  };
  dailyBreakdown: Array<{
    workDate: Date;
    totalMinutes: number;
    billableMinutes: number;
    entriesCount: number;
  }>;
};
```

**Funzioni di aggregazione:**

```typescript
function aggregateViewerDashboard(
  entries: TimeEntryRecord[],
  authorizedContracts: TimesheetViewerContractRecord[],
  period: { startDate: Date; endDate: Date }
): ViewerDashboardData {
  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
  const billableMinutes = entries
    .filter(e => e.billable)
    .reduce((sum, e) => sum + e.durationMinutes, 0);
  
  const workingDays = new Set(entries.map(e => e.workDate.toISOString())).size;
  
  const dailyBreakdown = groupByDay(entries);
  
  return {
    period: { /* ... */ },
    metrics: {
      totalMinutes,
      billableMinutes,
      nonBillableMinutes: totalMinutes - billableMinutes,
      billablePercentage: totalMinutes > 0 ? (billableMinutes / totalMinutes) * 100 : null,
      workingDays,
      totalEntries: entries.length,
      averageMinutesPerDay: workingDays > 0 ? totalMinutes / workingDays : null,
    },
    anomalies: { /* fetch separate */ },
    dailyBreakdown,
  };
}
```

**Riuso codice esistente:**
- `AnalyticsService.formatDuration()` per formattazione ore
- `AnalyticsService.formatPercentage()` per percentuali
- `formatPeriodDisplay()` per display periodo
- Logica aggregazione simile a `MonthlyHoursAnalytics`

## 3. Componenti UI

### 3.1 Gerarchia componenti

```
ViewerDashboardPage (RSC)
├── ViewerDashboardHeader
│   ├── PeriodSelector (month/year)
│   └── ViewerInfo (optional: email, status badge)
├── ViewerMetricsGrid
│   ├── MetricCard (total hours)
│   ├── MetricCard (working days)
│   ├── MetricCard (entries count)
│   ├── MetricCard (billable %)
│   └── MetricCard (average/day)
├── AnomaliesAlert (if pending > 0)
├── DailyActivityChart
│   └── SimpleDailyBars
└── EmptyState (if no data)
```

### 3.2 Componenti riutilizzabili

**Da adattare:**
- `Card`, `CardHeader`, `CardContent` (da `@/components/ui/card`)
- `EmptyState` (già usato in dashboard interna)
- `PageHeader` (con style viewer-specific)
- Select/Dropdown per period selector

**Nuovi componenti:**
- `ViewerMetricCard` - KPI card semplificata
- `SimpleDailyBars` - grafico CSS-based (no libraries)
- `ViewerLayout` - layout wrapper per portale esterno

### 3.3 Grafico giornaliero semplificato

```tsx
// src/components/viewer-portal/SimpleDailyBars.tsx
export function SimpleDailyBars({ 
  dailyData 
}: { 
  dailyData: Array<{ workDate: Date; totalMinutes: number; billableMinutes: number }> 
}): JSX.Element {
  const maxMinutes = Math.max(...dailyData.map(d => d.totalMinutes));
  
  return (
    <div className="space-y-2">
      {dailyData.map(day => {
        const heightPercent = (day.totalMinutes / maxMinutes) * 100;
        const billablePercent = (day.billableMinutes / day.totalMinutes) * 100;
        
        return (
          <div key={day.workDate.toISOString()} className="flex items-center gap-2">
            <div className="w-16 text-sm text-muted-foreground">
              {formatDate(day.workDate, 'dd MMM')}
            </div>
            <div className="flex-1 flex items-center gap-1">
              <div 
                className="h-8 bg-primary rounded transition-all"
                style={{ width: `${heightPercent}%` }}
                title={`${formatDuration(day.totalMinutes)} (${billablePercent.toFixed(0)}% billable)`}
              />
              <span className="text-xs text-muted-foreground">
                {formatDuration(day.totalMinutes)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Vantaggi:**
- No dipendenze esterne
- Accessibile e responsive
- Performance ottimali
- Manutenibile

**Alternativa futura:**
- Se richiesto grafico più complesso, valutare `recharts` o `chart.js`
- Per ora: focus su MVP funzionale

## 4. Roadmap implementazione

### Fase 1: Infrastruttura base
- [ ] Creare layout `(viewer-portal)`
- [ ] Implementare autenticazione viewer (middleware)
- [ ] Creare `getViewerDashboard()` application service
- [ ] API route `/api/viewer-portal/dashboard/[viewerAccessId]`
- [ ] Test integrazione sicurezza

### Fase 2: Aggregazioni
- [ ] Funzioni aggregazione metriche
- [ ] Daily breakdown computation
- [ ] Anomaly count query
- [ ] Test unitari aggregazioni
- [ ] Validazione autorizzazioni

### Fase 3: UI Components
- [ ] `ViewerLayout` base
- [ ] `ViewerMetricCard` componente
- [ ] `PeriodSelector` (month/year)
- [ ] `SimpleDailyBars` grafico
- [ ] `AnomaliesAlert` badge

### Fase 4: Dashboard page
- [ ] `/viewer-portal/dashboard/page.tsx` RSC
- [ ] Integrazione componenti
- [ ] Empty state
- [ ] Error handling
- [ ] Loading states

### Fase 5: Polish & Test
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Accessibility audit (ARIA labels, keyboard nav)
- [ ] E2E test Playwright
- [ ] Performance testing (time to interactive)
- [ ] Documentation viewer-facing

## 5. Considerazioni aggiuntive

### 5.1 Navigazione portale

**Menu viewer:**
- Dashboard (home)
- Segnala anomalia (link a form)
- Logout

**No accesso a:**
- Time entry detail (evitare drill-down sensibili)
- Lista contratti (per requisito)
- Analytics avanzate
- Workspace settings

### 5.2 Anomalie

**Display in dashboard:**
- Count badge "X anomalie in sospeso"
- Link a `/viewer-portal/anomalies`
- No dettagli inline (mantenere dashboard pulita)

**Future enhancement:**
- Form inline per creare anomalia
- Timeline anomalie risolte

### 5.3 Branding e personalizzazione

**Future:**
- Logo workspace (se disponibile)
- Custom color scheme per viewer portal
- Email notifiche viewer (nuova entry, anomalia risolta)
- Export PDF timesheet (viewer-scoped)

### 5.4 Performance

**Ottimizzazioni:**
- Cache server-side per dashboard data (5 min TTL)
- Parallel fetching: time entries + anomalies
- Index database su `viewerAccessId + workDate`
- Pagination se daily breakdown > 90 giorni

**Benchmark target:**
- Initial load < 2s
- Month switch < 500ms
- No N+1 queries

### 5.5 Evoluzioni future

**V2 features:**
- Export CSV time entries
- Grafici settimanali/mensili a scelta
- Notifiche email su nuove entry
- Multi-language (i18n)
- Dark mode

**Out of scope MVP:**
- Confronto periodi (trend)
- Filtri per billable/non-billable
- Search/filter time entries
- Mobile app native

## 6. Schema implementativo finale

```typescript
// src/application/timesheet-viewer/get-viewer-dashboard.ts
export async function getViewerDashboard(
  viewerAccessId: string,
  month: number,
  year: number,
  repositories: {
    viewerAccess: ViewerAccessRepository;
    timeEntries: TimeEntryRepository;
    anomalyReports: AnomalyReportRepository;
  }
): Promise<ViewerDashboardData>

// src/app/(viewer-portal)/dashboard/page.tsx
export default async function ViewerDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ viewerAccessId: string; month?: string; year?: string }>
}): Promise<JSX.Element>

// src/app/api/viewer-portal/dashboard/[viewerAccessId]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ viewerAccessId: string }> }
): Promise<Response>
```

**Note:**
- Preferire RSC con server-side data fetching
- Minimizzare client-side JavaScript
- Validare tutti gli input (month 1-12, year reasonabile)
- Rate limiting su API viewer (evitare abuse)

---

## 7. Riepilogo decisioni chiave

✅ **Layout separato** `(viewer-portal)` per isolamento completo

✅ **No librerie grafiche** - grafico CSS-based per MVP

✅ **No drill-down contratti** - solo aggregazioni anonime

✅ **Filtri temporali**: solo mese/anno (no custom range)

✅ **Metriche core**: ore, giorni, entries, billable%, media

✅ **Sicurezza first**: validazione viewer ACTIVE, filtraggio contratti, no dati commerciali

✅ **Riuso codice**: formatter da `AnalyticsService`, pattern da dashboard interna

✅ **Accessibilità**: ARIA labels, keyboard navigation, screen reader friendly

✅ **Performance**: RSC, server-side aggregation, parallel fetching

---

**Prossimi step:** Approvazione design e inizio Fase 1 implementazione.
