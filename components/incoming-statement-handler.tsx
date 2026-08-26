import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { db } from '@/db';
import { transactions } from '@/db/schema';
import { parseStatement } from '@/lib/statement-import';

const supportedExtension = /\.(pdf|xlsx)$/i;

/** Imports a statement file the OS handed to the app; rejects incompatible files. */
async function importSharedFile(url: string) {
  const name = decodeURIComponent(url.split('/').pop() ?? '').split('?')[0] || 'statement';
  if (!supportedExtension.test(name)) {
    Alert.alert('File not supported', 'Kripon can only open PDF or XLSX statement files.');
    return;
  }
  try {
    const parsed = await parseStatement({ uri: url, name });
    if (!parsed.rows.length) throw new Error(`No readable ${parsed.source} payments were found in this file.`);
    await db.insert(transactions).values(parsed.rows).onConflictDoNothing();
    Alert.alert('Statement imported', `${parsed.rows.length} ${parsed.source} payments added.`);
  } catch (error) {
    Alert.alert('Could not import this file', error instanceof Error ? error.message : 'The file is not a compatible statement.');
  }
}

/**
 * No-op component that watches for files shared into Kripon ("Open in Kripon")
 * through the OS share sheet or file picker.
 */
export function IncomingStatementHandler() {
  const url = Linking.useURL();
  const handled = useRef(new Set<string>());

  useEffect(() => {
    void Linking.getInitialURL().then((initial) => {
      if (!initial || handled.current.has(initial)) return;
      handled.current.add(initial);
      void importSharedFile(initial);
    });
  }, []);

  useEffect(() => {
    if (!url || handled.current.has(url)) return;
    handled.current.add(url);
    void importSharedFile(url);
  }, [url]);

  return null;
}
