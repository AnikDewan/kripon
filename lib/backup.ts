import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { sqlite } from '@/db';

const BACKUP_VERSION = 1;
const BACKUP_KIND = 'kripon-backup';

type BackupTransaction = {
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

type BackupBudget = { id: string; cadence: 'weekly' | 'monthly'; amountPaise: number; createdAt: number; updatedAt: number };
type BackupCategory = { id: string; name: string; icon: string; createdAt: number };

type BackupPayload = {
  kind: typeof BACKUP_KIND;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  transactions: BackupTransaction[];
  budgets: BackupBudget[];
  customCategories: BackupCategory[];
};

type BackupFile = BackupPayload & { checksum: string };

const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
const stringOrNull = (value: unknown) => typeof value === 'string' ? value : null;

async function checksum(payload: BackupPayload) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify(payload));
}

function makePayload(): BackupPayload {
  const transactions = sqlite.getAllSync<BackupTransaction>(`SELECT id, occurred_at as occurredAt, counterparty, amount_paise as amountPaise, direction, category, source, reference, status, source_file as sourceFile, created_at as createdAt FROM transactions ORDER BY occurred_at DESC`);
  const budgets = sqlite.getAllSync<BackupBudget>(`SELECT id, cadence, amount_paise as amountPaise, created_at as createdAt, updated_at as updatedAt FROM budgets`);
  const customCategories = sqlite.getAllSync<BackupCategory>(`SELECT id, name, icon, created_at as createdAt FROM custom_categories ORDER BY name COLLATE NOCASE`);
  return { kind: BACKUP_KIND, version: BACKUP_VERSION, createdAt: new Date().toISOString(), transactions, budgets, customCategories };
}

function validateBackup(value: unknown): BackupFile {
  if (!value || typeof value !== 'object') throw new Error('This file is not a Kripon backup.');
  const backup = value as Partial<BackupFile>;
  if (backup.kind !== BACKUP_KIND || backup.version !== BACKUP_VERSION || typeof backup.checksum !== 'string') throw new Error('This backup uses an unsupported format.');
  if (!Array.isArray(backup.transactions) || !Array.isArray(backup.budgets) || !Array.isArray(backup.customCategories) || typeof backup.createdAt !== 'string') throw new Error('This backup is incomplete.');
  for (const item of backup.transactions) {
    const transaction = item as Partial<BackupTransaction>;
    if (!transaction.id || !transaction.counterparty || !transaction.category || !numeric(transaction.occurredAt) || !numeric(transaction.amountPaise) || !numeric(transaction.createdAt) || !['debit', 'credit'].includes(transaction.direction ?? '') || !['Paytm', 'GPay', 'BHIM', 'Manual'].includes(transaction.source ?? '')) throw new Error('This backup contains an invalid transaction.');
  }
  for (const item of backup.budgets) {
    const budget = item as Partial<BackupBudget>;
    if (!budget.id || !['weekly', 'monthly'].includes(budget.cadence ?? '') || !numeric(budget.amountPaise) || !numeric(budget.createdAt) || !numeric(budget.updatedAt)) throw new Error('This backup contains an invalid budget.');
  }
  for (const item of backup.customCategories) {
    const category = item as Partial<BackupCategory>;
    if (!category.id || !category.name || !category.icon || !numeric(category.createdAt)) throw new Error('This backup contains an invalid category.');
  }
  return backup as BackupFile;
}

export async function createBackupFile() {
  const payload = makePayload();
  const file: BackupFile = { ...payload, checksum: await checksum(payload) };
  if (!FileSystem.documentDirectory) throw new Error('Local file storage is unavailable on this device.');
  const name = `kripon-backup-${payload.createdAt.slice(0, 10)}.json`;
  const uri = `${FileSystem.documentDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(file));
  return { uri, name, createdAt: payload.createdAt, transactionCount: payload.transactions.length };
}

export async function readBackupFile(uri: string) {
  return FileSystem.readAsStringAsync(uri);
}

export async function shareLocalBackup() {
  const backup = await createBackupFile();
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing backups is unavailable on this device.');
  await Sharing.shareAsync(backup.uri, { mimeType: 'application/json', dialogTitle: 'Save Kripon backup' });
  return backup;
}

export async function selectAndRestoreBackup() {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/json'], copyToCacheDirectory: true });
  if (result.canceled) return null;
  const file = result.assets[0];
  const raw = await FileSystem.readAsStringAsync(file.uri);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
  const backup = validateBackup(parsed);
  const { checksum: expectedChecksum, ...payload } = backup;
  if ((await checksum(payload)) !== expectedChecksum) throw new Error('The backup integrity check failed. Choose another copy of the file.');
  return { backup, fileName: file.name };
}

export function restoreBackup(backup: BackupFile) {
  sqlite.withTransactionSync(() => {
    sqlite.execSync('DELETE FROM transactions; DELETE FROM budgets; DELETE FROM custom_categories;');
    const transactionStatement = sqlite.prepareSync(`INSERT INTO transactions (id, occurred_at, counterparty, amount_paise, direction, category, source, reference, status, source_file, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const budgetStatement = sqlite.prepareSync(`INSERT INTO budgets (id, cadence, amount_paise, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`);
    const categoryStatement = sqlite.prepareSync(`INSERT INTO custom_categories (id, name, icon, created_at) VALUES (?, ?, ?, ?)`);
    try {
      for (const item of backup.transactions) transactionStatement.executeSync([item.id, item.occurredAt, item.counterparty, item.amountPaise, item.direction, item.category, item.source, stringOrNull(item.reference), item.status, stringOrNull(item.sourceFile), item.createdAt]);
      for (const item of backup.budgets) budgetStatement.executeSync([item.id, item.cadence, item.amountPaise, item.createdAt, item.updatedAt]);
      for (const item of backup.customCategories) categoryStatement.executeSync([item.id, item.name, item.icon, item.createdAt]);
    } finally {
      transactionStatement.finalizeSync();
      budgetStatement.finalizeSync();
      categoryStatement.finalizeSync();
    }
  });
}

export type { BackupFile };
