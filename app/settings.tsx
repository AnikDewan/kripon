import { useSyncExternalStore } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Link, type Href } from 'expo-router';
import { ChevronRight, DatabaseBackup, FileDown, FolderUp } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  exportLedger,
  getLedgerJobStatus,
  pickLedgerArchive,
  restoreLedger,
  saveExportToDownloads,
  subscribeToLedgerJobs,
} from '@/lib/ledger-backup';

export default function SettingsScreen() {
  const job = useSyncExternalStore(subscribeToLedgerJobs, getLedgerJobStatus);
  const isBusy = job.state === 'running';

  const runExport = async () => {
    try {
      const file = await exportLedger();
      await saveExportToDownloads(file);
    } catch {
      Alert.alert('Export failed', job.message ?? 'Try again.');
    }
  };

  const runImport = async () => {
    try {
      const picked = await pickLedgerArchive();
      if (!picked) return;
      Alert.alert(
        'Replace this ledger?',
        `${picked.fileName} contains ${picked.payload.transactions.length} payments. Current payments and budgets will be replaced.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: () => {
              void restoreLedger(picked.payload).catch(() => {
                Alert.alert('Import failed', job.message ?? 'Choose another file.');
              });
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Could not read archive', error instanceof Error ? error.message : 'Choose another file.');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F3F7F8' }}>
      <ScrollView className="bg-paper" contentContainerStyle={{ gap: 16, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 16 }}>
        <Text className="text-[30px] font-extrabold tracking-[-1.2px] text-ink">Settings</Text>

        <View className="rounded-2xl bg-white">
          <Link href={'/import' as Href} asChild>
            <Pressable className="flex-row items-center gap-3 p-4 active:opacity-75">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-pale"><FolderUp size={19} color="#116F6B" strokeWidth={2} /></View>
              <Text className="flex-1 text-[14px] font-bold text-ink">Import statement</Text>
              <ChevronRight size={18} color="#637687" strokeWidth={2} />
            </Pressable>
          </Link>
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
