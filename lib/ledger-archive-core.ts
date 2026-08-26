export const ARCHIVE_KIND = 'kripon-ledger';
export const ARCHIVE_VERSION = 2;

export type ArchiveTransaction = {
  id: string;
  occurredAt: number;
  counterparty: string;
  amountPaise: number;
  direction: 'debit' | 'credit';
  category: string;
  source: 'Paytm' | 'GPay' | 'BHIM' | 'Manual';
  reference: string | null;
  status: string;
  sourceFile: string | null;
  createdAt: number;
};

export type ArchiveBudget = {
  id: string;
  cadence: 'weekly' | 'monthly';
  amountPaise: number;
  createdAt: number;
  updatedAt: number;
};

export type ArchivePayload = {
  kind: typeof ARCHIVE_KIND;
  version: typeof ARCHIVE_VERSION;
  createdAt: string;
  transactions: ArchiveTransaction[];
  budgets: ArchiveBudget[];
};

const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
const stringOrNull = (value: unknown) => value === null || value === undefined || typeof value === 'string';

function validateTransaction(item: unknown) {
  const transaction = item as Partial<ArchiveTransaction>;
  return (
    typeof transaction.id === 'string' &&
    transaction.id.length > 0 &&
    typeof transaction.counterparty === 'string' &&
    transaction.counterparty.length > 0 &&
    typeof transaction.category === 'string' &&
    transaction.category.length > 0 &&
    numeric(transaction.occurredAt) &&
    numeric(transaction.amountPaise) &&
    numeric(transaction.createdAt) &&
    (transaction.direction === 'debit' || transaction.direction === 'credit') &&
    ['Paytm', 'GPay', 'BHIM', 'Manual'].includes(transaction.source ?? '') &&
    stringOrNull(transaction.reference) &&
    stringOrNull(transaction.sourceFile)
  );
}

function validateBudget(item: unknown) {
  const budget = item as Partial<ArchiveBudget>;
  return (
    typeof budget.id === 'string' &&
    budget.id.length > 0 &&
    (budget.cadence === 'weekly' || budget.cadence === 'monthly') &&
    numeric(budget.amountPaise) &&
    numeric(budget.createdAt) &&
    numeric(budget.updatedAt)
  );
}

/** Validates an untrusted parsed archive; throws with a readable message when invalid. */
export function validateArchive(value: unknown): ArchivePayload {
  if (!value || typeof value !== 'object') throw new Error('This file is not a Kripon archive.');
  const archive = value as Partial<ArchivePayload>;
  if (archive.kind !== ARCHIVE_KIND || archive.version !== ARCHIVE_VERSION) {
    throw new Error('This archive uses an unsupported format.');
  }
  if (!Array.isArray(archive.transactions) || !Array.isArray(archive.budgets) || typeof archive.createdAt !== 'string') {
    throw new Error('This archive is incomplete.');
  }
  for (const item of archive.transactions) {
    if (!validateTransaction(item)) throw new Error('This archive contains an invalid transaction.');
  }
  for (const item of archive.budgets) {
    if (!validateBudget(item)) throw new Error('This archive contains an invalid budget.');
  }
  return { kind: ARCHIVE_KIND, version: ARCHIVE_VERSION, createdAt: archive.createdAt, transactions: archive.transactions, budgets: archive.budgets };
}

export function parseArchive(raw: string): ArchivePayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
  return validateArchive(parsed);
}
