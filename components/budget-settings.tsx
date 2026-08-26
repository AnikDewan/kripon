import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db';
import { budgets, type BudgetCadence } from '@/db/schema';
import { amountToPaise, sanitizeAmountInput } from '@/lib/amount';

const cadences: Array<{ value: BudgetCadence; label: string }> = [
  { value: 'weekly', label: 'Weekly budget' },
  { value: 'monthly', label: 'Monthly budget' },
];

/** Budget limit editor in Settings; progress lives on the Overview tab. */
export function BudgetSettings() {
  const { data: budgetRows } = useLiveQuery(db.select().from(budgets));
  const list = budgetRows ?? [];

  return (
    <View className="gap-5">
      {cadences.map(({ value, label }) => (
        <BudgetRow key={value} cadence={value} label={label} limit={list.find((budget) => budget.cadence === value)?.amountPaise ?? null} />
      ))}
    </View>
  );
}

function BudgetRow({ cadence, label, limit }: { cadence: BudgetCadence; label: string; limit: number | null }) {
  const [amount, setAmount] = useState(limit ? String(limit / 100) : '');
  useEffect(() => setAmount(limit ? String(limit / 100) : ''), [limit]);

  const save = async () => {
    const amountPaise = amountToPaise(amount);
    if (!amountPaise || amountPaise === limit) return;
    const now = new Date();
    await db.insert(budgets).values({
      id: `budget-${cadence}`,
      cadence,
      amountPaise,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({ target: budgets.cadence, set: { amountPaise, updatedAt: now } });
  };

  const canSave = Boolean(amountToPaise(amount));

  return (
    <View className="gap-2">
      <Text className="text-[13px] font-bold text-ink">{label}</Text>
      <View className="flex-row items-center gap-2">
        <View className="flex-row flex-1 items-center rounded-xl border border-line bg-white px-3">
          <Text className="mr-2 text-[16px] font-bold text-ink">₹</Text>
          <TextInput
            value={amount}
            onChangeText={(input) => setAmount(sanitizeAmountInput(input))}
            onEndEditing={() => void save()}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="Set a limit"
            placeholderTextColorClassName="accent-ink-faint"
            selectionColorClassName="accent-teal"
            cursorColorClassName="accent-teal"
            className="flex-1 py-3 text-[15px] font-bold text-ink"
          />
        </View>
        <Pressable
          accessibilityLabel={`Save ${cadence} budget`}
          disabled={!canSave}
          onPress={() => void save()}
          className={`rounded-xl px-4 py-3 active:opacity-70 ${canSave ? 'bg-teal' : 'bg-mist'}`}
        >
          <Text className={`text-[13px] font-bold ${canSave ? 'text-white' : 'text-ink-faint'}`}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}
