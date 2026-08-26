import { describe, expect, it } from 'vitest';

import { allCategories, spendingCategories, OTHER_CATEGORY } from './categories';

describe('categories', () => {
  it('has around ten spending categories covering basic human expenses', () => {
    expect(spendingCategories.length).toBeGreaterThanOrEqual(9);
    expect(spendingCategories.length).toBeLessThanOrEqual(12);
  });

  it('includes an Other category in the selectable list', () => {
    expect(allCategories).toContain(OTHER_CATEGORY);
    expect(allCategories.at(-1)).toBe(OTHER_CATEGORY);
  });

  it('has no duplicates', () => {
    expect(new Set(allCategories).size).toBe(allCategories.length);
  });

  it('covers basic spending areas', () => {
    const joined = allCategories.join(' | ');
    for (const area of ['Food', 'Groceries', 'Transport', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Travel']) {
      expect(joined).toContain(area);
    }
  });

  it('does not expose Transfers as a manual choice', () => {
    expect(allCategories).not.toContain('Transfers');
  });
});
