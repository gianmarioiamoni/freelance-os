# FreelanceOS

FreelanceOS è un'applicazione web per la gestione operativa del freelance: tempo, clienti, contratti, fatture, pagamenti e analisi finanziaria.

## Stato del progetto

Il prodotto è in produzione. La release R2.2 **Revenue Operations Visibility** (`docs/release/r2.2-certification.md`) è COMPLETA. Deployment corrente su Vercel: `d1cdac1` (branch `main`).

L'applicazione è disponibile all'indirizzo di produzione configurato nel deployment Vercel. Per dettagli su pianificazione, architettura e stato delle funzionalità, consultare [`MASTER_PLAN.md`](./MASTER_PLAN.md) e la directory `docs/`.

La suite di test unitari passa (153 file, 1112 test). I test di integrazione Prisma e i test E2E Playwright sono configurati e disponibili.

## Funzionalità principali

### Gestione operativa
- **Dashboard**: panoramica mensile con ore lavorate, ore fatturabili, revenue accrued/invoiced/paid/outstanding e utilizzo capacità contrattuale.
- **Clienti**: gestione anagrafica (nome azienda, contatti, P.IVA, codice fiscale, indirizzo, note) con stato ACTIVE/ARCHIVED e visualizzazione dello storico contratti.
- **Contratti**: definizione di contratti con modello di billing (orario/giornaliero), tariffa, valuta, periodo di validità, modalità di commitment (percentuale o ore totali) e budget allocato.
- **Time Tracking**: registrazione time entry con data, durata, cliente, contratto, descrizione e flag billable. Vista giornaliera e settimanale con navigazione temporale. Snapshot al momento della registrazione di billing model, tariffa e valuta per storicizzazione coerente.
- **Fatture**: tracciamento fatture per contratto con data fattura, importo, valuta, riferimento, termini di pagamento e scadenza. Soft-delete con campo `voidedAt`.
- **Pagamenti**: registrazione pagamenti su fatture con data, importo, valuta e note.
- **Notifiche e Alert**: sistema di notifiche utente e alert di sistema per avvertenze su contratti, capacità mensile, fatturazione, pagamenti e allocazioni.

### Analisi e reporting
- **Revenue Overview**: vista riassuntiva di Accrued, Expected, Forecast, Invoiced, Paid, Outstanding su periodo selezionato.
- **Reports**: analisi ore per cliente, report mensili timesheet, tabelle contrattuali con allocazione e utilizzo.
- **Invoices**: pagina `/invoices` con filtro temporale, riepilogo revenue e tabella fatture. Export report in CSV, Excel (XLSX) e PDF.
- **Annual Invoice & Cash Report**: report annuale con totale fatturato e incassato per anno, esportabile in CSV/XLSX.

### AI Assistant
- **AI Assistant** (`/assistant`): interfaccia conversazionale per interrogare i dati di analytics del workspace (revenue, ore, contratti) tramite linguaggio naturale. Supporto provider AI configurabile (attualmente Null in produzione; provider Anthropic Claude Haiku 4.5 certificato ma non abilitato).

### Autenticazione e workspace
- **Autenticazione**: email/password, Google OAuth (Better Auth 1.7.4), recupero password tramite email con delivery mode configurabile (development, test, production via Gmail SMTP).
- **Onboarding**: flusso di creazione primo workspace dopo registrazione.
- **Workspace**: isolamento dati per workspace, membri con ruolo OWNER/MEMBER.
- **Admin**: interfaccia `/admin` riservata (accesso basato su `ADMIN_GOOGLE_EMAIL`) per gestione utenti (disable, enable, delete) indipendente da workspace. Richiede autenticazione Google.

### Configurazione workspace
- **Settings**: configurazione timezone, valuta, soglie di warning per utilizzo contratti e capacità mensile.

## Stack tecnologico

| Tecnologia              | Versione       | Ruolo                                                  |
| ----------------------- | -------------- | ------------------------------------------------------ |
| **Next.js**             | 15.5.25        | Framework React (App Router, RSC/SSR, Turbopack)       |
| **TypeScript**          | 5.9.3          | Linguaggio tipizzato                                   |
| **React**               | 19.1.0         | Libreria UI                                            |
| **Prisma**              | 6.19.3         | ORM, schema modeling e migrazioni                      |
| **PostgreSQL**          | 17 (≥16)       | Database relazionale (Neon per produzione)             |
| **Better Auth**         | 1.7.4          | Autenticazione (email/password, Google OAuth, session) |
| **Tailwind CSS**        | 4.3.3          | Styling                                                |
| **Shadcn UI / Radix UI**| —              | Componenti UI                                          |
| **Vitest**              | 4.1.11         | Test unitari                                           |
| **Playwright**          | 1.63.0         | Test E2E                                               |
| **Vercel**              | —              | Piattaforma di deployment e hosting                    |
| **Neon**                | —              | PostgreSQL serverless per produzione                   |

