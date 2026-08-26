export const formatMoney = (paise: number) => {
  const hasPaise = paise % 100 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  }).format(paise / 100);
};

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
  Transport: '#DDF2E4',
  Health: '#F6E3DF',
  Entertainment: '#FFF1BF',
  Travel: '#E3EDFA',
  Education: '#EDE8FA',
  Housing: '#E8E3D9',
  Transfers: '#E8E3D9',
  Cashback: '#FFF1BF',
  Other: '#E7EEF5',
};
