import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

export const sqlite = openDatabaseSync('kripon.db', { enableChangeListener: true });
export const db = drizzle(sqlite);

const demoTransactions = [
  ['2026-08-08T11:35:21', 'Amazon India', 95000, 'debit', 'Shopping', 'BHIM', '113521169414'],
  ['2026-08-05T07:59:36', 'Biplab Pal', 5000000, 'credit', 'Transfers', 'BHIM', '621731406172'],
  ['2026-08-04T22:31:02', 'Flipkart', 201800, 'debit', 'Shopping', 'BHIM', '223102655815'],
  ['2026-08-04T14:02:19', 'Swiggy Instamart', 154700, 'debit', 'Groceries', 'BHIM', '140219758426'],
  ['2026-08-04T12:41:53', 'Zomato', 403400, 'debit', 'Food & dining', 'BHIM', '124153070431'],
  ['2026-07-28T12:59:01', 'OGY', 500000, 'debit', 'Transfers', 'BHIM', '125901166114'],
  ['2026-07-22T14:13:52', 'NPCI BHIM cashback', 1200, 'credit', 'Cashback', 'BHIM', '103706672620'],
  ['2026-07-20T17:02:11', 'Citi Bank', 44800, 'debit', 'Bills', 'BHIM', '170211253343'],
  ['2026-07-19T10:49:46', 'State Bank portal', 37200, 'debit', 'Bills', 'BHIM', '104946206757'],
  ['2026-07-05T00:39:23', 'One97 Communications', 300, 'credit', 'Cashback', 'Paytm', '580712841866'],
  ['2026-07-05T00:39:07', 'Sanjoy Dewan', 20000, 'debit', 'Transfers', 'Paytm', '309780857684'],
  ['2026-07-03T21:04:03', 'Flipkart Payments', 602200, 'debit', 'Shopping', 'Paytm', '618481789415'],
  ['2026-06-09T12:39:48', 'Flipkart Internet', 195700, 'debit', 'Shopping', 'Paytm', '307688556757'],
  ['2026-06-06T13:54:23', 'WBSEDCL electricity', 42500, 'debit', 'Bills', 'Paytm', '207810502965'],
  ['2026-05-29T20:50:25', 'Chanchal Kumar Pal', 100000, 'debit', 'Transfers', 'Paytm', '307047664350'],
  ['2026-05-29T13:21:20', 'Sanjoy Dewan', 60000, 'credit', 'Transfers', 'Paytm', '614958455963'],
  ['2026-05-27T08:53:00', 'Google Play recharge', 1000, 'debit', 'Digital', 'GPay', '651375056332'],
  ['2026-05-27T08:58:00', 'Arpan Rajak', 2900, 'credit', 'Transfers', 'GPay', '651333977547'],
  ['2026-05-11T22:58:00', 'Chanchal Kumar Pal', 95000, 'debit', 'Transfers', 'GPay', '655869555520'],
] as const;

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
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      cadence TEXT NOT NULL UNIQUE,
      amount_paise INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS custom_categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  const existing = sqlite.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM transactions');
  if ((existing?.count ?? 0) > 0) return;

  const statement = sqlite.prepareSync(
    `INSERT INTO transactions (id, occurred_at, counterparty, amount_paise, direction, category, source, reference, status, source_file, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUCCESS', 'sample-statements', ?)`
  );
  try {
    for (const [date, counterparty, amountPaise, direction, category, source, reference] of demoTransactions) {
      const occurredAt = new Date(date).getTime();
      statement.executeSync([
        `sample-${reference}`,
        occurredAt,
        counterparty,
        amountPaise,
        direction,
        category,
        source,
        reference,
        occurredAt,
      ]);
    }
  } finally {
    statement.finalizeSync();
  }
}
