import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NativeDatePicker } from '@/components/native-date-picker';
import { db } from '@/db';
import { transactions } from '@/db/schema';
import { amountToPaise, sanitizeAmountInput } from '@/lib/amount';
import { allCategories } from '@/lib/categories';

const directions = [
  { value: 'debit', label: 'Expense' },
  { value: 'credit', label: 'Income' },
] as const;

export default function AddTransactionScreen() {
  const [counterparty, setCounterparty] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(allCategories.at(-1)!);
  const [direction, setDirection] = useState<'debit' | 'credit'>('debit');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const formattedDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(occurredAt);

  const save = async () => {
    const amountPaise = amountToPaise(amount);
    if (!counterparty.trim() || !amountPaise) {
      Alert.alert('Missing details', 'Enter a name and an amount greater than zero.');
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
        <ScrollView className="bg-paper" contentContainerStyle={{ gap: 20, paddingHorizontal: 20, paddingBottom: 32, paddingTop: 16 }} keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center justify-between">
            <Text className="text-[28px] font-extrabold tracking-[-1.1px] text-ink">Add transaction</Text>
            <Pressable onPress={() => router.back()} accessibilityLabel="Cancel" className="h-10 w-10 items-center justify-center rounded-full bg-white active:opacity-70"><Text className="text-[18px] font-bold text-ink">✕</Text></Pressable>
          </View>

          <View className="gap-2">
            <Text className="text-[12px] font-bold text-ink">Name</Text>
            <TextInput value={counterparty} onChangeText={setCounterparty} autoFocus placeholder="Who was it?" placeholderTextColorClassName="accent-ink-muted" selectionColorClassName="accent-teal" cursorColorClassName="accent-teal" className="rounded-2xl border border-line bg-white px-4 py-4 text-[16px] font-semibold text-ink focus:border-teal" />
          </View>

          <View className="gap-2">
            <Text className="text-[12px] font-bold text-ink">Amount</Text>
            <View className="flex-row items-center rounded-2xl border border-line bg-white px-4">
              <Text className="mr-2 text-[22px] font-bold text-ink">₹</Text>
              <TextInput
                value={amount}
                onChangeText={(input) => setAmount(sanitizeAmountInput(input))}
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholder="0"
                placeholderTextColorClassName="accent-ink-muted"
                selectionColorClassName="accent-teal"
                cursorColorClassName="accent-teal"
                className="flex-1 py-4 text-[24px] font-extrabold text-ink focus:border-teal"
              />
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-[12px] font-bold text-ink">Date</Text>
            <Pressable onPress={() => setShowDatePicker(true)} className="flex-row items-center justify-between rounded-2xl border border-line bg-white px-4 py-3.5 active:opacity-80">
              <Text className="text-[14px] font-semibold text-ink">{formattedDate}</Text>
              <Text className="text-[12px] font-bold text-teal">Change</Text>
            </Pressable>
            {showDatePicker ? <NativeDatePicker value={occurredAt} maximumDate={new Date()} onConfirm={(date) => { setShowDatePicker(false); setOccurredAt(date); }} onCancel={() => setShowDatePicker(false)} /> : null}
          </View>

          <View className="gap-2">
            <Text className="text-[12px] font-bold text-ink">Type</Text>
            <View className="flex-row gap-2">
              {directions.map((item) => (
                <Pressable key={item.value} onPress={() => setDirection(item.value)} className={`flex-1 rounded-2xl py-3 active:opacity-80 ${direction === item.value ? item.value === 'debit' ? 'bg-coral' : 'bg-teal' : 'bg-white'}`}>
                  <Text className={`text-center text-[13px] font-bold ${direction === item.value ? 'text-white' : 'text-ink-muted'}`}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-[12px] font-bold text-ink">Category</Text>
            <View className="flex-row flex-wrap gap-2">
              {allCategories.map((item) => (
                <Pressable key={item} onPress={() => setCategory(item)} className={`rounded-full px-3 py-2 active:opacity-80 ${category === item ? 'bg-ink' : 'bg-white'}`}>
                  <Text className={`text-[12px] font-bold ${category === item ? 'text-white' : 'text-ink-muted'}`}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable disabled={saving} onPress={save} className={`items-center rounded-2xl py-4 active:opacity-80 ${saving ? 'bg-slate' : 'bg-teal'}`}><Text className="text-[15px] font-bold text-white">{saving ? 'Saving...' : 'Save transaction'}</Text></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
