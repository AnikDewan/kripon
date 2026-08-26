export const OTHER_CATEGORY = 'Other';

/** Fixed spending categories offered everywhere in the app. */
export const spendingCategories = [
  'Food & dining',
  'Groceries',
  'Transport',
  'Bills',
  'Shopping',
  'Health',
  'Entertainment',
  'Travel',
  'Education',
  'Housing',
] as const;

/** Categories a user can pick manually; always ends with Other. */
export const allCategories: string[] = [...spendingCategories, OTHER_CATEGORY];

/** Ledger-only categories assigned by statement imports; not offered for manual entries. */
export const TRANSFER_CATEGORY = 'Transfers';
export const CASHBACK_CATEGORY = 'Cashback';

/** Categories that do not count against budgets. */
export const budgetExemptCategories = [TRANSFER_CATEGORY];
