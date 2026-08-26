import { desc, sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Link, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BudgetProgress } from '@/components/budget-progress';
import { SectionHeading } from '@/components/section-heading';
import { TransactionRow } from '@/components/transaction-row';
import { db } from '@/db';
import { budgets, transactions } from '@/db/schema';
import { budgetPeriodStart } from '@/lib/budgets';
import { formatCompactMoney, formatMoney } from '@/lib/format';
import type { BudgetCadence } from '@/db/schema';

const spendExpression = (sinceMs: number) =>
  sql<number>`coalesce(sum(case when direction = 'debit' and category <> 'Transfers' and occurred_at >= ${sinceMs} then amount_paise else 0 end), 0)`;

export default function OverviewScreen() {
  // Aggregates run in SQLite instead of loading every row into JS.
  const { data: totalsRows } = useLiveQuery(db.select({
    received: sql<number>`coalesce(sum(case when direction = 'credit' then amount_paise else 0 end), 0)`,
    spent: sql<number>`coalesce(sum(case when direction = 'debit' then amount_paise else 0 end), 0)`,
    weekly: spendExpression(budgetPeriodStart('weekly').getTime()),
    monthly: spendExpression(budgetPeriodStart('monthly').getTime()),
  }).from(transactions));
  const { data: budgetRows } = useLiveQuery(db.select().from(budgets));
  const { data: recent } = useLiveQuery(db.select().from(transactions).orderBy(desc(transactions.occurredAt)).limit(4));

  const received = Number(totalsRows?.[0]?.received ?? 0);
  const paid = Number(totalsRows?.[0]?.spent ?? 0);
  const budgetList = budgetRows ?? [];
  const budgetByCadence = (cadence: BudgetCadence) => {
    const limit = budgetList.find((budget) => budget.cadence === cadence);
    if (!limit) return null;
    const spent = Number(totalsRows?.[0]?.[cadence] ?? 0);
    return { ...limit, spent };
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F7F6F1' }}>
      <ScrollView className="bg-paper" contentContainerStyle={{ gap: 20, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 16 }}>
        <Text className="text-[30px] font-extrabold tracking-[-1.2px] text-ink">Kripon</Text>

        <View className="overflow-hidden rounded-2xl bg-ink p-5">
          <View className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-teal-shade" />
          <Text className="text-[11px] font-bold uppercase tracking-[1.4px] text-white-muted">Ledger balance</Text>
          <Text selectable className="mt-2 text-[38px] font-extrabold tracking-[-1.7px] text-white">{formatCompactMoney(received - paid)}</Text>
          <View className="mt-6 flex-row border-t border-white-line pt-4">
            <View className="flex-1"><Text className="text-[11px] text-white-muted">Received</Text><Text selectable className="mt-1 text-[16px] font-bold text-teal-pale">+{formatMoney(received)}</Text></View>
            <View className="w-px bg-white-line" />
            <View className="flex-1 pl-5"><Text className="text-[11px] text-white-muted">Spent</Text><Text selectable className="mt-1 text-[16px] font-bold text-white">-{formatMoney(paid)}</Text></View>
          </View>
        </View>

        <View className="gap-3">
          <SectionHeading title="Budget" actionLink={{ label: 'Manage', href: '/budget' }} />
          {(() => {
            const cards = (['weekly', 'monthly'] as const).map((cadence) => ({ cadence, budget: budgetByCadence(cadence) })).filter((card) => card.budget);
            if (!cards.length) {
              return (
                <Link href={'/budget' as Href} asChild>
                  <Pressable className="flex-row items-center justify-between rounded-2xl bg-white p-4 active:opacity-80">
                    <Text className="text-[14px] font-bold text-ink">Set a weekly or monthly budget</Text>
                    <Text className="text-[12px] font-bold text-teal">Add</Text>
                  </Pressable>
                </Link>
              );
            }
            return cards.map(({ cadence, budget }) => (
              <View key={cadence} className="rounded-2xl bg-white p-4">
                <BudgetProgress cadence={cadence} limit={budget!.amountPaise} spent={budget!.spent} />
              </View>
            ));
          })()}
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <SectionHeading title="Recent activity" />
            <Link href={'/activity' as Href} asChild><Text className="text-[12px] font-bold text-teal">See all</Text></Link>
          </View>
          <View className="divide-y divide-line rounded-2xl bg-white px-4">
            {(recent ?? []).map((item) => <TransactionRow key={item.id} item={item} />)}
          </View>
          {!recent?.length ? (
            <Link href={'/import' as Href} asChild>
              <Pressable className="items-center rounded-2xl bg-mist py-3 active:opacity-80"><Text className="text-[13px] font-bold text-ink">Import your first statement</Text></Pressable>
            </Link>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

