import { unzip, zip, type AsyncZippable } from 'fflate';

export const LEDGER_ENTRY = 'ledger.json';
export const CHECKSUM_ENTRY = 'checksum.txt';

/** Creates a .zip archive from raw entries (name → bytes). */
export function createZip(entries: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const packed: AsyncZippable = {};
    for (const [name, bytes] of Object.entries(entries)) {
      packed[name] = [bytes, { level: 6 }];
    }
    zip(packed, (error, data) => (error ? reject(error) : resolve(data)));
  });
}

/** Extracts a single entry's bytes; throws when the archive or entry is missing. */
export function readZipEntry(archive: Uint8Array, name: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    unzip(archive, (error, files) => {
      if (error) return reject(new Error('This file is not a valid Kripon archive.'));
      const entry = files[name];
      if (!entry) return reject(new Error(`This archive is missing ${name}.`));
      resolve(entry);
    });
  });
}
