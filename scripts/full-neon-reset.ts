
/**
 * scripts/full-neon-reset.ts
 *
 * DISTRUTTIVO: elimina tutti i dati applicativi dalle tabelle autorizzate.
 * Mantiene lo schema e _prisma_migrations.
 *
 * Esecuzione:
 *   pnpm exec tsx scripts/full-neon-reset.ts
 *
 * DATABASE_URL deve essere impostata nell'ambiente, senza stamparla.
 */

import { Client } from "pg";
import * as readline from "node:readline";

const EXPECTED_HOSTNAME =
  "ep-empty-forest-b1xxzkrr-pooler.c-5.eu-central-1.aws.neon.tech";
const EXPECTED_DATABASE = "freelanceos";
const MIGRATIONS_TABLE = "_prisma_migrations";
const CONFIRMATION = "WIPE ALL PRODUCTION DATA";

const APPLICATION_TABLES = [
  "verification",
  "session",
  "account",
  "user",
  "AdminAction",
  "Notification",
  "Alert",
  "Payment",
  "Invoice",
  "TimeEntry",
  "Contract",
  "WorkspaceSettings",
  "Client",
  "WorkspaceMember",
  "Workspace",
] as const;

const SYSTEM_TABLES = [MIGRATIONS_TABLE] as const;
const AUTHORIZED_TABLES = [
  ...APPLICATION_TABLES,
  ...SYSTEM_TABLES,
] as const;

type ForeignKey = {
  source_schema: string;
  source_table: string;
  target_schema: string;
  target_table: string;
  constraint_name: string;
};

type TableCount = {
  table: string;
  count: number;
};

function quoteIdentifier(identifier: string): string {
  // Le tabelle vengono anche verificate rispetto a una allowlist.
  return `"${identifier.replace(/"/g, '""')}"`;
}

