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

/** Single card stacking all active budgets as compact full-width rows; shows the same figures as BudgetProgress. */
export function BudgetSummaryCard({ budgets }: { budgets: Array<{ cadence: BudgetCadence; limit: number; spent: number }> }) {
  return (
    <View className="gap-4 rounded-2xl bg-white px-4 py-3.5">
      {budgets.map(({ cadence, limit, spent }) => {
        const percentage = Math.round((spent / Math.max(limit, 1)) * 100);
        const remaining = limit - spent;
        const overBudget = remaining < 0;
        return (
          <View key={cadence} className="gap-1.5">
            <View className="flex-row items-baseline justify-between">
              <Text className="text-[10px] font-bold uppercase tracking-[1px] text-ink-muted">{budgetLabel(cadence)}</Text>
              <Text selectable className="text-[10px] font-bold text-ink-faint">{percentage}%</Text>
            </View>
            <View className="flex-row items-baseline justify-between">
              <Text selectable className="text-[14px] font-extrabold text-ink">
                {formatMoney(spent)}
                <Text className="text-[11px] font-semibold text-ink-muted"> of {formatMoney(limit)}</Text>
              </Text>
              <Text selectable className={`text-[11px] font-bold ${overBudget ? 'text-coral' : 'text-teal'}`}>
                {overBudget ? `${formatMoney(Math.abs(remaining))} over` : `${formatMoney(remaining)} left`}
              </Text>
            </View>
            <View className="h-1.5 overflow-hidden rounded-full bg-line">
              <View className={overBudget ? 'h-full rounded-full bg-coral' : 'h-full rounded-full bg-teal'} style={{ width: `${Math.min(percentage, 100)}%` }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
