import { desc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Link, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, ChevronRight, Flag, Plus } from 'lucide-react-native';

import { BudgetProgress } from '@/components/budget-progress';
import { SectionHeading } from '@/components/section-heading';
import { TransactionRow } from '@/components/transaction-row';
import { db } from '@/db';
import { budgets, transactions } from '@/db/schema';
import { budgetSpend } from '@/lib/budgets';
import { formatCompactMoney, formatMoney } from '@/lib/format';

export default function OverviewScreen() {
  const { data } = useLiveQuery(db.select().from(transactions).orderBy(desc(transactions.occurredAt)));
  const { data: budgetRows } = useLiveQuery(db.select().from(budgets));
  const items = data ?? [];
  const paid = items.filter((item) => item.direction === 'debit').reduce((sum, item) => sum + item.amountPaise, 0);
  const received = items.filter((item) => item.direction === 'credit').reduce((sum, item) => sum + item.amountPaise, 0);
  const monthlyBudget = (budgetRows ?? []).find((budget) => budget.cadence === 'monthly');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F7F6F1' }}>
    <ScrollView className="bg-paper" contentContainerStyle={{ gap: 24, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 16 }}>
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-[28px] font-extrabold tracking-[-1.2px] text-ink">Kripon</Text>
          <Text className="mt-0.5 text-[12px] text-ink-muted">Your UPI ledger, in one place</Text>
        </View>
        <Link href={'/add-transaction' as Href} asChild><Pressable accessibilityLabel="Add transaction" className="h-11 w-11 items-center justify-center rounded-full bg-teal active:opacity-80"><Plus size={24} color="#FFFFFF" strokeWidth={2.5} /></Pressable></Link>
      </View>

      <View className="overflow-hidden rounded-2xl bg-ink p-5">
        <View className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-teal-shade" />
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-[11px] font-bold uppercase tracking-[1.4px] text-white-muted">Ledger balance</Text>
            <Text selectable className="mt-2 text-[38px] font-extrabold tracking-[-1.7px] text-white">{formatCompactMoney(received - paid)}</Text>
          </View>
          {/* <View className="items-end">
            <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-white-muted">All imports</Text>
            <Text className="mt-1 text-[12px] font-semibold text-teal-pale">Updated live</Text>
          </View> */}
        </View>
        <View className="mt-6 flex-row border-t border-white-line pt-4">
          <View className="flex-1"><Text className="text-[11px] text-white-muted">Received</Text><Text selectable className="mt-1 text-[16px] font-bold text-teal-pale">+{formatMoney(received)}</Text></View>
          <View className="w-px bg-white-line" />
          <View className="flex-1 pl-5"><Text className="text-[11px] text-white-muted">Spent</Text><Text selectable className="mt-1 text-[16px] font-bold text-white">-{formatMoney(paid)}</Text></View>
        </View>
      </View>

      <View className="gap-3">
        <SectionHeading title="Budget" action={monthlyBudget ? 'Manage' : 'Set a limit'} />
        {monthlyBudget ? (
          <Link href={'/budget' as Href} asChild><Pressable className="rounded-2xl bg-white p-4 active:opacity-80"><BudgetProgress cadence="monthly" limit={monthlyBudget.amountPaise} spent={budgetSpend(items, 'monthly')} /></Pressable></Link>
        ) : (
          <Link href={'/budget' as Href} asChild><Pressable className="flex-row items-center gap-3 rounded-2xl bg-teal-pale p-4 active:opacity-80"><View className="h-10 w-10 items-center justify-center rounded-full bg-teal"><Flag size={18} color="#FFFFFF" strokeWidth={2} /></View><View className="flex-1"><Text className="text-[14px] font-bold text-ink">Set a weekly or monthly budget</Text><Text className="mt-1 text-[12px] leading-5 text-ink-muted">See what is left before the next reset.</Text></View><ChevronRight size={18} color="#116F6B" strokeWidth={2} /></Pressable></Link>
        )}
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between"><SectionHeading title="Recent activity" /><Link href={'/activity' as Href} asChild><Pressable className="flex-row items-center gap-1 active:opacity-70"><Text className="text-[12px] font-bold text-teal">See all</Text><ArrowRight size={14} color="#116F6B" strokeWidth={2} /></Pressable></Link></View>
        <View className="divide-y divide-line rounded-2xl bg-white px-4">
          {items.slice(0, 4).map((item) => <TransactionRow key={item.id} item={item} />)}
        </View>
        {!items.length ? <Link href={'/import' as Href} asChild><Pressable className="items-center rounded-2xl bg-mist py-3 active:opacity-80"><Text className="text-[13px] font-bold text-ink">Import your first statement</Text></Pressable></Link> : null}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
