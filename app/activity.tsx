import { desc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays, ChevronDown, Plus, ReceiptText, SlidersHorizontal, X } from 'lucide-react-native';

import { TransactionRow } from '@/components/transaction-row';
import { db } from '@/db';
import { transactions, type Transaction } from '@/db/schema';

const filters = ['All', 'Spent', 'Received'] as const;
type Filter = typeof filters[number];
type PickerField = 'start' | 'end' | null;

const listContentStyle = { borderRadius: 16, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingBottom: 24 };
const dayMilliseconds = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const formatRangeDate = (date: Date | null) => date ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date) : 'Select date';

export default function ActivityScreen() {
  const { data } = useLiveQuery(db.select().from(transactions).orderBy(desc(transactions.occurredAt)));
  const [filter, setFilter] = useState<Filter>('All');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [pickerField, setPickerField] = useState<PickerField>(null);
  const [showFilters, setShowFilters] = useState(false);
  const filtered = useMemo(() => (data ?? []).filter((item) => {
    if (filter !== 'All' && item.direction !== (filter === 'Spent' ? 'debit' : 'credit')) return false;
    if (startDate && item.occurredAt < startOfDay(startDate)) return false;
    if (endDate && item.occurredAt > endOfDay(endDate)) return false;
    return true;
  }), [data, endDate, filter, startDate]);
  const renderItem = useCallback(({ item }: { item: Transaction }) => <TransactionRow item={item} />, []);
  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  const setQuickRange = (days: number | null) => {
    if (!days) {
      setStartDate(null);
      setEndDate(null);
      return;
    }
    const today = startOfDay(new Date());
    setStartDate(new Date(today.getTime() - (days - 1) * dayMilliseconds));
    setEndDate(today);
  };

  const updateDate = (selectedDate?: Date) => {
    setPickerField(null);
    if (!selectedDate || !pickerField) return;
    const selected = startOfDay(selectedDate);
    if (pickerField === 'start') {
      setStartDate(selected);
      if (endDate && selected > endDate) setEndDate(selected);
      return;
    }
    setEndDate(selected);
    if (startDate && selected < startDate) setStartDate(selected);
  };

  const dateLabel = startDate || endDate ? `${formatRangeDate(startDate)} - ${formatRangeDate(endDate)}` : 'All dates';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F7F6F1' }}>
    <View className="flex-1 bg-paper px-5 pt-4">
      <View><Text className="text-[30px] font-extrabold tracking-[-1.2px] text-ink">All activity</Text><Text className="mt-1 text-[13px] text-ink-muted">Every imported and manual payment.</Text></View>
      <View className="mt-5 flex-row gap-2"><Pressable onPress={() => setShowFilters((visible) => !visible)} accessibilityState={{ expanded: showFilters }} className={`flex-row items-center gap-2 rounded-full px-4 py-2.5 active:opacity-80 ${showFilters || filter !== 'All' || startDate || endDate ? 'bg-ink' : 'bg-white'}`}><SlidersHorizontal size={15} color={showFilters || filter !== 'All' || startDate || endDate ? '#FFFFFF' : '#112A3D'} strokeWidth={2} /><Text className={`text-[12px] font-bold ${showFilters || filter !== 'All' || startDate || endDate ? 'text-white' : 'text-ink'}`}>Filters</Text></Pressable><View className="flex-1 flex-row items-center gap-2 rounded-full bg-white px-3"><CalendarDays size={15} color="#116F6B" strokeWidth={2} /><Text numberOfLines={1} className="flex-1 text-[11px] font-semibold text-ink-muted">{dateLabel}</Text></View></View>
      {showFilters ? <View className="mt-3 rounded-2xl bg-white p-3"><View className="flex-row items-center justify-between"><Text className="text-[12px] font-bold text-ink">Filter activity</Text>{startDate || endDate || filter !== 'All' ? <Pressable onPress={() => { setQuickRange(null); setFilter('All'); }} accessibilityLabel="Clear filters" className="flex-row items-center gap-1 active:opacity-70"><X size={14} color="#637687" strokeWidth={2} /><Text className="text-[11px] font-bold text-ink-muted">Clear</Text></Pressable> : null}</View><View className="mt-3 flex-row gap-2">{filters.map((item) => <Pressable key={item} onPress={() => setFilter(item)} className={`rounded-full px-4 py-2 active:opacity-80 ${filter === item ? 'bg-teal' : 'bg-mist'}`}><Text className={`text-[11px] font-bold ${filter === item ? 'text-white' : 'text-ink-muted'}`}>{item}</Text></Pressable>)}</View><View className="mt-3 flex-row gap-2"><Pressable onPress={() => setPickerField('start')} className="flex-1 flex-row items-center justify-between rounded-xl bg-mist px-3 py-2.5 active:opacity-80"><View><Text className="text-[10px] font-bold uppercase tracking-[1px] text-ink-muted">From</Text><Text className="mt-0.5 text-[12px] font-bold text-ink">{formatRangeDate(startDate)}</Text></View><ChevronDown size={15} color="#637687" strokeWidth={2} /></Pressable><Pressable onPress={() => setPickerField('end')} className="flex-1 flex-row items-center justify-between rounded-xl bg-mist px-3 py-2.5 active:opacity-80"><View><Text className="text-[10px] font-bold uppercase tracking-[1px] text-ink-muted">To</Text><Text className="mt-0.5 text-[12px] font-bold text-ink">{formatRangeDate(endDate)}</Text></View><ChevronDown size={15} color="#637687" strokeWidth={2} /></Pressable></View><View className="mt-3 flex-row gap-2">{([{ label: '7 days', days: 7 }, { label: '30 days', days: 30 }, { label: '90 days', days: 90 }, { label: 'All time', days: null }] as const).map((range) => <Pressable key={range.label} onPress={() => setQuickRange(range.days)} className="rounded-full bg-teal-pale px-3 py-1.5 active:opacity-80"><Text className="text-[10px] font-bold text-teal">{range.label}</Text></Pressable>)}</View></View> : null}
      {pickerField ? <DateTimePicker value={pickerField === 'start' ? startDate ?? new Date() : endDate ?? new Date()} mode="date" maximumDate={new Date()} onValueChange={(_, selectedDate) => updateDate(selectedDate)} /> : null}
      <Text className="mb-2 mt-4 text-[11px] font-semibold text-ink-muted">{filtered.length} payment{filtered.length === 1 ? '' : 's'}</Text>
      <FlashList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={listContentStyle}
        ItemSeparatorComponent={() => <View className="h-px bg-line" />}
        ListEmptyComponent={<View className="items-center px-6 py-16"><View className="h-12 w-12 items-center justify-center rounded-full bg-teal-pale"><ReceiptText size={22} color="#116F6B" strokeWidth={2} /></View><Text className="mt-4 text-[15px] font-bold text-ink">No payments to show</Text><Text className="mt-1 text-center text-[12px] leading-5 text-ink-muted">Import a statement, choose another filter, or widen the date range.</Text></View>}
      />
      <Link href={'/add-transaction' as Href} asChild><Pressable accessibilityRole="button" accessibilityLabel="Add a manual transaction" className="absolute bottom-5 right-5 flex-row items-center gap-2 rounded-full bg-teal px-5 py-4 active:opacity-85" style={{ boxShadow: '0 8px 18px rgba(17, 111, 107, 0.28)' }}><Plus size={20} color="#FFFFFF" strokeWidth={2.5} /><Text className="text-[14px] font-bold text-white">Add payment</Text></Pressable></Link>
    </View>
    </SafeAreaView>
  );
}
