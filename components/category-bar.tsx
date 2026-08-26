import { Text, View } from 'react-native';

import { formatMoney } from '@/lib/format';

export function CategoryBar({ name, amount, share, color }: { name: string; amount: number; share: number; color: string }) {
  return (
    <View className="gap-1.5">
      <View className="flex-row justify-between">
        <Text className="text-[12px] font-semibold text-ink">{name}</Text>
        <Text selectable className="text-[12px] font-bold text-ink">{formatMoney(amount)} <Text className="font-normal text-ink-muted">{share}%</Text></Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-line">
        <View className="h-full rounded-full" style={{ width: `${Math.max(share, 3)}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}
