import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays, ChevronDown, X } from 'lucide-react-native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db';
import { customCategories, transactions } from '@/db/schema';
import { defaultCategories } from '@/lib/categories';

const directions = [
  { value: 'debit', label: 'Expense' },
  { value: 'credit', label: 'Income' },
] as const;

export default function AddTransactionScreen() {
  const { data: customCategoryRows } = useLiveQuery(db.select().from(customCategories).orderBy(customCategories.name));
  const [counterparty, setCounterparty] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [direction, setDirection] = useState<'debit' | 'credit'>('debit');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const categories = [...defaultCategories, ...(customCategoryRows ?? []).map((item) => item.name)];
  const formattedDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(occurredAt);

  const save = async () => {
    const amountPaise = Math.round(Number(amount.replace(/[^0-9.]/g, '')) * 100);
    if (!counterparty.trim() || !Number.isFinite(amountPaise) || amountPaise <= 0) {
      Alert.alert('Add the payment details', 'Enter who the payment was for and an amount greater than zero.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      await db.insert(transactions).values({
        id: `manual-${now.getTime()}`,
        occurredAt,
        counterparty: counterparty.trim(),
        amountPaise,
        direction,
        category,
        source: 'Manual',
        reference: null,
        status: 'SUCCESS',
        sourceFile: null,
        createdAt: now,
      });
      router.back();
    } catch {
      Alert.alert('Could not save transaction', 'Try saving the transaction again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#F7F6F1' }}>
      <KeyboardAvoidingView className="flex-1" behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
        <ScrollView className="bg-paper" contentContainerStyle={{ gap: 24, paddingHorizontal: 20, paddingBottom: 32, paddingTop: 16 }} keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center justify-between">
            <View><Text className="text-[28px] font-extrabold tracking-[-1.1px] text-ink">Add transaction</Text><Text className="mt-1 text-[12px] text-ink-muted">Manual entries stay separate from imports.</Text></View>
            <Pressable onPress={() => router.back()} accessibilityLabel="Cancel" className="h-10 w-10 items-center justify-center rounded-full bg-white active:opacity-70"><X size={20} color="#112A3D" strokeWidth={2} /></Pressable>
          </View>

          <View className="gap-2"><Text className="text-[12px] font-bold text-ink">What was this for?</Text><TextInput value={counterparty} onChangeText={setCounterparty} autoFocus placeholder="Example: Lunch at Arsalan" placeholderTextColorClassName="accent-ink-muted" selectionColorClassName="accent-teal" cursorColorClassName="accent-teal" className="rounded-2xl border border-line bg-white px-4 py-4 text-[16px] font-semibold text-ink focus:border-teal" /></View>
          <View className="gap-2"><Text className="text-[12px] font-bold text-ink">Amount</Text><View className="flex-row items-center rounded-2xl border border-line bg-white px-4"><Text className="mr-2 text-[22px] font-bold text-ink">₹</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" placeholderTextColorClassName="accent-ink-muted" selectionColorClassName="accent-teal" cursorColorClassName="accent-teal" className="flex-1 py-4 text-[24px] font-extrabold text-ink focus:border-teal" /></View></View>

          <View className="gap-2"><Text className="text-[12px] font-bold text-ink">Date</Text><Pressable onPress={() => setShowDatePicker(true)} className="flex-row items-center justify-between rounded-2xl border border-line bg-white px-4 py-3.5 active:opacity-80"><View className="flex-row items-center gap-3"><View className="h-9 w-9 items-center justify-center rounded-full bg-teal-pale"><CalendarDays size={18} color="#116F6B" strokeWidth={2} /></View><View><Text className="text-[14px] font-semibold text-ink">{formattedDate}</Text><Text className="mt-0.5 text-[11px] text-ink-muted">Tap to choose an earlier date</Text></View></View><ChevronDown size={17} color="#637687" strokeWidth={2} /></Pressable></View>
          {showDatePicker ? <DateTimePicker value={occurredAt} mode="date" maximumDate={new Date()} onValueChange={(_, selectedDate) => { setShowDatePicker(false); if (selectedDate) setOccurredAt(selectedDate); }} /> : null}

          <View className="gap-2"><Text className="text-[12px] font-bold text-ink">Type</Text><View className="flex-row gap-2">{directions.map((item) => <Pressable key={item.value} onPress={() => setDirection(item.value)} className={`flex-1 rounded-2xl py-3 active:opacity-80 ${direction === item.value ? item.value === 'debit' ? 'bg-coral' : 'bg-teal' : 'bg-white'}`}><Text className={`text-center text-[13px] font-bold ${direction === item.value ? 'text-white' : 'text-ink-muted'}`}>{item.label}</Text></Pressable>)}</View></View>

          <View className="gap-2"><Text className="text-[12px] font-bold text-ink">Category</Text><View className="flex-row flex-wrap gap-2">{categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} className={`rounded-full px-3 py-2 active:opacity-80 ${category === item ? 'bg-ink' : 'bg-white'}`}><Text className={`text-[12px] font-bold ${category === item ? 'text-white' : 'text-ink-muted'}`}>{item}</Text></Pressable>)}</View></View>

          <View className="rounded-2xl bg-sand p-4"><Text className="text-[12px] font-bold text-ink">Saved for {formattedDate}</Text><Text className="mt-1 text-[12px] leading-5 text-ink-muted">Manual entries are stored locally and marked separately from imported UPI payments.</Text></View>
          <Pressable disabled={saving} onPress={save} className={`items-center rounded-2xl py-4 active:opacity-80 ${saving ? 'bg-slate' : 'bg-teal'}`}><Text className="text-[15px] font-bold text-white">{saving ? 'Saving...' : 'Save transaction'}</Text></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
