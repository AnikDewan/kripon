import { Text, View } from 'react-native';

import type { BudgetCadence } from '@/db/schema';
import { budgetLabel } from '@/lib/budgets';
import { formatMoney } from '@/lib/format';

export function BudgetProgress({ cadence, limit, spent, compact = false }: { cadence: BudgetCadence; limit: number; spent: number; compact?: boolean }) {
  const percentage = Math.round((spent / Math.max(limit, 1)) * 100);
  const remaining = limit - spent;
  const overBudget = remaining < 0;

  return (
    <View className={compact ? 'gap-2' : 'gap-3'}>
      <View className="flex-row items-baseline justify-between">
        <Text className={compact ? 'text-[13px] font-bold text-ink' : 'text-[16px] font-bold text-ink'}>{budgetLabel(cadence)} budget</Text>
        <Text selectable className="text-[12px] font-bold text-ink">{formatMoney(spent)} <Text className="font-normal text-ink-muted">of {formatMoney(limit)}</Text></Text>
      </View>
      <View className="h-2.5 overflow-hidden rounded-full bg-line">
        <View className={overBudget ? 'h-full rounded-full bg-coral' : 'h-full rounded-full bg-teal'} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </View>
      <Text className={`text-[11px] font-semibold ${overBudget ? 'text-coral' : 'text-teal'}`}>
        {overBudget ? `${formatMoney(Math.abs(remaining))} over budget` : `${formatMoney(remaining)} remaining (${percentage}% used)`}
      </Text>
    </View>
  );
}

/** Single card combining all active budgets as divided columns; shows the same figures as BudgetProgress. */
export function BudgetSummaryCard({ budgets }: { budgets: Array<{ cadence: BudgetCadence; limit: number; spent: number }> }) {
  return (
    <View className="flex-row rounded-2xl bg-white px-4 py-3.5">
      {budgets.map(({ cadence, limit, spent }, index) => {
        const percentage = Math.round((spent / Math.max(limit, 1)) * 100);
        const remaining = limit - spent;
        const overBudget = remaining < 0;
        return (
          <View key={cadence} className={`flex-1 gap-1.5 ${index > 0 ? 'ml-4 border-l border-line pl-4' : ''}`}>
            <Text className="text-[10px] font-bold uppercase tracking-[1px] text-ink-muted">{budgetLabel(cadence)}</Text>
            <Text selectable numberOfLines={1} className="text-[14px] font-extrabold text-ink">
              {formatMoney(spent)}
              <Text className="text-[11px] font-semibold text-ink-muted"> / {formatMoney(limit)}</Text>
            </Text>
            <View className="h-1.5 overflow-hidden rounded-full bg-line">
              <View className={overBudget ? 'h-full rounded-full bg-coral' : 'h-full rounded-full bg-teal'} style={{ width: `${Math.min(percentage, 100)}%` }} />
            </View>
            <Text selectable className={`text-[10px] font-bold ${overBudget ? 'text-coral' : 'text-teal'}`}>
              {overBudget ? `${formatMoney(Math.abs(remaining))} over` : `${formatMoney(remaining)} left`} · {percentage}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}
