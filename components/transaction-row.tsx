import { memo } from 'react';
import { Text, View } from 'react-native';
import { ArrowLeftRight, CarFront, CircleEllipsis, HeartPulse, ReceiptText, ShoppingBag, ShoppingBasket, Utensils, type LucideIcon } from 'lucide-react-native';

import type { Transaction } from '@/db/schema';
import { categoryTint, formatDay, formatMoney } from '@/lib/format';

const categoryIcons: Record<string, LucideIcon> = {
  'Food & dining': Utensils,
  Groceries: ShoppingBasket,
  Shopping: ShoppingBag,
  Bills: ReceiptText,
  Transport: CarFront,
  Health: HeartPulse,
  Transfers: ArrowLeftRight,
  Other: CircleEllipsis,
};

export const TransactionRow = memo(function TransactionRow({ item }: { item: Transaction }) {
  const incoming = item.direction === 'credit';
  const CategoryIcon = categoryIcons[item.category] ?? categoryIcons.Other;
  return (
    <View className="flex-row items-center gap-3 py-3.5">
      <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: categoryTint[item.category] ?? categoryTint.Other }}>
        <CategoryIcon size={18} color="#112A3D" strokeWidth={2} />
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[14px] font-semibold text-ink">{item.counterparty}</Text>
        <Text className="mt-0.5 text-[11px] text-ink-muted">{formatDay(item.occurredAt)} / {item.category} / {item.source}</Text>
      </View>
      <View className="items-end">
        <Text selectable className={`text-[14px] font-bold ${incoming ? 'text-teal' : 'text-ink'}`}>
          {incoming ? '+' : '-'}{formatMoney(item.amountPaise)}
        </Text>
        <Text className="mt-0.5 text-[10px] font-bold uppercase tracking-[1px] text-ink-faint">{incoming ? 'In' : 'Out'}</Text>
      </View>
    </View>
  );
});
