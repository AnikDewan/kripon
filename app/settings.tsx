import { useSyncExternalStore } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useState } from 'react';
import { DatabaseBackup, FileDown, FolderOpen } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '@/db';
import { transactions } from '@/db/schema';
import { BudgetSettings } from '@/components/budget-settings';
import {
  exportData,
  getDataJobStatus,
  pickImportFile,
  restoreData,
  saveExportToDownloads,
  subscribeToJobs,
} from '@/lib/data-transfer';
import { chooseStatement, parseStatement } from '@/lib/statement-import';

const supportedApps = 'Paytm (.xlsx) · Google Pay (.pdf) · BHIM (.pdf)';

export default function SettingsScreen() {
  const job = useSyncExternalStore(subscribeToJobs, getDataJobStatus);
  const isBusy = job.state === 'running';
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const runExport = async () => {
    try {
      const file = await exportData();
      await saveExportToDownloads(file);
    } catch {
      Alert.alert('Export failed', getDataJobStatus().message ?? 'Try again.');
    }
  };

  const runImport = async () => {
    try {
      const picked = await pickImportFile();
      if (!picked) return;
      Alert.alert(
        'Replace your current data?',
        `${picked.fileName} contains ${picked.payload.transactions.length} payments. Current payments and budgets will be replaced.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: () => {
              void restoreData(picked.payload).catch(() => {
                Alert.alert('Import failed', getDataJobStatus().message ?? 'Choose another file.');
              });
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Could not read archive', error instanceof Error ? error.message : 'Choose another file.');
    }
  };

  const runStatementImport = async () => {
    try {
      setIsImporting(true);
      setMessage(null);
      const file = await chooseStatement();
      if (!file) return;
      const parsed = await parseStatement(file);
      if (!parsed.rows.length) throw new Error('No completed UPI payments were found in this statement.');
      await db.insert(transactions).values(parsed.rows).onConflictDoNothing();
      setMessage(`${parsed.rows.length} ${parsed.source} payments imported.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'The statement could not be imported.';
      Alert.alert('Import stopped', text);
      setMessage(text);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F3F7F8' }}>
      <ScrollView className="bg-paper" contentContainerStyle={{ gap: 16, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 16 }}>
        <Text className="text-[30px] font-extrabold tracking-[-1.2px] text-ink">Settings</Text>

        <View className="rounded-2xl bg-white p-5">
          <Text className="text-[16px] font-bold text-ink">Budgets</Text>
          <View className="mt-4">
            <BudgetSettings />
          </View>
        </View>

        <View className="rounded-2xl bg-white p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-[16px] font-bold text-ink">Import statement</Text>
          </View>
          <Pressable disabled={isImporting} onPress={() => void runStatementImport()} className={`mt-3 flex-row items-center justify-center gap-2 rounded-xl py-3.5 active:opacity-80 ${isImporting ? 'bg-slate' : 'bg-teal'}`}>
            <FolderOpen size={18} color="#FFFFFF" strokeWidth={2} />
            <Text className="text-[14px] font-bold text-white">{isImporting ? 'Reading statement...' : 'Choose a statement file'}</Text>
          </Pressable>
          <Text className="mt-2 text-center text-[11px] text-ink-muted">{supportedApps}</Text>
          {message ? <Text className={`mt-2 text-center text-[12px] font-semibold ${message.includes('imported') ? 'text-teal' : 'text-coral'}`}>{message}</Text> : null}
        </View>

        <View className="rounded-2xl bg-white p-4">
          <Text className="text-[16px] font-bold text-ink">Backup &amp; restore</Text>
          {job.message ? <Text className={`mt-1 text-[12px] font-semibold ${job.state === 'error' ? 'text-coral' : 'text-teal'}`}>{job.message}{isBusy ? ` (${Math.round(job.progress * 100)}%)` : ''}</Text> : null}
          <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
            {isBusy || job.state === 'done' ? <View className={job.state === 'done' && !isBusy ? 'h-full bg-teal-pale' : 'h-full bg-teal'} style={{ width: `${Math.round(Math.max(job.progress, isBusy ? 0.02 : 1) * 100)}%` }} /> : null}
          </View>
          <Pressable disabled={isBusy} onPress={() => void runExport()} className={`mt-3 flex-row items-center justify-center gap-2 rounded-xl py-3.5 active:opacity-80 ${isBusy ? 'bg-slate' : 'bg-teal'}`}>
            <FileDown size={18} color="#FFFFFF" strokeWidth={2} />
            <Text className="text-[14px] font-bold text-white">{isBusy ? 'Exporting...' : 'Export data (.zip)'}</Text>
          </Pressable>
          <Pressable disabled={isBusy} onPress={() => void runImport()} className="mt-2 flex-row items-center justify-center gap-2 rounded-xl bg-mist py-3.5 active:opacity-80">
            <DatabaseBackup size={18} color="#112A3D" strokeWidth={2} />
            <Text className="text-[14px] font-bold text-ink">Import data (.zip)</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
