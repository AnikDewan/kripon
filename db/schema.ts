import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
  counterparty: text('counterparty').notNull(),
  amountPaise: integer('amount_paise').notNull(),
  direction: text('direction', { enum: ['debit', 'credit'] }).notNull(),
  category: text('category').notNull(),
  source: text('source', { enum: ['Paytm', 'GPay', 'BHIM', 'Manual'] }).notNull(),
  reference: text('reference'),
  status: text('status').notNull().default('SUCCESS'),
  sourceFile: text('source_file'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  cadence: text('cadence', { enum: ['weekly', 'monthly'] }).notNull().unique(),
  amountPaise: integer('amount_paise').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type BudgetCadence = Budget['cadence'];