function askConfirmation(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function fail(message: string): never {
  throw new Error(message);
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function getMigrationSnapshot(client: Client): Promise<unknown[]> {
  const result = await client.query(`
    SELECT row_to_json(m) AS migration_row
    FROM public."_prisma_migrations" AS m
    ORDER BY m.migration_name, m.started_at, m.id
  `);

  return result.rows.map((row) => row.migration_row);
}

async function getPublicTables(client: Client): Promise<string[]> {
  const result = await client.query<{ tablename: string }>(`
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
    ORDER BY c.relname
  `);

  return result.rows.map((row) => row.tablename);
}

async function getForeignKeys(client: Client): Promise<ForeignKey[]> {
  const result = await client.query<ForeignKey>(`
    SELECT
      source_ns.nspname AS source_schema,
      source_table.relname AS source_table,
      target_ns.nspname AS target_schema,
      target_table.relname AS target_table,
      constraint_info.conname AS constraint_name
    FROM pg_constraint AS constraint_info
    JOIN pg_class AS source_table
      ON source_table.oid = constraint_info.conrelid
    JOIN pg_namespace AS source_ns
      ON source_ns.oid = source_table.relnamespace
    JOIN pg_class AS target_table
      ON target_table.oid = constraint_info.confrelid
    JOIN pg_namespace AS target_ns
      ON target_ns.oid = target_table.relnamespace
    WHERE constraint_info.contype = 'f'
      AND (
        source_ns.nspname = 'public'
        OR target_ns.nspname = 'public'
      )
    ORDER BY
      source_ns.nspname,
      source_table.relname,
      constraint_info.conname
  `);

  return result.rows;
}

/**
 * Restituisce l'ordine di DELETE dal figlio al genitore.
 *
 * Una FK A -> B significa che A dipende da B:
 * A deve essere cancellata prima di B.
 *
 * Il DFS produce inizialmente un ordine genitore-prima-del-figlio;
 * l'inversione finale produce figlio-prima-del-genitore.
 * In presenza di cicli lo script si ferma prima di iniziare la
 * transazione distruttiva.
 */
function computeDeletionOrder(foreignKeys: ForeignKey[]): string[] {
  const authorized = new Set<string>(APPLICATION_TABLES);
  const dependsOn = new Map<string, Set<string>>();

  for (const table of APPLICATION_TABLES) {
    dependsOn.set(table, new Set());
  }

  for (const fk of foreignKeys) {
    const sourceIsPublic = fk.source_schema === "public";
    const targetIsPublic = fk.target_schema === "public";
    const sourceAuthorized = authorized.has(fk.source_table);
    const targetAuthorized = authorized.has(fk.target_table);
    const sourceSystem = (SYSTEM_TABLES as readonly string[]).includes(
      fk.source_table,
    );
    const targetSystem = (SYSTEM_TABLES as readonly string[]).includes(
      fk.target_table,
    );

    // Non accettiamo FK che attraversino schemi o tabelle non autorizzati.
    if (
      !sourceIsPublic ||
      !targetIsPublic ||
      (!sourceAuthorized && !sourceSystem) ||
      (!targetAuthorized && !targetSystem)
    ) {
      fail(
        `FK fuori dal perimetro autorizzato: ` +
        `${fk.source_schema}.${fk.source_table} ` +
        `(${fk.constraint_name}) -> ` +
        `${fk.target_schema}.${fk.target_table}`,
      );
    }

    // _prisma_migrations non viene mai cancellata. Se una tabella
    // di sistema dipende da una tabella applicativa, interrompiamo.
    if (sourceSystem && !targetSystem) {
      fail(
        `La tabella di sistema ${fk.source_table} dipende dalla tabella ` +
        `applicativa ${fk.target_table}; reset annullato.`,
      );
    }

    // Per il grafo consideriamo solo FK fra tabelle applicative.
    if (
      !sourceSystem &&
      !targetSystem &&
      fk.source_table !== fk.target_table
    ) {
      dependsOn.get(fk.source_table)!.add(fk.target_table);
    }

    // Le FK autoriferite vengono considerate cicli non gestibili:
    // preferiamo interrompere anziché assumere che siano sicure.
    if (
      !sourceSystem &&
      !targetSystem &&
      fk.source_table === fk.target_table
    ) {
      fail(
        `FK autoriferita non supportata: ` +
        `${fk.source_table}.${fk.constraint_name}`,
      );
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const parentFirstOrder: string[] = [];

  function visit(table: string, path: string[]): void {
    if (visited.has(table)) return;

    if (visiting.has(table)) {
      fail(
        `Dipendenza circolare rilevata: ${[...path, table].join(" -> ")}`,
      );
    }

    visiting.add(table);

    const dependencies = dependsOn.get(table) || new Set<string>();
    const dependenciesArray = Array.from(dependencies);
    for (const dependency of dependenciesArray) {
      visit(dependency, [...path, table]);
    }

    visiting.delete(table);
    visited.add(table);
    parentFirstOrder.push(table);
  }

  for (const table of APPLICATION_TABLES) {
    visit(table, []);
  }

  return parentFirstOrder.reverse();
}

async function countRows(
  client: Client,
  table: string,
): Promise<number> {
  if (!(APPLICATION_TABLES as readonly string[]).includes(table)) {
    fail(`Tabella non autorizzata per il conteggio: ${table}`);
  }

  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM public.${quoteIdentifier(table)}`,
  );

  return Number(result.rows[0].count);
}

async function fullReset(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    fail("DATABASE_URL non impostata. Nessuna operazione eseguita.");
  }

  let url: URL;

  try {
    url = new URL(databaseUrl);
  } catch {
    fail("DATABASE_URL non è un URL valido. Nessuna operazione eseguita.");
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));

  console.log("=== NEON PRODUCTION FULL RESET ===");
  console.log(`Target hostname: ${url.hostname}`);
  console.log(`Target database: ${databaseName}`);
  console.log();

  if (
    url.hostname !== EXPECTED_HOSTNAME ||
    databaseName !== EXPECTED_DATABASE
  ) {
    fail(
      "Host/database non corrispondono esattamente al target autorizzato. " +
      "Nessuna operazione eseguita.",
    );
  }

  if (url.searchParams.has("options")) {
    console.log(
      "Nota: il parametro di connessione 'options' è presente; " +
      "verificare che non cambi lo schema di destinazione.",
    );
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    application_name: "freelanceos-full-production-reset",
  });

  let connected = false;

  try {
    await client.connect();
    connected = true;
    console.log("Connessione stabilita.\n");

    // Verifica che la tabella delle migrazioni esista.
    const migrationsTableResult = await client.query(`
      SELECT to_regclass('public."_prisma_migrations"') AS table_name
    `);

    if (!migrationsTableResult.rows[0].table_name) {
      fail('Tabella public."_prisma_migrations" assente.');
    }

    console.log("--- Inventario tabelle ---");
    const actualTables = await getPublicTables(client);
    const expectedTables: string[] = [...AUTHORIZED_TABLES];

    const unexpectedTables = actualTables.filter(
      (table) => !expectedTables.includes(table),
    );
    const missingTables = expectedTables.filter(
      (table) => !actualTables.includes(table),
    );

    if (unexpectedTables.length > 0) {
      fail(
        `Tabelle public non autorizzate trovate: ${unexpectedTables.join(", ")}`,
      );
    }

    if (missingTables.length > 0) {
      fail(
        `Tabelle attese mancanti: ${missingTables.join(", ")}`,
      );
    }

    console.log(`Trovate ${actualTables.length} tabelle attese.`);
    console.log();

    console.log("--- Conteggio dati applicativi ---");
    const initialCounts: TableCount[] = [];

    for (const table of APPLICATION_TABLES) {
      const count = await countRows(client, table);
      initialCounts.push({ table, count });
      console.log(`${table}: ${count}`);
    }

    const totalRecords = initialCounts.reduce(
      (total, item) => total + item.count,
      0,
    );

    const initialMigrationSnapshot = await getMigrationSnapshot(client);
    console.log(
      `\n_record migrazioni_: ${initialMigrationSnapshot.length} ` +
      "(saranno preservati)",
    );
    console.log(`Totale record applicativi da eliminare: ${totalRecords}\n`);

    console.log("--- Verifica dipendenze FK ---");
    const foreignKeys = await getForeignKeys(client);
    console.log(`FK esaminate: ${foreignKeys.length}`);

    const deletionOrder = computeDeletionOrder(foreignKeys);

    console.log("Ordine DELETE (figlio -> genitore):");
    deletionOrder.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table}`);
    });
    console.log();

    console.log("ATTENZIONE: l'operazione eliminerà definitivamente:");
    console.log("- tutti gli utenti e i dati di autenticazione");
    console.log("- workspace, membri, clienti e contratti");
    console.log("- fatture, pagamenti, time entry, notifiche e alert");
    console.log("- ogni altro record nelle 15 tabelle applicative elencate");
    console.log();
    console.log('La tabella "_prisma_migrations" e lo schema saranno mantenuti.');
    console.log("Non verranno eseguite migrazioni o deploy da questo script.");
    console.log();

    const confirmation = await askConfirmation(
      `Per confermare, digita esattamente "${CONFIRMATION}": `,
    );

    if (confirmation !== CONFIRMATION) {
      fail("Conferma non valida. Reset annullato.");
    }

    console.log("\nConferma ricevuta. Avvio transazione.\n");

    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");

    try {
      // Blocca tutte le tabelle coinvolte: evita scritture concorrenti
      // mentre il reset è in corso. Il lock è transazionale.
      const lockTables = [...APPLICATION_TABLES, MIGRATIONS_TABLE]
        .map((table) => `public.${quoteIdentifier(table)}`)
        .join(", ");

      await client.query(
        `LOCK TABLE ${lockTables} IN ACCESS EXCLUSIVE MODE`,
      );

      // Ricontrolla inventario e snapshot dopo aver acquisito i lock.
      const lockedTables = await getPublicTables(client);

      if (!sameJson([...lockedTables].sort(), [...actualTables].sort())) {
        fail("L'inventario tabelle è cambiato. Reset annullato.");
      }

      const lockedMigrationSnapshot = await getMigrationSnapshot(client);

      if (!sameJson(lockedMigrationSnapshot, initialMigrationSnapshot)) {
        fail(
          "_prisma_migrations è cambiata prima del reset. " +
          "Reset annullato.",
        );
      }

      // Verifica nuovamente le FK sotto lock prima di eliminare.
      const lockedForeignKeys = await getForeignKeys(client);
      const lockedOrder = computeDeletionOrder(lockedForeignKeys);

      if (!sameJson(lockedOrder, deletionOrder)) {
        fail("Le dipendenze FK sono cambiate. Reset annullato.");
      }

      console.log("--- Eliminazione transazionale ---");
      const deletedCounts: Record<string, number> = {};

      for (const table of deletionOrder) {
        const result = await client.query(
          `DELETE FROM public.${quoteIdentifier(table)}`,
        );

        deletedCounts[table] = result.rowCount ?? 0;
        console.log(`Eliminati ${deletedCounts[table]} record da ${table}`);
      }

      console.log("\nVerifica tabelle vuote prima del COMMIT:");

      for (const table of APPLICATION_TABLES) {
        const remaining = await countRows(client, table);

        if (remaining !== 0) {
          fail(`La tabella ${table} contiene ancora ${remaining} record.`);
        }

        console.log(`OK ${table}: 0`);
      }

      // Verifica che la cronologia migrazioni sia identica prima del COMMIT.
      const migrationSnapshotBeforeCommit =
        await getMigrationSnapshot(client);

      if (
        !sameJson(
          migrationSnapshotBeforeCommit,
          initialMigrationSnapshot,
        )
      ) {
        fail(
          "_prisma_migrations è stata modificata durante la transazione.",
        );
      }

      await client.query("COMMIT");

      const deletedTotal = Object.values(deletedCounts).reduce(
        (total, count) => total + count,
        0,
      );

      console.log(`\nCOMMIT completato. Record eliminati: ${deletedTotal}`);
    } catch (error) {
      try {
        await client.query("ROLLBACK");
        console.error("Transazione annullata: ROLLBACK eseguito.");
      } catch (rollbackError) {
        console.error("ERRORE durante ROLLBACK:", rollbackError);
      }

      throw error;
    }

    console.log("\n--- Verifica finale post-COMMIT ---");

    for (const table of APPLICATION_TABLES) {
      const remaining = await countRows(client, table);

      if (remaining !== 0) {
        fail(
          `Verifica post-COMMIT fallita: ${table} contiene ${remaining} record.`,
        );
      }
    }

    const finalMigrationSnapshot = await getMigrationSnapshot(client);

    if (!sameJson(finalMigrationSnapshot, initialMigrationSnapshot)) {
      fail(
        "La verifica finale di _prisma_migrations è fallita: " +
        "il contenuto non coincide con lo snapshot iniziale.",
      );
    }

    const finalTables = await getPublicTables(client);

    if (!sameJson([...finalTables].sort(), [...actualTables].sort())) {
      fail("L'inventario tabelle è cambiato durante il reset.");
    }

    console.log("Tutte le tabelle applicative sono vuote.");
    console.log(
      `_prisma_migrations preservata: ${finalMigrationSnapshot.length} righe, ` +
      "contenuto identico.",
    );
    console.log("Inventario tabelle invariato.");
    console.log("\n=== FULL RESET COMPLETATO E VERIFICATO ===");
    console.log("\nProssimo passo: eseguire separatamente il comando Prisma");
    console.log(
      "migrate resolve --rolled-back per la migrazione fallita, " +
      "poi migrate deploy.",
    );
  } finally {
    if (connected) {
      await client.end();
    }
  }
}

fullReset().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : String(error);

  console.error("\nRESET NON COMPLETATO:", message);
  process.exitCode = 1;
});