## Prerequisiti

- **Node.js** ≥ 20 (CI e sviluppo locale: Node.js 20)
- **pnpm** ≥ 10 (`packageManager: pnpm@10.22.0` in `package.json`)
- **PostgreSQL** 17 (per sviluppo locale; compatibile ≥16)

PostgreSQL locale può essere gestito tramite Homebrew (`postgresql@17`) o qualsiasi altra installazione locale ≥16. È necessario disporre di due database separati: uno per lo sviluppo (`freelance_os`) e uno per i test (`freelanceos_test`).

## Avvio locale

### 1. Installare le dipendenze

```bash
pnpm install
```

L'hook `postinstall` esegue automaticamente `prisma generate`.

### 2. Configurare le variabili d'ambiente

Copiare il template `.env.example` in `.env`:

```bash
cp .env.example .env
```

Modificare `.env` con i valori locali. Le variabili **obbligatorie** per lo sviluppo locale sono:

- `DATABASE_URL`: stringa di connessione PostgreSQL per il database di sviluppo.
- `TEST_DATABASE_URL`: stringa di connessione PostgreSQL per il database di test (deve essere un database separato il cui nome termina in `_test`).
- `BETTER_AUTH_SECRET`: chiave segreta per Better Auth (≥32 caratteri; generabile con `openssl rand -base64 32`).
- `BETTER_AUTH_URL`: URL base dell'applicazione (es. `http://localhost:3000` per sviluppo locale).

Variabili **opzionali** per sviluppo locale:

- `AUTH_EMAIL_DELIVERY`: modalità di invio email (`development`, `test`, `production`). Default in sviluppo: `development`.
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`: credenziali Google OAuth (opzionali localmente, obbligatorie in produzione).
- `ADMIN_GOOGLE_EMAIL`: email dell'account Google autorizzato come Admin (opzionale; se non impostata, l'accesso `/admin` è negato).

Variabili necessarie **solo in produzione** (Vercel):

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`: configurazione Gmail SMTP per l'invio email di recupero password in produzione.
- `AI_PRODUCTION_ENABLED`, `AI_PRODUCTION_BASE_URL`, `AI_PRODUCTION_API_KEY`, `AI_PRODUCTION_MODEL`: configurazione AI production provider (attualmente non abilitato; provider certificato: Anthropic Claude Haiku 4.5).

**Non inserire credenziali reali, token, chiavi API o URL di produzione in `.env.example`. Non committare `.env`.**

### 3. Creare i database PostgreSQL locali

Avviare PostgreSQL e creare i database:

```bash
brew services start postgresql@17
createdb freelance_os
createdb freelanceos_test
```

### 4. Applicare le migrazioni

Applicare le migrazioni Prisma ai database:

```bash
pnpm db:migrate:deploy
pnpm test:db:migrate
```

`pnpm db:migrate:deploy` applica le migrazioni committate al database di sviluppo (`DATABASE_URL`). `pnpm test:db:migrate` applica le stesse migrazioni al database di test (`TEST_DATABASE_URL`).

### 5. Popolamento dati di sviluppo (opzionale)

Applicare il seed deterministico per dati di esempio:

```bash
pnpm db:seed
```

### 6. Avviare il server di sviluppo

```bash
pnpm dev
```

L'applicazione sarà disponibile su `http://localhost:3000`.

## Variabili d'ambiente

Tutte le variabili d'ambiente sono **server-only**. Non usare mai il prefisso `NEXT_PUBLIC_`.

### Variabili obbligatorie in produzione (Vercel)

| Variabile                 | Descrizione                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | Stringa di connessione PostgreSQL (Neon in produzione)                                          |
| `BETTER_AUTH_SECRET`      | Chiave segreta Better Auth (≥32 caratteri)                                                      |
| `BETTER_AUTH_URL`         | URL base applicazione (es. `https://your-app.vercel.app`)                                       |
| `GOOGLE_CLIENT_ID`        | Client ID Google OAuth                                                                          |
| `GOOGLE_CLIENT_SECRET`    | Client Secret Google OAuth                                                                      |
| `SMTP_HOST`               | Host SMTP Gmail per recupero password                                                           |
| `SMTP_PORT`               | Porta SMTP                                                                                      |
| `SMTP_SECURE`             | `true`/`false` per TLS                                                                          |
| `SMTP_USER`               | Utente SMTP (email Gmail)                                                                       |
| `SMTP_PASSWORD`           | Password applicazione Gmail per SMTP                                                            |

