import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, ChevronDown, Plus, ReceiptText, SlidersHorizontal, X } from 'lucide-react-native';

import { NativeDatePicker } from '@/components/native-date-picker';
import { TransactionRow } from '@/components/transaction-row';
import { db } from '@/db';
import { transactions, type Transaction } from '@/db/schema';

const filters = ['All', 'Spent', 'Received'] as const;
type Filter = typeof filters[number];
type PickerField = 'start' | 'end' | null;
const PAGE_SIZE = 60;

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

const formatRangeDate = (date: Date | null) => date ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date) : 'Select';

const ItemSeparator = () => <View className="h-px bg-line" />;

const EmptyState = () => (
  <View className="items-center px-6 py-16">
    <View className="h-12 w-12 items-center justify-center rounded-full bg-teal-pale"><ReceiptText size={22} color="#116F6B" strokeWidth={2} /></View>
    <Text className="mt-4 text-[15px] font-bold text-ink">No payments to show</Text>
    <Text className="mt-1 text-center text-[12px] text-ink-muted">Import a statement or widen the filters.</Text>
  </View>
);

export default function ActivityScreen() {
  const [filter, setFilter] = useState<Filter>('All');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [pickerField, setPickerField] = useState<PickerField>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset] = useState(0);

  // Filtering, sorting and paging happen in SQLite so the list stays smooth
  // even with millions of rows; only the visible page crosses the bridge.
  const where = useMemo(() => {
    const conditions = [];
    if (filter !== 'All') conditions.push(eq(transactions.direction, filter === 'Spent' ? 'debit' : 'credit'));
    if (startDate) conditions.push(gte(transactions.occurredAt, startOfDay(startDate)));
    if (endDate) conditions.push(lte(transactions.occurredAt, endOfDay(endDate)));
    return conditions.length ? and(...conditions) : undefined;
  }, [endDate, filter, startDate]);

  const { data } = useLiveQuery(
    db.select().from(transactions).where(where).orderBy(desc(transactions.occurredAt), desc(transactions.id)).limit(PAGE_SIZE).offset(offset),
  );
  const { data: totalRows } = useLiveQuery(db.select({ total: count() }).from(transactions).where(where));
  const items = data ?? [];
  const total = totalRows?.[0]?.total ?? 0;
  const hasMore = offset + PAGE_SIZE < total;

  const resetPagination = useCallback(() => setOffset(0), []);
  const renderItem = useCallback(({ item }: { item: Transaction }) => <TransactionRow item={item} />, []);
  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  const setQuickRange = (days: number | null) => {
    resetPagination();
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
    resetPagination();
    if (pickerField === 'start') {
      setStartDate(selected);
      if (endDate && selected > endDate) setEndDate(selected);
      return;
    }
    setEndDate(selected);
    if (startDate && selected < startDate) setStartDate(selected);
  };

  const pickerValue = pickerField === 'start' ? startDate ?? new Date() : endDate ?? new Date();
  const activeFilter = filter !== 'All' || Boolean(startDate) || Boolean(endDate);
  const dateLabel = startDate || endDate ? `${formatRangeDate(startDate)} – ${formatRangeDate(endDate)}` : 'All dates';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F7F6F1' }}>
      <View className="flex-1 bg-paper px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-[30px] font-extrabold tracking-[-1.2px] text-ink">Activity</Text>
          <Link href={'/add-transaction' as Href} asChild>
            <Pressable accessibilityLabel="Add transaction" className="h-10 w-10 items-center justify-center rounded-full bg-teal active:opacity-80"><Plus size={20} color="#FFFFFF" strokeWidth={2.5} /></Pressable>
          </Link>
        </View>

        <View className="mt-4 flex-row gap-2">
          <Pressable onPress={() => setShowFilters((visible) => !visible)} className={`flex-row items-center gap-2 rounded-full px-4 py-2.5 active:opacity-80 ${showFilters || activeFilter ? 'bg-ink' : 'bg-white'}`}>
            <SlidersHorizontal size={15} color={showFilters || activeFilter ? '#FFFFFF' : '#112A3D'} strokeWidth={2} />
            <Text className={`text-[12px] font-bold ${showFilters || activeFilter ? 'text-white' : 'text-ink'}`}>Filters</Text>
          </Pressable>
          <Pressable onPress={() => setShowFilters(true)} className="flex-1 flex-row items-center gap-2 rounded-full bg-white px-3">
            <CalendarDays size={15} color="#116F6B" strokeWidth={2} />
            <Text numberOfLines={1} className="flex-1 text-[11px] font-semibold text-ink-muted">{dateLabel}</Text>
          </Pressable>
        </View>

        {showFilters ? (
          <View className="mt-3 rounded-2xl bg-white p-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-[12px] font-bold text-ink">Filter activity</Text>
              {activeFilter ? (
                <Pressable onPress={() => { resetPagination(); setQuickRange(null); setFilter('All'); }} accessibilityLabel="Clear filters" className="flex-row items-center gap-1 active:opacity-70">
                  <X size={14} color="#637687" strokeWidth={2} /><Text className="text-[11px] font-bold text-ink-muted">Clear</Text>
                </Pressable>
              ) : null}
            </View>
            <View className="mt-3 flex-row gap-2">
              {filters.map((item) => (
                <Pressable key={item} onPress={() => { resetPagination(); setFilter(item); }} className={`rounded-full px-4 py-2 active:opacity-80 ${filter === item ? 'bg-teal' : 'bg-mist'}`}>
                  <Text className={`text-[11px] font-bold ${filter === item ? 'text-white' : 'text-ink-muted'}`}>{item}</Text>
                </Pressable>
              ))}
            </View>
            <View className="mt-3 flex-row gap-2">
              {(['start', 'end'] as const).map((field) => (
                <Pressable key={field} onPress={() => setPickerField(field)} className="flex-1 flex-row items-center justify-between rounded-xl bg-mist px-3 py-2.5 active:opacity-80">
                  <View>
                    <Text className="text-[10px] font-bold uppercase tracking-[1px] text-ink-muted">{field === 'start' ? 'From' : 'To'}</Text>
                    <Text className="mt-0.5 text-[12px] font-bold text-ink">{formatRangeDate(field === 'start' ? startDate : endDate)}</Text>
                  </View>
                  <ChevronDown size={15} color="#637687" strokeWidth={2} />
                </Pressable>
              ))}
            </View>
            <View className="mt-3 flex-row gap-2">
              {([{ label: '7d', days: 7 }, { label: '30d', days: 30 }, { label: '90d', days: 90 }, { label: 'All time', days: null }] as const).map((range) => (
                <Pressable key={range.label} onPress={() => { resetPagination(); setQuickRange(range.days); }} className="flex-1 items-center rounded-xl bg-mist py-2.5 active:opacity-80">
                  <Text className="text-[11px] font-bold text-ink">{range.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {pickerField ? <NativeDatePicker value={pickerValue} maximumDate={new Date()} onConfirm={updateDate} onCancel={() => setPickerField(null)} /> : null}

        <Text className="mb-2 mt-4 text-[11px] font-semibold text-ink-muted">{total} payment{total === 1 ? '' : 's'}</Text>
        <FlashList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={listContentStyle}
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={EmptyState}
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            if (hasMore) setOffset(offset + PAGE_SIZE);
          }}
        />
      </View>
    </SafeAreaView>
  );
}
