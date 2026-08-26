import type { BudgetCadence, Transaction } from '@/db/schema';

export const budgetPeriodStart = (cadence: BudgetCadence, now = new Date()) => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (cadence === 'monthly') {
    start.setDate(1);
    return start;
  }
  start.setDate(start.getDate() - start.getDay());
  return start;
};

export const budgetSpend = (transactions: Transaction[], cadence: BudgetCadence, now = new Date()) => {
  const start = budgetPeriodStart(cadence, now).getTime();
  return transactions
    .filter((transaction) => transaction.direction === 'debit' && transaction.category !== 'Transfers' && transaction.occurredAt.getTime() >= start)
    .reduce((total, transaction) => total + transaction.amountPaise, 0);
};

export const budgetLabel = (cadence: BudgetCadence) => cadence === 'monthly' ? 'Monthly' : 'Weekly';