### Variabili opzionali (tutti gli ambienti)

| Variabile                 | Descrizione                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `AUTH_EMAIL_DELIVERY`     | Modalità invio email (`development`, `test`, `production`). Default: `development` locale.      |
| `ADMIN_GOOGLE_EMAIL`      | Email Google autorizzata come Admin. Se assente, accesso `/admin` negato.                       |

### Variabili locali / test (mai in produzione)

| Variabile                 | Descrizione                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `TEST_DATABASE_URL`       | Database PostgreSQL isolato per test (nome deve terminare in `_test`)                          |

### Variabili E2E (mai in produzione)

| Variabile                 | Descrizione                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `AUTH_E2E_RUNTIME`        | Injected da Playwright (`true`) per isolare i rate limit Better Auth durante E2E               |

### Variabili AI provider evaluation (mai in produzione; ignorate dal resolver production)

| Variabile                 | Descrizione                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `AI_EVAL_ENABLED`         | Abilita provider AI di valutazione (solo per test provider)                                     |
| `AI_EVAL_BASE_URL`        | Base URL del provider AI di valutazione                                                         |
| `AI_EVAL_API_KEY`         | API Key del provider AI di valutazione                                                          |
| `AI_EVAL_MODEL`           | Modello AI di valutazione                                                                       |

### Variabili AI production provider (produzione; attualmente non abilitate)

| Variabile                 | Descrizione                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `AI_PRODUCTION_ENABLED`   | Abilita AI in produzione (`true`). Default: `false` (Null adapter)                              |
| `AI_PRODUCTION_BASE_URL`  | Base URL Anthropic API (`https://api.anthropic.com/v1`)                                         |
| `AI_PRODUCTION_API_KEY`   | API Key Anthropic                                                                               |
| `AI_PRODUCTION_MODEL`     | Modello certificato: `claude-haiku-4-5-20251001`                                                 |

**Note**: se `AI_PRODUCTION_ENABLED` non è `true` o mancano variabili richieste, il resolver restituisce Null adapter e `/assistant` non esegue chiamate AI reali.

## Comandi utili

### Sviluppo e server

| Comando                     | Descrizione                                                                 |
| --------------------------- | --------------------------------------------------------------------------- |
| `pnpm dev`                  | Avvia il server di sviluppo (Next.js con Turbopack)                         |
| `pnpm build`                | Crea la build di produzione                                                 |
| `pnpm start`                | Avvia il server di produzione (dopo `pnpm build`)                           |

### Controllo qualità codice

| Comando                     | Descrizione                                                                 |
| --------------------------- | --------------------------------------------------------------------------- |
| `pnpm lint`                 | Esegue ESLint sul codice                                                    |
| `pnpm typecheck`            | Esegue il controllo dei tipi TypeScript (`tsc --noEmit`)                    |
| `pnpm format`               | Formatta il codice con Prettier                                             |

### Test

| Comando                     | Descrizione                                                                 |
| --------------------------- | --------------------------------------------------------------------------- |
| `pnpm test`                 | Esegue i test unitari (Vitest)                                              |
| `pnpm test:watch`           | Esegue i test unitari in modalità watch                                     |
| `pnpm test:integration`     | Esegue i test di integrazione Prisma (contro `TEST_DATABASE_URL`)           |
| `pnpm test:db:migrate`      | Applica le migrazioni committate al database di test                        |
| `pnpm test:e2e`             | Esegue i test E2E Playwright (avvia `pnpm dev` contro `TEST_DATABASE_URL`) |
| `pnpm test:e2e:start`       | Esegue i test E2E con server production-like (`pnpm start`)                 |

### Prisma e database

| Comando                     | Descrizione                                                                 |
| --------------------------- | --------------------------------------------------------------------------- |
| `pnpm db:generate`          | Genera il Prisma Client (chiamato automaticamente da `postinstall`)         |
| `pnpm db:migrate`           | Crea e applica una nuova migrazione di sviluppo (`prisma migrate dev`)      |
| `pnpm db:migrate:deploy`    | Applica le migrazioni committate (`prisma migrate deploy`)                  |
| `pnpm db:reset`             | Reset del database locale e replay migrazioni. **Solo sviluppo locale**     |
| `pnpm db:seed`              | Applica il seed deterministico di sviluppo                                  |

