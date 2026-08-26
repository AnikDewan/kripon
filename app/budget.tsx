import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';

import { BudgetProgress } from '@/components/budget-progress';
import { db } from '@/db';
import { budgets, transactions, type BudgetCadence } from '@/db/schema';
import { budgetSpend } from '@/lib/budgets';

const cadenceOptions: Array<{ value: BudgetCadence; label: string; description: string }> = [
  { value: 'weekly', label: 'Weekly', description: 'Resets every Sunday' },
  { value: 'monthly', label: 'Monthly', description: 'Resets on the first day' },
];

export default function BudgetScreen() {
  const { data: budgetRows } = useLiveQuery(db.select().from(budgets));
  const { data: transactionRows } = useLiveQuery(db.select().from(transactions));
  const [cadence, setCadence] = useState<BudgetCadence>('monthly');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const selectedBudget = (budgetRows ?? []).find((budget) => budget.cadence === cadence);

  useEffect(() => {
    setAmount(selectedBudget ? String(selectedBudget.amountPaise / 100) : '');
  }, [cadence, selectedBudget?.updatedAt]);

  const save = async () => {
    const amountPaise = Math.round(Number(amount.replace(/[^0-9.]/g, '')) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      Alert.alert('Enter a budget amount', 'Use an amount greater than zero.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      await db.insert(budgets).values({
        id: `budget-${cadence}`,
        cadence,
        amountPaise,
        createdAt: now,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: budgets.cadence,
        set: { amountPaise, updatedAt: now },
      });
      router.back();
    } catch {
      Alert.alert('Could not save budget', 'Try saving the budget again.');
    } finally {
      setSaving(false);
    }
  };

  const currentSpend = budgetSpend(transactionRows ?? [], cadence);
  const previewLimit = Math.round(Number(amount.replace(/[^0-9.]/g, '')) * 100);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#F7F6F1' }}>
      <ScrollView className="bg-paper" contentContainerStyle={{ gap: 24, paddingHorizontal: 20, paddingBottom: 32, paddingTop: 16 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center justify-between"><View><Text className="text-[28px] font-extrabold tracking-[-1.1px] text-ink">Set budget</Text><Text className="mt-1 text-[12px] text-ink-muted">Choose a limit that helps you decide sooner.</Text></View><Pressable onPress={() => router.back()} accessibilityLabel="Cancel" className="h-10 w-10 items-center justify-center rounded-full bg-white active:opacity-70"><X size={20} color="#112A3D" strokeWidth={2} /></Pressable></View>
        <Text className="text-[13px] leading-5 text-ink-muted">Kripon counts completed expense categories in the current period. Person-to-person transfers stay outside this budget.</Text>

        <View className="gap-2"><Text className="text-[12px] font-bold text-ink">Budget period</Text><View className="gap-2">{cadenceOptions.map((item) => <Pressable key={item.value} onPress={() => setCadence(item.value)} className={`flex-row items-center justify-between rounded-2xl p-4 active:opacity-80 ${cadence === item.value ? 'bg-ink' : 'bg-white'}`}><View><Text className={`text-[14px] font-bold ${cadence === item.value ? 'text-white' : 'text-ink'}`}>{item.label}</Text><Text className={`mt-0.5 text-[11px] ${cadence === item.value ? 'text-white-muted' : 'text-ink-muted'}`}>{item.description}</Text></View>{cadence === item.value ? <View className="h-7 w-7 items-center justify-center rounded-full bg-teal"><Check size={15} color="#FFFFFF" strokeWidth={2.5} /></View> : <View className="h-7 w-7 rounded-full border border-line" />}</Pressable>)}</View></View>

        <View className="gap-2"><Text className="text-[12px] font-bold text-ink">Limit</Text><View className="flex-row items-center rounded-2xl border border-line bg-white px-4"><Text className="mr-2 text-[22px] font-bold text-ink">₹</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="10,000" placeholderTextColorClassName="accent-ink-muted" selectionColorClassName="accent-teal" cursorColorClassName="accent-teal" className="flex-1 py-4 text-[24px] font-extrabold text-ink focus:border-teal" /></View></View>

        {Number.isFinite(previewLimit) && previewLimit > 0 ? <View className="rounded-2xl bg-white p-4"><BudgetProgress cadence={cadence} limit={previewLimit} spent={currentSpend} /></View> : <View className="rounded-2xl bg-sand p-4"><Text className="text-[14px] font-bold text-ink">Your progress will appear here</Text><Text className="mt-1 text-[12px] leading-5 text-ink-muted">Set a limit to compare the current period’s spend against your plan.</Text></View>}

        <Pressable disabled={saving} onPress={save} className={`items-center rounded-2xl py-4 active:opacity-80 ${saving ? 'bg-slate' : 'bg-teal'}`}><Text className="text-[15px] font-bold text-white">{saving ? 'Saving...' : selectedBudget ? 'Update budget' : 'Save budget'}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
