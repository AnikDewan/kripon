import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FolderOpen, Info } from 'lucide-react-native';

import { db } from '@/db';
import { transactions } from '@/db/schema';
import { chooseStatement, parseStatement } from '@/lib/statement-import';

const appInfo = [
  { name: 'Paytm', format: 'Excel .xlsx', color: '#4E6AA4', detail: 'Reads the Passbook Payment History sheet.' },
  { name: 'Google Pay', format: 'PDF', color: '#E7624B', detail: 'Extracts native text from GPay’s transaction statement.' },
  { name: 'BHIM', format: 'PDF', color: '#167C72', detail: 'Reads the UPI Transaction History export.' },
];

export default function ImportScreen() {
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const importStatement = async () => {
    try {
      setIsImporting(true);
      setMessage(null);
      const file = await chooseStatement();
      if (!file) return;
      const parsed = await parseStatement(file);
      if (!parsed.rows.length) throw new Error('No completed UPI payments were found in this statement.');
      await db.insert(transactions).values(parsed.rows).onConflictDoNothing();
      setMessage(`${parsed.rows.length} ${parsed.source} payments imported from ${file.name}.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'The statement could not be imported.';
      Alert.alert('Import stopped', text);
      setMessage(text);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F7F6F1' }}>
    <ScrollView className="bg-paper" contentContainerStyle={{ gap: 24, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 16 }}>
      <View><Text className="text-[30px] font-extrabold tracking-[-1.2px] text-ink">Import a statement</Text><Text className="mt-2 text-[13px] leading-5 text-ink-muted">Your statement stays on this device. Kripon creates one readable UPI ledger without bank login access.</Text></View>

      <Pressable disabled={isImporting} onPress={importStatement} className={`items-center rounded-2xl py-5 active:opacity-80 ${isImporting ? 'bg-slate' : 'bg-teal'}`}>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-white/15"><FolderOpen size={22} color="#FFFFFF" strokeWidth={2} /></View>
        <Text className="mt-3 text-[16px] font-bold text-white">{isImporting ? 'Reading statement...' : 'Choose a statement file'}</Text>
        <Text className="mt-1 text-[11px] text-white-muted">.xlsx or text-based .pdf</Text>
      </Pressable>
      {message ? <View className="rounded-2xl bg-teal-pale p-4"><Text className="text-[13px] font-semibold leading-5 text-teal">{message}</Text></View> : null}

      <View><Text className="mb-3 text-[16px] font-bold text-ink">Supported exports</Text><View className="divide-y divide-line rounded-2xl bg-white px-4">{appInfo.map((app) => <View key={app.name} className="flex-row items-center gap-3 py-4"><View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: app.color }}><Text className="text-[11px] font-extrabold text-white">{app.name === 'Google Pay' ? 'G' : app.name.slice(0, 1)}</Text></View><View className="flex-1"><Text className="text-[14px] font-bold text-ink">{app.name}</Text><Text className="mt-0.5 text-[11px] text-ink-muted">{app.detail}</Text></View><Text className="max-w-20 text-right text-[10px] font-bold text-ink-muted">{app.format}</Text></View>)}</View>
      </View>

      <View className="flex-row gap-3 rounded-2xl bg-mist p-4"><Info size={20} color="#637687" strokeWidth={2} /><View className="flex-1"><Text className="text-[12px] font-bold text-ink">About PDF statements</Text><Text className="mt-1 text-[12px] leading-5 text-ink-muted">Text-based GPay and BHIM exports work. Scanned PDFs need OCR before import.</Text></View></View>
    </ScrollView>
    </SafeAreaView>
  );
}