**Attenzione**: `pnpm db:reset`, `pnpm db:reset-local` e `pnpm db:reset-data` sono comandi **distruttivi** e devono essere usati **esclusivamente in ambiente di sviluppo locale**. Non eseguirli mai su database di produzione.

## Architettura e struttura del progetto

```text
freelance-os/
├── README.md                   # Questo file
├── MASTER_PLAN.md              # Piano di progetto, stato release, roadmap
├── CHANGELOG.md                # Registro modifiche
├── docs/                       # Documentazione tecnica e release
│   ├── architecture.md
│   ├── admin-architecture.md
│   ├── domain-model.md
│   ├── testing-strategy.md
│   ├── epics/
│   ├── release/
│   ├── qa/
│   └── ux/
├── src/                        # Codice sorgente applicazione
│   ├── app/                    # Next.js App Router (pagine e layout)
│   │   ├── (app)/              # Route autenticate (workspace-dependent)
│   │   ├── (auth)/             # Route autenticazione (sign-in, sign-up)
│   │   ├── (public)/           # Route pubbliche (landing)
│   │   ├── (public-auth)/      # Route pubbliche autenticazione (reset password)
│   │   ├── (workspace-gate)/   # Route di onboarding workspace
│   │   └── (admin)/            # Route amministratore
│   ├── features/               # Funzionalità applicative organizzate per dominio
│   ├── components/             # Componenti UI riutilizzabili
│   ├── domain/                 # Modelli di dominio e logica business
│   ├── application/            # Application services e use case
│   ├── infrastructure/         # Persistenza, auth, workspace context
│   └── lib/                    # Utility, helpers e configurazioni
├── prisma/
│   ├── schema.prisma           # Schema Prisma (modelli e Better Auth)
│   ├── prisma.config.ts        # Configurazione Prisma (seed)
│   ├── migrations/             # Migrazioni SQL committate
│   └── seed.ts                 # Script seed di sviluppo
├── scripts/                    # Script amministrativi e diagnostici
├── tests/
│   ├── unit/                   # Test unitari (Vitest)
│   ├── integration/            # Test integrazione Prisma (Vitest)
│   └── e2e/                    # Test E2E (Playwright)
├── public/                     # Asset statici pubblici
├── .github/
│   └── workflows/
│       └── quality.yml         # Workflow CI per lint, typecheck, test, E2E
├── vercel.json                 # Configurazione Vercel deployment
├── package.json
├── pnpm-lock.yaml
└── .env.example                # Template variabili d'ambiente
```

L'applicazione adotta un'architettura a layer: **domain** (modelli e business logic), **application** (use case e orchestrazione), **infrastructure** (persistenza, auth, workspace), **features** (UI e interazioni specifiche) e **components** (UI riutilizzabili).

Il database è modellato in Prisma con isolamento workspace: tutte le entità applicative sono isolate per `workspaceId`. Better Auth gestisce autonomamente `User`, `Session`, `Account`, `Verification`.

## Database e migrazioni

### Flusso di sviluppo

1. Modifica `prisma/schema.prisma`.
2. Crea e applica una nuova migrazione di sviluppo:

   ```bash
   pnpm db:migrate
   ```

   Questo comando genera automaticamente la migrazione SQL, l'applica al database locale e rigenera il Prisma Client.

3. Verifica lo stato delle migrazioni:

   ```bash
   npx prisma migrate status
   ```

### Applicazione migrazioni in ambiente locale

Per applicare le migrazioni committate al database locale senza crearne di nuove:

```bash
pnpm db:migrate:deploy
```

### Applicazione migrazioni in produzione

Le migrazioni in produzione sono applicate automaticamente durante il deployment Vercel tramite `vercel.json`:

```json
{
  "buildCommand": "pnpm exec prisma generate && pnpm exec prisma migrate deploy && pnpm build"
}
```

`prisma migrate deploy` applica esclusivamente le migrazioni committate e non create di nuove. È sicuro per la produzione.

**Note di sicurezza**:

- **Non eseguire mai `prisma migrate dev` in produzione**: questo comando crea migrazioni di sviluppo e può causare perdita di dati.
- **Non eseguire mai `prisma db push` su database di produzione**: bypassa il sistema di migrazioni e può causare perdita di dati.
- **Non eseguire mai script di reset distruttivi (`pnpm db:reset`, `scripts/full-neon-reset.ts`, `scripts/reset-database-data.ts`) in produzione**: questi comandi eliminano irreversibilmente tutti i dati.

