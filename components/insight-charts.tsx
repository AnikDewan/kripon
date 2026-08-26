import { useWindowDimensions } from 'react-native';
import { BarChart, LineChart, PieChart, ProgressChart } from 'react-native-chart-kit/v2';
import type { CartesianChartTheme } from 'react-native-chart-kit/v2';

const chartTheme: CartesianChartTheme = {
  background: '#FFFFFF',
  plotBackground: '#FFFFFF',
  grid: '#E4ECEE',
  axis: '#D7E2E5',
  text: '#112A3D',
  mutedText: '#637687',
  series: ['#116F6B', '#82B8B0', '#C85949', '#7D94A6'],
  typography: { axisLabelSize: 10, legendLabelSize: 10 },
  tooltip: { background: '#112A3D', border: '#112A3D', text: '#FFFFFF', mutedText: '#B6C6D0', borderRadius: 12 },
};

type AmountDatum = { label: string; amount: number };
type CategoryDatum = AmountDatum & { color: string };
type BudgetDatum = { label: string; value: number; color: string };
type PaceDatum = { day: string; spent: number; plan: number };

function useChartWidth() {
  const { width } = useWindowDimensions();
  return Math.max(width - 72, 280);
}

const formatAxisMoney = (value: number) => value >= 1000 ? `₹${Math.round(value / 1000)}k` : `₹${Math.round(value)}`;

export function MonthlySpendChart({ data }: { data: AmountDatum[] }) {
  const width = useChartWidth();
  return <LineChart data={data} xKey="label" yKey="amount" width={width} height={224} curve="monotone" area areaFill={{ fromOpacity: 0.15, toOpacity: 0 }} showDots={false} showVerticalGridLines={false} labelStrategy="show" formatYLabel={formatAxisMoney} theme={chartTheme} interaction="tap" tooltip accessibilityLabel="Monthly spending trend" />;
}

export function CategoryAllocationChart({ data }: { data: CategoryDatum[] }) {
  const width = useChartWidth();
  return <PieChart data={data} valueKey="amount" labelKey="label" colorKey="color" width={width} height={236} innerRadiusRatio={0.62} centerLabel="Spend" legend={{ visible: true, itemGap: 10 }} interaction="tap" selectionAnimation={{ duration: 180 }} activeSlice={{ activeOffset: 4, inactiveOpacity: 0.62 }} sliceSeparator={{ visible: true, color: '#FFFFFF', width: 2 }} formatValue={formatAxisMoney} theme={chartTheme} accessibilityLabel="Spending split by category" />;
}

export function WeekdaySpendChart({ data }: { data: AmountDatum[] }) {
  const width = useChartWidth();
  return <BarChart data={data} xKey="label" yKey="amount" width={width} height={224} barRadius={6} barWidthRatio={0.58} showValuesOnTopOfBars={false} showHorizontalGridLines labelStrategy="show" formatYLabel={formatAxisMoney} theme={chartTheme} interaction="tap" tooltip accessibilityLabel="Spending by weekday" />;
}

export function BudgetUtilizationChart({ data }: { data: BudgetDatum[] }) {
  const width = useChartWidth();
  const average = Math.round((data.reduce((sum, budget) => sum + budget.value, 0) / Math.max(data.length, 1)) * 100);
  return <ProgressChart data={data} labelKey="label" valueKey="value" colorKey="color" width={width} height={208} centerLabel={`${average}%`} legend={{ visible: true }} strokeWidth={14} ringGap={7} backgroundRingColor="#E4ECEE" animation={{ duration: 220, stagger: 90 }} theme={chartTheme} accessibilityLabel="Current budget utilization" />;
}

export function BudgetPaceChart({ data }: { data: PaceDatum[] }) {
  const width = useChartWidth();
  return <LineChart data={data} xKey="day" series={[{ yKey: 'spent', label: 'Spent', color: '#116F6B', strokeWidth: 3, dot: false, curve: 'monotone', area: true, areaFill: { fromOpacity: 0.1, toOpacity: 0 } }, { yKey: 'plan', label: 'Budget pace', color: '#C85949', strokeWidth: 2, strokeDasharray: [5, 4], dot: false, curve: 'linear' }]} width={width} height={236} showVerticalGridLines={false} showDots={false} legend={{ position: 'bottom', marker: 'line', align: 'start' }} labelStrategy="auto" formatYLabel={formatAxisMoney} theme={chartTheme} interaction="tap" tooltip accessibilityLabel="Monthly budget pace compared with spending" />;
}
