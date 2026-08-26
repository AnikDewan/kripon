import { describe, expect, it } from 'vitest';

import {
  ARCHIVE_KIND,
  ARCHIVE_VERSION,
  validateArchive,
  type ArchivePayload,
} from './ledger-archive-core';
import { createZip, LEDGER_ENTRY, readZipEntry } from './zip';

const validTransaction = {
  id: 't1',
  occurredAt: 1700000000000,
  counterparty: 'Amazon',
  amountPaise: 95000,
  direction: 'debit' as const,
  category: 'Shopping',
  source: 'BHIM' as const,
  reference: null,
  status: 'SUCCESS',
  sourceFile: null,
  createdAt: 1700000000000,
};

const validPayload = (): ArchivePayload => ({
  kind: ARCHIVE_KIND,
  version: ARCHIVE_VERSION,
  createdAt: '2026-08-26T00:00:00.000Z',
  transactions: [validTransaction],
  budgets: [],
});

describe('validateArchive', () => {
  it('accepts a valid payload', () => {
    expect(validateArchive(validPayload())).toMatchObject({ kind: ARCHIVE_KIND });
  });

  it('rejects non-objects and wrong kinds/versions', () => {
    expect(() => validateArchive(null)).toThrow();
    expect(() => validateArchive({ kind: 'nope' })).toThrow();
    expect(() => validateArchive({ ...validPayload(), version: 99 })).toThrow();
  });

  it('rejects payloads with invalid transactions', () => {
    const bad = validPayload();
    bad.transactions = [{ ...validTransaction, amountPaise: 'lots' } as never];
    expect(() => validateArchive(bad)).toThrow();
  });

  it('rejects payloads with invalid budgets', () => {
    const bad = validPayload();
    bad.budgets = [{ id: 'b1', cadence: 'daily', amountPaise: 1, createdAt: 1, updatedAt: 2 } as never];
    expect(() => validateArchive(bad)).toThrow();
  });

  it('tolerates legacy extra fields such as customCategories', () => {
    const legacy = { ...validPayload(), customCategories: [{ id: 'x', name: 'X', icon: 'food', createdAt: 1 }] };
    expect(validateArchive(legacy).transactions).toHaveLength(1);
  });
});

describe('createZip/readZipEntry', () => {
  it('round-trips data through a zip archive', async () => {
    const original = new TextEncoder().encode(JSON.stringify(validPayload()));
    const zipped = await createZip({ [LEDGER_ENTRY]: original });
    const extracted = await readZipEntry(zipped, LEDGER_ENTRY);
    expect(JSON.parse(new TextDecoder().decode(extracted))).toEqual(validPayload());
  });

  it('rejects archives without the requested entry', async () => {
    const zipped = await createZip({ 'other.txt': new TextEncoder().encode('hi') });
    await expect(readZipEntry(zipped, LEDGER_ENTRY)).rejects.toThrow();
  });
});