I comandi di reset database sono disponibili **esclusivamente per sviluppo locale** e devono essere eseguiti con massima cautela. Verificare sempre di operare sul database locale prima di eseguirli.

## Deploy in produzione

### Requisiti di produzione

- Account Vercel con progetto configurato per il repository GitHub.
- Database PostgreSQL di produzione (Neon).
- Tutte le variabili d'ambiente obbligatorie configurate in Vercel (vedi sezione [Variabili d'ambiente](#variabili-d'ambiente)).
- Configurazione Google OAuth con authorized redirect URI `${BETTER_AUTH_URL}/api/auth/callback/google` (es. `https://your-app.vercel.app/api/auth/callback/google`).
- Configurazione Gmail SMTP per password recovery (variabili `SMTP_*`).

### Flusso di deployment

1. **Push su branch `main`**: il deployment Vercel si attiva automaticamente su push a `main`.
2. **Build command**: definito in `vercel.json`:
   ```bash
   pnpm exec prisma generate && pnpm exec prisma migrate deploy && pnpm build
   ```
3. **Applicazione migrazioni**: `prisma migrate deploy` applica automaticamente le migrazioni committate al database di produzione prima della build.
4. **Verifica deployment**: controllare i log Vercel per confermare il successo del deployment e l'assenza di errori di migrazione.

### Verifica stato deployment corrente

Deployment corrente: `d1cdac1` (branch `main`).

Per verificare lo stato delle migrazioni in produzione, connettersi al database Neon e controllare la tabella `_prisma_migrations` oppure eseguire `prisma migrate status` con `DATABASE_URL` di produzione (da locale, con le credenziali corrette).

**Attenzione**: non eseguire comandi di migrazione direttamente sul database di produzione al di fuori del processo di deployment automatico Vercel.

## Sicurezza e buone pratiche

### Gestione segreti e credenziali

- **Non committare mai** file `.env`, credenziali, token, chiavi API o URL di produzione nel repository.
- Usare `.env.example` come template **senza valori reali**.
- Tutte le variabili d'ambiente sono **server-only**: non usare mai `NEXT_PUBLIC_` per segreti o credenziali.
- Generare `BETTER_AUTH_SECRET` con un valore robusto (≥32 caratteri):
  ```bash
  openssl rand -base64 32
  ```
- Conservare i segreti di produzione esclusivamente in Vercel Environment Variables.
- Non esporre `DATABASE_URL` o altre credenziali in log pubblici o errori client-side.

### Protezione database di produzione

- **Non eseguire mai** comandi distruttivi (`db:reset`, script di reset) sul database di produzione.
- **Non usare** `prisma migrate dev` o `prisma db push` in produzione.
- Verificare sempre l'ambiente prima di eseguire comandi amministrativi o script diagnostici.
- I test (`test:integration`, `test:e2e`) rifiutano esplicitamente il database di sviluppo (`freelance_os`) per prevenire perdite di dati accidentali.

### Migrazioni in produzione

- Le migrazioni in produzione sono applicate automaticamente dal processo di build Vercel tramite `prisma migrate deploy`.
- `prisma migrate deploy` applica esclusivamente le migrazioni committate, non ne crea di nuove.
- Testare sempre le migrazioni in locale e in ambiente di staging prima di fare push su `main`.
- Monitorare i log Vercel durante il deployment per verificare il successo delle migrazioni.

### Autenticazione e autorizzazione

- Better Auth gestisce sessioni server-side. Le sessioni sono validate a ogni richiesta su route protette.
- Google OAuth richiede `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`. Configurare authorized redirect URI in Google Cloud Console.
- Admin access (`/admin`) è riservato all'account Google specificato in `ADMIN_GOOGLE_EMAIL`. Se la variabile non è impostata, l'accesso è negato a tutti.
- Password recovery richiede configurazione SMTP in produzione (`SMTP_*` variabili). Se mancano, la richiesta viene riconosciuta ma l'email non viene inviata.

### Email delivery e testing

- **Development**: `AUTH_EMAIL_DELIVERY=development` non invia email e non logga token o URL di reset. I token possono essere ispezionati nella tabella `verification` di Better Auth.
- **Test**: `AUTH_EMAIL_DELIVERY=test` cattura le email in un processo-local store per test automatizzati (E2E).
- **Production**: `AUTH_EMAIL_DELIVERY=production` invia email tramite Gmail SMTP quando tutte le variabili `SMTP_*` sono configurate. Se una è mancante, la richiesta è riconosciuta e l'email non viene inviata.

## Test e controlli di qualità

### Test unitari

153 file di test, 1112 test passati, 1 test skipped.

Esegui i test unitari con:

```bash
pnpm test
```

Per eseguire i test in modalità watch:

```bash
pnpm test:watch
```

### Test di integrazione Prisma

I test di integrazione verificano la persistenza reale su PostgreSQL contro `TEST_DATABASE_URL`.

Esegui i test di integrazione con:

```bash
pnpm test:integration
```

Prima di eseguire i test di integrazione, assicurati che il database di test sia aggiornato:

```bash
pnpm test:db:migrate
```

### Test E2E Playwright

I test E2E coprono landing page, autenticazione, onboarding, gestione clienti, contratti, time tracking, dashboard e accessibilità.

Esegui i test E2E con:

```bash
pnpm test:e2e
```

Per eseguire i test E2E in modalità production-like (dopo build):

```bash
pnpm build
pnpm test:e2e:start
```

**Nota**: i test E2E utilizzano `TEST_DATABASE_URL` e rifiutano di eseguire su `freelance_os` per prevenire perdite di dati.

### Continuous Integration

Il workflow GitHub Actions `.github/workflows/quality.yml` esegue automaticamente su ogni push:

1. Avvio PostgreSQL 17
2. Validazione e generazione Prisma Client
3. Applicazione migrazioni
4. ESLint
5. TypeScript typecheck
6. Test unitari
7. Test di integrazione
8. Build produzione
9. Test E2E Playwright (1 worker, contro `pnpm dev`)

CI non richiede credenziali Google OAuth o configurazione mailer di produzione.

## Contribuire

Questo progetto adotta TypeScript strict mode, ESLint, Prettier e una suite di test automatizzati.

Per contribuire:

1. Clonare il repository e installare le dipendenze (`pnpm install`).
2. Configurare `.env` locale con `DATABASE_URL`, `TEST_DATABASE_URL`, `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL`.
3. Applicare le migrazioni (`pnpm db:migrate:deploy` e `pnpm test:db:migrate`).
4. Creare un branch per la feature o bugfix.
5. Scrivere test per le nuove funzionalità (TDD preferito).
6. Verificare che lint, typecheck e tutti i test passino localmente:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm test:integration
   pnpm build
   pnpm test:e2e
   ```
7. Committare le modifiche con messaggi descrittivi.
8. Aprire una Pull Request su GitHub.

CI eseguirà automaticamente tutti i controlli di qualità.

### Stile di codice

- Utilizzare TypeScript strict mode (no `any`).
- Seguire le convenzioni di naming: `PascalCase` per componenti e tipi, `camelCase` per variabili e funzioni.
- Preferire programmazione funzionale e dichiarativa. Non usare classi per componenti React.
- Componenti React: usare `function ComponentName(props: Props): JSX.Element {}` (no arrow functions per componenti).
- Applicare SOLID principles, con particolare attenzione al Single Responsibility Principle.
- Scrivere test per logica business, use case e componenti UI critici.
- Formattare il codice con Prettier (`pnpm format`).

### Documentazione

La documentazione tecnica è disponibile nella directory `docs/`:

- `architecture.md`: architettura applicativa e decisioni tecniche.
- `admin-architecture.md`: architettura admin user management.
- `domain-model.md`: modello di dominio e regole business.
- `testing-strategy.md`: strategia di test.
- `epics/`: documentazione per epic implementate.
- `release/`: documentazione release, certification e production readiness.

Consultare [`MASTER_PLAN.md`](./MASTER_PLAN.md) per pianificazione, stato release e roadmap.

## Licenza

Questo progetto è privato. Consultare i termini di licenza concordati con il proprietario del repository.

## Contatti

Per domande o supporto, contattare il maintainer del progetto tramite GitHub Issues o email.

---

**Note finali**:

- Questo README documenta lo stato attuale del progetto verificabile dal codice, configurazione e suite di test.
- Le funzionalità descritte sono effettivamente implementate e disponibili.
- I comandi e gli script documentati corrispondono a quanto presente in `package.json` e nel repository.
- Le variabili d'ambiente elencate sono verificate da `.env.example` e dal codice applicativo.
- Nessun segreto, credenziale o URL di produzione è incluso in questo documento.
