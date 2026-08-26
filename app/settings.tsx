import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Link, type Href } from 'expo-router';
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import { ChevronRight, Cloud, DatabaseBackup, FileDown, FolderUp, Plus, Tag, Trash2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { categoryIconOptions, defaultCategories, getCategoryIcon } from '@/lib/categories';
import { createBackupFile, readBackupFile, restoreBackup, selectAndRestoreBackup, shareLocalBackup } from '@/lib/backup';
import { customCategories, transactions } from '@/db/schema';
import { db } from '@/db';

type GoogleDriveConfig = { iosClientId?: string; androidClientId?: string; webClientId?: string };

const googleDrive = (Constants.expoConfig?.extra?.googleDrive ?? {}) as GoogleDriveConfig;
const hasGoogleDriveConfig = Boolean(googleDrive.iosClientId && googleDrive.androidClientId && googleDrive.webClientId);

export default function SettingsScreen() {
  const { data: categoryRows } = useLiveQuery(db.select().from(customCategories).orderBy(customCategories.name));
  const { data: transactionRows } = useLiveQuery(db.select().from(transactions).orderBy(desc(transactions.occurredAt)));
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('other');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [driveStatus, setDriveStatus] = useState<string | null>(null);
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: googleDrive.iosClientId,
    androidClientId: googleDrive.androidClientId,
    webClientId: googleDrive.webClientId,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    selectAccount: true,
  });

  const categories = categoryRows ?? [];
  const usedCategoryNames = new Set([...defaultCategories, ...categories.map((category) => category.name)].map((value) => value.toLocaleLowerCase()));

  useEffect(() => {
    const uploadToDrive = async () => {
      if (response?.type !== 'success') return;
      const accessToken = response.authentication?.accessToken ?? response.params.access_token;
      if (!accessToken) {
        setDriveStatus('Google did not return an upload token. Try connecting again.');
        return;
      }
      try {
        setDriveStatus('Creating backup for Google Drive...');
        const backup = await createBackupFile();
        const backupContents = await readBackupFile(backup.uri);
        const boundary = `kripon-${Date.now()}`;
        const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: backup.name, mimeType: 'application/json' })}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${backupContents}\r\n--${boundary}--`;
        const upload = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
          body,
        });
        if (!upload.ok) throw new Error('Google Drive rejected the backup.');
        setDriveStatus(`Saved ${backup.transactionCount} payments to Google Drive.`);
      } catch (error) {
        setDriveStatus(error instanceof Error ? error.message : 'Google Drive backup failed.');
      }
    };
    void uploadToDrive();
  }, [response]);

  const addCategory = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (usedCategoryNames.has(trimmedName.toLocaleLowerCase())) {
      Alert.alert('Category already exists', 'Choose a name that is not already in your category list.');
      return;
    }
    await db.insert(customCategories).values({ id: `category-${Date.now()}`, name: trimmedName, icon, createdAt: new Date() });
    setName('');
    setIcon('other');
  };

  const removeCategory = (id: string, categoryName: string) => {
    Alert.alert('Remove category?', `Existing payments tagged “${categoryName}” will keep their label, but it will no longer appear when you add a payment.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void db.delete(customCategories).where(eq(customCategories.id, id)) },
    ]);
  };

  const exportBackup = async () => {
    try {
      setIsBackingUp(true);
      const backup = await shareLocalBackup();
      setDriveStatus(`Backup ready: ${backup.transactionCount} payments included.`);
    } catch (error) {
      Alert.alert('Could not create backup', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const restoreLocalBackup = async () => {
    try {
      const selected = await selectAndRestoreBackup();
      if (!selected) return;
      Alert.alert('Replace this ledger?', `${selected.fileName} contains ${selected.backup.transactions.length} payments. Current payments, budgets, and custom categories will be replaced.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: () => { restoreBackup(selected.backup); setDriveStatus(`Restored ${selected.backup.transactions.length} payments.`); } },
      ]);
    } catch (error) {
      Alert.alert('Could not restore backup', error instanceof Error ? error.message : 'Choose another backup file.');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F3F7F8' }}>
      <ScrollView className="bg-paper" contentContainerStyle={{ gap: 24, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 16 }} keyboardShouldPersistTaps="handled">
        <View><Text className="text-[30px] font-extrabold tracking-[-1.2px] text-ink">Settings</Text><Text className="mt-1 text-[13px] leading-5 text-ink-muted">Manage imports, categories, and a copy of your local ledger.</Text></View>

        <View className="rounded-2xl bg-white">
          <Link href={'/import' as Href} asChild><Pressable className="flex-row items-center gap-3 p-4 active:opacity-75"><View className="h-10 w-10 items-center justify-center rounded-full bg-teal-pale"><FolderUp size={19} color="#116F6B" strokeWidth={2} /></View><View className="flex-1"><Text className="text-[14px] font-bold text-ink">Import statement</Text><Text className="mt-0.5 text-[11px] text-ink-muted">Paytm Excel, BHIM PDF, and Google Pay PDF</Text></View><ChevronRight size={18} color="#637687" strokeWidth={2} /></Pressable></Link>
        </View>

        <View className="gap-3"><View className="flex-row items-center gap-2"><Tag size={17} color="#116F6B" strokeWidth={2} /><Text className="text-[18px] font-bold tracking-[-0.4px] text-ink">Custom categories</Text></View><View className="rounded-2xl bg-white p-4"><Text className="text-[12px] leading-5 text-ink-muted">Custom tags appear alongside the standard categories when adding a payment.</Text><View className="mt-4 flex-row gap-2"><TextInput value={name} onChangeText={setName} placeholder="Category name" placeholderTextColorClassName="accent-ink-muted" selectionColorClassName="accent-teal" cursorColorClassName="accent-teal" className="flex-1 rounded-xl bg-mist px-3 py-3 text-[14px] font-semibold text-ink" /><Pressable onPress={() => void addCategory()} accessibilityLabel="Add category" className="h-11 w-11 items-center justify-center rounded-xl bg-teal active:opacity-80"><Plus size={20} color="#FFFFFF" strokeWidth={2.5} /></Pressable></View><Text className="mt-4 text-[11px] font-bold text-ink-muted">Choose an icon</Text><View className="mt-2 flex-row flex-wrap gap-2">{categoryIconOptions.map((option) => { const Icon = getCategoryIcon(option.key); return <Pressable key={option.key} onPress={() => setIcon(option.key)} accessibilityLabel={`Use ${option.label} icon`} className={`h-10 w-10 items-center justify-center rounded-xl active:opacity-80 ${icon === option.key ? 'bg-ink' : 'bg-mist'}`}><Icon size={18} color={icon === option.key ? '#FFFFFF' : '#637687'} strokeWidth={2} /></Pressable>; })}</View></View><View className="divide-y divide-line rounded-2xl bg-white px-4">{categories.length ? categories.map((category) => { const Icon = getCategoryIcon(category.icon); return <View key={category.id} className="flex-row items-center gap-3 py-3.5"><View className="h-9 w-9 items-center justify-center rounded-full bg-teal-pale"><Icon size={17} color="#116F6B" strokeWidth={2} /></View><Text className="flex-1 text-[14px] font-semibold text-ink">{category.name}</Text><Pressable onPress={() => removeCategory(category.id, category.name)} accessibilityLabel={`Remove ${category.name}`} className="h-9 w-9 items-center justify-center rounded-full bg-coral-pale active:opacity-75"><Trash2 size={16} color="#C85949" strokeWidth={2} /></Pressable></View>; }) : <View className="py-5"><Text className="text-[13px] font-semibold text-ink">No custom categories yet</Text><Text className="mt-1 text-[11px] leading-5 text-ink-muted">Add a tag for spending that does not fit the defaults.</Text></View>}</View></View>

        <View className="gap-3"><View className="flex-row items-center gap-2"><DatabaseBackup size={17} color="#116F6B" strokeWidth={2} /><Text className="text-[18px] font-bold tracking-[-0.4px] text-ink">Backup and restore</Text></View><View className="rounded-2xl bg-white p-4"><Text className="text-[12px] leading-5 text-ink-muted">Your backup includes {transactionRows?.length ?? 0} payments, budgets, and custom categories. Restore replaces the current ledger only after integrity checks pass.</Text><Pressable disabled={isBackingUp} onPress={() => void exportBackup()} className={`mt-4 flex-row items-center justify-center gap-2 rounded-xl py-3.5 active:opacity-80 ${isBackingUp ? 'bg-slate' : 'bg-teal'}`}><FileDown size={18} color="#FFFFFF" strokeWidth={2} /><Text className="text-[14px] font-bold text-white">{isBackingUp ? 'Creating backup...' : 'Save offline backup'}</Text></Pressable><Pressable onPress={() => void restoreLocalBackup()} className="mt-2 flex-row items-center justify-center gap-2 rounded-xl bg-mist py-3.5 active:opacity-80"><DatabaseBackup size={18} color="#112A3D" strokeWidth={2} /><Text className="text-[14px] font-bold text-ink">Restore a backup</Text></Pressable></View></View>

        <View className="gap-3"><View className="flex-row items-center gap-2"><Cloud size={17} color="#116F6B" strokeWidth={2} /><Text className="text-[18px] font-bold tracking-[-0.4px] text-ink">Google Drive</Text></View><View className="rounded-2xl bg-white p-4"><Text className="text-[12px] leading-5 text-ink-muted">Create an independent backup in your own Google Drive. Kripon only requests permission to create files that it owns.</Text><Pressable disabled={!hasGoogleDriveConfig || !request} onPress={() => void promptAsync()} className={`mt-4 flex-row items-center justify-center gap-2 rounded-xl py-3.5 active:opacity-80 ${hasGoogleDriveConfig && request ? 'bg-ink' : 'bg-slate'}`}><Cloud size={18} color="#FFFFFF" strokeWidth={2} /><Text className="text-[14px] font-bold text-white">{hasGoogleDriveConfig ? 'Back up to Google Drive' : 'Google Drive not configured'}</Text></Pressable>{!hasGoogleDriveConfig ? <Text className="mt-3 text-[11px] leading-5 text-ink-muted">Add Google OAuth iOS, Android, and web client IDs to the app configuration to enable this private connection.</Text> : null}{driveStatus ? <Text className="mt-3 text-[12px] font-semibold leading-5 text-teal">{driveStatus}</Text> : null}</View></View>
      </ScrollView>
    </SafeAreaView>
  );
}
