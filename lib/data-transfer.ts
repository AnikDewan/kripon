import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { sqlite } from '@/db';
import { CHECKSUM_ENTRY, createZip, LEDGER_ENTRY, readZipEntry } from './zip';
import { ARCHIVE_KIND, ARCHIVE_VERSION, parseArchive, type ArchiveBudget, type ArchivePayload, type ArchiveTransaction } from './ledger-archive-core';

const PAGE_SIZE = 2000;

export type DataJobState = 'idle' | 'running' | 'done' | 'error';

export type DataJobStatus = {
  state: DataJobState;
  progress: number;
  message: string | null;
};

type Listener = (status: DataJobStatus) => void;

const listeners = new Set<Listener>();
let status: DataJobStatus = { state: 'idle', progress: 0, message: null };

const setStatus = (patch: Partial<DataJobStatus>) => {
  status = { ...status, ...patch };
  for (const listener of listeners) listener(status);
};

export const getDataJobStatus = () => status;

/** Subscribes to export/import job progress; fires immediately with current status. */
export function subscribeToJobs(listener: Listener) {
  listeners.add(listener);
  listener(status);
  return () => {
    listeners.delete(listener);
  };
}

/** Yields to the JS event loop between chunks so long jobs never freeze the UI. */
const yieldToUI = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function loadBudgets(): ArchiveBudget[] {
  return sqlite.getAllSync<ArchiveBudget>(
    `SELECT id, cadence, amount_paise as amountPaise, created_at as createdAt, updated_at as updatedAt FROM budgets`,
  );
}

/**
 * Exports the whole ledger as a zipped JSON archive. Runs asynchronously in
 * chunks so the UI stays responsive while large ledgers are serialized.
 * Resolves with the created zip file.
 */
export async function exportData(): Promise<File> {
  setStatus({ state: 'running', progress: 0, message: 'Collecting your data...' });
  try {
    const total = sqlite.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM transactions')?.count ?? 0;
    const transactions: ArchiveTransaction[] = [];
    let offset = 0;

    while (true) {
      const rows = sqlite.getAllSync<Record<string, unknown>>(
        `SELECT id, occurred_at as occurredAt, counterparty, amount_paise as amountPaise, direction, category,
                source, reference, status, source_file as sourceFile, created_at as createdAt
         FROM transactions ORDER BY occurred_at ASC LIMIT ? OFFSET ?`,
        [PAGE_SIZE, offset],
      );
      for (const row of rows) {
        transactions.push({
          id: row.id as string,
          occurredAt: row.occurredAt as number,
          counterparty: row.counterparty as string,
          amountPaise: row.amountPaise as number,
          direction: row.direction as ArchiveTransaction['direction'],
          category: row.category as string,
          source: row.source as ArchiveTransaction['source'],
          reference: (row.reference as string | null) ?? null,
          status: row.status as string,
          sourceFile: (row.sourceFile as string | null) ?? null,
          createdAt: row.createdAt as number,
        });
      }
      offset += rows.length;
      setStatus({ progress: Math.min((offset / Math.max(total, 1)) * 0.7, 0.7) });
      if (rows.length < PAGE_SIZE) break;
      await yieldToUI();
    }

    const payload: ArchivePayload = {
      kind: ARCHIVE_KIND,
      version: ARCHIVE_VERSION,
      createdAt: new Date().toISOString(),
      transactions,
      budgets: loadBudgets(),
    };
    const json = JSON.stringify(payload);

    setStatus({ progress: 0.8, message: 'Compressing...' });
    await yieldToUI();

    const ledgerBytes = new TextEncoder().encode(json);
    const checksum = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, json);
    const zipped = await createZip({
      [LEDGER_ENTRY]: ledgerBytes,
      [CHECKSUM_ENTRY]: new TextEncoder().encode(checksum),
    });

    const exportsDir = new Directory(Paths.cache, 'exports');
    if (!exportsDir.exists) exportsDir.create();
    const file = new File(exportsDir, `kripon-ledger-${payload.createdAt.slice(0, 10)}.zip`);
    file.write(zipped);

    setStatus({ state: 'done', progress: 1, message: `${total} payments exported.` });
    return file;
  } catch (error) {
    setStatus({ state: 'error', progress: 0, message: error instanceof Error ? error.message : 'Export failed.' });
    throw error;
  }
}

/** Hands the exported zip to the OS save sheet so it lands in Downloads/Files. */
export async function saveExportToDownloads(file: File) {
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(file.uri, { mimeType: 'application/zip', dialogTitle: 'Save Kripon export' });
}

async function verifyChecksum(json: string, archive: Uint8Array) {
  const expected = new TextDecoder().decode(await readZipEntry(archive, CHECKSUM_ENTRY)).trim();
  const actual = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, json);
  if (expected !== actual) throw new Error('The archive integrity check failed. Choose another copy of the file.');
}

/** Prompts for a Kripon .zip archive and returns its verified payload, or null when cancelled. */
export async function pickImportFile(): Promise<{ payload: ArchivePayload; fileName: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/x-zip-compressed'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const picked = result.assets[0];
  const file = new File(picked.uri.replace('file://', ''));
  const archive = new Uint8Array(await file.bytes());
  const json = new TextDecoder().decode(await readZipEntry(archive, LEDGER_ENTRY));
  await verifyChecksum(json, archive);
  return { payload: parseArchive(json), fileName: picked.name };
}

/** Replaces the entire database contents with the given archive payload. */
export async function restoreData(payload: ArchivePayload) {
  setStatus({ state: 'running', progress: 0, message: 'Restoring your data...' });
  try {
    await sqlite.withTransactionAsync(async () => {
      sqlite.execSync('DELETE FROM transactions; DELETE FROM budgets;');
      await insertTransactions(payload.transactions);
      insertBudgets(payload.budgets);
    });
    setStatus({ state: 'done', progress: 1, message: `${payload.transactions.length} payments restored.` });
  } catch (error) {
    setStatus({ state: 'error', progress: 0, message: error instanceof Error ? error.message : 'Restore failed.' });
    throw error;
  }
}

async function insertTransactions(items: ArchiveTransaction[]) {
  const insert = sqlite.prepareSync(
    `INSERT OR REPLACE INTO transactions (id, occurred_at, counterparty, amount_paise, direction, category, source, reference, status, source_file, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  try {
    let sinceYield = 0;
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      insert.executeSync([
        item.id, item.occurredAt, item.counterparty, item.amountPaise, item.direction,
        item.category, item.source, item.reference, item.status, item.sourceFile, item.createdAt,
      ]);
      if (++sinceYield === PAGE_SIZE) {
        sinceYield = 0;
        setStatus({ progress: ((index + 1) / Math.max(items.length, 1)) * 0.9 });
        await yieldToUI();
      }
    }
  } finally {
    insert.finalizeSync();
  }
}

function insertBudgets(items: ArchiveBudget[]) {
  const insert = sqlite.prepareSync(
    `INSERT INTO budgets (id, cadence, amount_paise, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
  );
  try {
    for (const item of items) {
      insert.executeSync([item.id, item.cadence, item.amountPaise, item.createdAt, item.updatedAt]);
    }
  } finally {
    insert.finalizeSync();
  }
}
