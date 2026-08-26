import { desc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Link, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText } from 'lucide-react-native';

import { CategoryBar } from '@/components/category-bar';
import { BudgetProgress } from '@/components/budget-progress';
import { BudgetPaceChart, BudgetUtilizationChart, CategoryAllocationChart, MonthlySpendChart, WeekdaySpendChart } from '@/components/insight-charts';
import { SectionHeading } from '@/components/section-heading';
import { db } from '@/db';
import { budgets, transactions } from '@/db/schema';
import { budgetSpend } from '@/lib/budgets';
import { formatCompactMoney, formatMoney } from '@/lib/format';

const sources = ['Paytm', 'BHIM', 'GPay'] as const;
const sourceColors = { Paytm: '#7593A5', BHIM: '#116F6B', GPay: '#3E657B' };
const categoryColors = ['#116F6B', '#4C918B', '#7EB5AE', '#A8D1CB', '#C4DEDA'];
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const monthLabel = (year: number, month: number) => new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(year, month, 1));

export default function InsightsScreen() {
  const { data } = useLiveQuery(db.select().from(transactions).orderBy(desc(transactions.occurredAt)));
  const { data: budgetRows } = useLiveQuery(db.select().from(budgets));
  const items = data ?? [];
  const activeBudgets = budgetRows ?? [];
  const expenses = items.filter((item) => item.direction === 'debit');
  const total = expenses.reduce((sum, item) => sum + item.amountPaise, 0);
  const largest = [...expenses].sort((a, b) => b.amountPaise - a.amountPaise)[0];
  const sourceSpend = sources.map((source) => ({ source, amount: expenses.filter((item) => item.source === source).reduce((sum, item) => sum + item.amountPaise, 0) }));
  const categorySpend = Object.entries(expenses.reduce<Record<string, number>>((map, item) => ({ ...map, [item.category]: (map[item.category] ?? 0) + item.amountPaise }), {})).sort((a, b) => b[1] - a[1]);
  const categoryChartData = categorySpend.slice(0, 5).map(([label, amount], index) => ({ label, amount: Math.round(amount / 100), color: categoryColors[index] ?? categoryColors.at(-1)! }));
  const weekdaySpend = weekdayLabels.map((label, index) => ({
    label,
    amount: Math.round(expenses.filter((item) => item.occurredAt.getDay() === index).reduce((sum, item) => sum + item.amountPaise, 0) / 100),
  }));
  const highDay = [...weekdaySpend].sort((a, b) => b.amount - a.amount)[0];
  const monthKeys = [...new Set(expenses.map((item) => `${item.occurredAt.getFullYear()}-${String(item.occurredAt.getMonth()).padStart(2, '0')}`))].sort().slice(-6);
  const monthlySpend = monthKeys.map((key) => {
    const [year, month] = key.split('-').map(Number);
    return {
      label: monthLabel(year, month),
      amount: Math.round(expenses.filter((item) => item.occurredAt.getFullYear() === year && item.occurredAt.getMonth() === month).reduce((sum, item) => sum + item.amountPaise, 0) / 100),
    };
  });
  const monthlyBudget = activeBudgets.find((budget) => budget.cadence === 'monthly');
  const budgetChartData = activeBudgets.map((budget) => ({
    label: budget.cadence === 'monthly' ? 'Monthly' : 'Weekly',
    value: Math.min(budgetSpend(items, budget.cadence) / Math.max(budget.amountPaise, 1), 1),
    color: budget.cadence === 'monthly' ? '#116F6B' : '#82B8B0',
  }));
  const now = new Date();
  const daysElapsed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let runningSpend = 0;
  const monthlyBudgetPace = monthlyBudget ? Array.from({ length: daysElapsed }, (_, index) => {
    const day = index + 1;
    runningSpend += expenses.filter((item) => item.category !== 'Transfers' && item.occurredAt.getFullYear() === now.getFullYear() && item.occurredAt.getMonth() === now.getMonth() && item.occurredAt.getDate() === day).reduce((sum, item) => sum + item.amountPaise, 0);
    return { day: String(day), spent: Math.round(runningSpend / 100), plan: Math.round((monthlyBudget.amountPaise / daysInMonth) * day / 100) };
  }) : [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F3F7F8' }}>
      <ScrollView className="bg-paper" contentContainerStyle={{ gap: 24, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 16 }}>
        <Text className="text-[30px] font-extrabold tracking-[-1.2px] text-ink">Insights</Text>

        <View className="rounded-2xl bg-ink p-5">
          <Text className="text-[11px] font-bold uppercase tracking-[1.4px] text-white-muted">Total spent</Text>
          <Text selectable className="mt-2 text-[36px] font-extrabold tracking-[-1.5px] text-white">{formatCompactMoney(total)}</Text>
          <View className="mt-5 flex-row border-t border-white-line pt-4">
            <View className="flex-1"><Text className="text-[11px] text-white-muted">Typical payment</Text><Text selectable className="mt-1 text-[16px] font-bold text-teal-pale">{formatCompactMoney(Math.round(total / Math.max(expenses.length, 1)))}</Text></View>
            <View className="w-px bg-white-line" />
            <View className="flex-1 pl-5"><Text className="text-[11px] text-white-muted">Largest payment</Text><Text selectable className="mt-1 text-[16px] font-bold text-white">{largest ? formatCompactMoney(largest.amountPaise) : '-'}</Text><Text numberOfLines={1} className="mt-0.5 text-[10px] text-white-muted">{largest?.counterparty ?? 'No data yet'}</Text></View>
          </View>
        </View>

        {activeBudgets.length ? <View className="gap-2"><SectionHeading title="Budget health" /><View className="rounded-2xl bg-white p-4"><BudgetUtilizationChart data={budgetChartData} /></View>{activeBudgets.map((budget) => <View key={budget.id} className="rounded-2xl bg-white p-4"><BudgetProgress cadence={budget.cadence} limit={budget.amountPaise} spent={budgetSpend(items, budget.cadence)} compact /></View>)}</View> : <Link href={'/settings' as Href} asChild><Pressable className="flex-row items-center justify-between rounded-2xl bg-white p-4 active:opacity-80"><Text className="text-[14px] font-bold text-ink">Set a weekly or monthly budget</Text><Text className="text-[12px] font-bold text-teal">Add</Text></Pressable></Link>}

        {monthlyBudget && monthlyBudgetPace.length ? <View className="gap-3"><SectionHeading title="Monthly budget pace" /><View className="rounded-2xl bg-white p-4"><View><BudgetPaceChart data={monthlyBudgetPace} /></View></View></View> : null}

        {expenses.length ? <>
          <View className="gap-3"><SectionHeading title="Spending over time" /><View className="rounded-2xl bg-white p-4"><View><MonthlySpendChart data={monthlySpend} /></View></View></View>

          {categoryChartData.length ? <View className="gap-3"><SectionHeading title="Where the money goes" /><View className="rounded-2xl bg-white p-4"><CategoryAllocationChart data={categoryChartData} /></View></View> : null}

          <View className="gap-3"><SectionHeading title="Spend by weekday" /><View className="rounded-2xl bg-white p-4"><Text className="text-[12px] leading-5 text-ink-muted">{highDay?.label} is your most expensive day ({formatMoney((highDay?.amount ?? 0) * 100)}).</Text><View className="mt-3"><WeekdaySpendChart data={weekdaySpend} /></View></View></View>

          <View className="gap-3"><SectionHeading title="Where you pay" /><View className="gap-4 rounded-2xl bg-white p-4">{sourceSpend.map(({ source, amount }) => <CategoryBar key={source} name={source} amount={amount} share={Math.round((amount / Math.max(total, 1)) * 100)} color={sourceColors[source]} />)}</View></View>
        </> : <View className="items-center rounded-2xl bg-white px-6 py-12"><View className="h-12 w-12 items-center justify-center rounded-full bg-teal-pale"><FileText size={22} color="#116F6B" strokeWidth={2} /></View><Text className="mt-4 text-[15px] font-bold text-ink">Insights need payment history</Text><Text className="mt-1 text-center text-[12px] text-ink-muted">Import a statement or add a payment.</Text></View>}
      </ScrollView>
    </SafeAreaView>
  );
}
