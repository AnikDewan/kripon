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
