import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db';
import { budgets, transactions, type BudgetCadence } from '@/db/schema';
import { amountToPaise, sanitizeAmountInput } from '@/lib/amount';
import { budgetPeriodStart } from '@/lib/budgets';
import { budgetExemptCategories } from '@/lib/categories';
import { formatMoney } from '@/lib/format';

const cadences: BudgetCadence[] = ['weekly', 'monthly'];

const exemptCategoriesSql = sql.join(budgetExemptCategories.map((category) => sql`${category}`), sql`, `);

/** Compact inline budget editor: set a limit per cadence and see live progress. */
export function BudgetSettings() {
  const { data: budgetRows } = useLiveQuery(db.select().from(budgets));
  const { data: spendRows } = useLiveQuery(db.select({
    weekly: sql<number>`coalesce(sum(case when direction = 'debit' and category not in (${exemptCategoriesSql}) and occurred_at >= ${budgetPeriodStart('weekly').getTime()} then amount_paise else 0 end), 0)`,
    monthly: sql<number>`coalesce(sum(case when direction = 'debit' and category not in (${exemptCategoriesSql}) and occurred_at >= ${budgetPeriodStart('monthly').getTime()} then amount_paise else 0 end), 0)`,
  }).from(transactions));
  const list = budgetRows ?? [];

  return (
    <View className="gap-4">
      {cadences.map((cadence) => {
        const limit = list.find((budget) => budget.cadence === cadence)?.amountPaise ?? null;
        const spent = Number(spendRows?.[0]?.[cadence] ?? 0);
        return <BudgetRow key={cadence} cadence={cadence} limit={limit} spent={spent} />;
      })}
    </View>
  );
}

function BudgetRow({ cadence, limit, spent }: { cadence: BudgetCadence; limit: number | null; spent: number }) {
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

  const remove = () => {
    if (limit === null) return;
    void db.delete(budgets).where(eq(budgets.cadence, cadence));
  };

  const percentage = limit ? Math.min(Math.round((spent / Math.max(limit, 1)) * 100), 100) : 0;
  const overBudget = limit !== null && spent > limit;

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center gap-2">
        <Text className="w-[68px] text-[10px] font-bold uppercase tracking-[1px] text-ink-muted">{cadence}</Text>
        <View className="flex-1 flex-row items-center rounded-xl bg-mist px-2">
          <Text className="mr-1 text-[13px] font-bold text-ink">₹</Text>
          <TextInput
            value={amount}
            onChangeText={(input) => setAmount(sanitizeAmountInput(input))}
            onEndEditing={() => void save()}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="Set limit"
            placeholderTextColorClassName="accent-ink-faint"
            selectionColorClassName="accent-teal"
            cursorColorClassName="accent-teal"
            className="flex-1 py-2 text-[13px] font-bold text-ink"
          />
        </View>
        {limit !== null ? (
          <Pressable accessibilityLabel={`Remove ${cadence} budget`} onPress={remove} className="active:opacity-60">
            <Text className="text-[11px] font-bold text-coral">Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {limit ? (
        <>
          <View className="h-1.5 overflow-hidden rounded-full bg-line">
            <View className={overBudget ? 'h-full rounded-full bg-coral' : 'h-full rounded-full bg-teal'} style={{ width: `${percentage}%` }} />
          </View>
          <Text selectable className={`text-[10px] font-bold ${overBudget ? 'text-coral' : 'text-teal'}`}>
            {formatMoney(spent)} spent · {overBudget ? `${formatMoney(spent - limit)} over` : `${formatMoney(limit - spent)} left`}
          </Text>
        </>
      ) : null}
    </View>
  );
}
