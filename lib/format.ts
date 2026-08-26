export const formatMoney = (paise: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits,
  }).format(paise / 100);

export const formatCompactMoney = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(paise / 100);

export const formatDay = (date: Date) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date);

export const categoryTint: Record<string, string> = {
  Shopping: '#FCE5DF',
  'Food & dining': '#E1F1E8',
  Groceries: '#E8EDF9',
  Bills: '#EEE8FA',
  Transfers: '#E8E3D9',
  Cashback: '#FFF1BF',
  Digital: '#DDF2F0',
  Other: '#E7EEF5',
};
