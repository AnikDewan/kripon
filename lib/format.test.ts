import { describe, expect, it } from 'vitest';

import { formatMoney } from './format';

describe('formatMoney', () => {
  it('hides decimals for whole rupee amounts', () => {
    expect(formatMoney(95000)).toBe('₹950');
  });

  it('shows two decimals when paise do not make a whole rupee', () => {
    expect(formatMoney(12345)).toBe('₹123.45');
  });

  it('shows two decimals for sub-rupee amounts', () => {
    expect(formatMoney(50)).toBe('₹0.50');
  });

  it('formats negative amounts with a leading sign', () => {
    expect(formatMoney(-25000)).toBe('-₹250');
  });
});
