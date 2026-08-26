import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

export const sqlite = openDatabaseSync("kripon.db", {
  enableChangeListener: true,
});
export const db = drizzle(sqlite);

export function bootstrapDatabase() {
  sqlite.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      occurred_at INTEGER NOT NULL,
      counterparty TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      direction TEXT NOT NULL,
      category TEXT NOT NULL,
      source TEXT NOT NULL,
      reference TEXT,
      status TEXT NOT NULL DEFAULT 'SUCCESS',
      source_file TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS transactions_reference_unique
      ON transactions(reference) WHERE reference IS NOT NULL;
    CREATE INDEX IF NOT EXISTS transactions_occurred_at_idx
      ON transactions(occurred_at DESC);
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      cadence TEXT NOT NULL UNIQUE,
      amount_paise INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Categories retired by the fixed-category set map onto their closest replacement.
  sqlite.execSync(
    `UPDATE transactions SET category = 'Bills' WHERE category IN ('Digital', 'Utilities')`
  );
}
