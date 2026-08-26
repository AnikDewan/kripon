import { describe, expect, it } from 'vitest';

import { sanitizeAmountInput, amountToPaise } from './amount';

describe('sanitizeAmountInput', () => {
  it('keeps plain digits', () => {
    expect(sanitizeAmountInput('123')).toBe('123');
  });

  it('strips letters and symbols', () => {
    expect(sanitizeAmountInput('12ab3!')).toBe('123');
  });

  it('allows a single decimal point', () => {
    expect(sanitizeAmountInput('12.5')).toBe('12.5');
    expect(sanitizeAmountInput('1.2.3')).toBe('1.23');
  });

  it('caps decimals at two places', () => {
    expect(sanitizeAmountInput('12.345')).toBe('12.34');
  });

  it('allows typing a trailing dot', () => {
    expect(sanitizeAmountInput('12.')).toBe('12.');
  });

  it('returns empty string for non-numeric input', () => {
    expect(sanitizeAmountInput('abc')).toBe('');
  });
});

describe('amountToPaise', () => {
  it('converts rupees to paise', () => {
    expect(amountToPaise('125.5')).toBe(12550);
  });

  it('handles trailing dot', () => {
    expect(amountToPaise('125.')).toBe(12500);
  });

  it('returns null for empty or invalid input', () => {
    expect(amountToPaise('')).toBeNull();
    expect(amountToPaise('.')).toBeNull();
    expect(amountToPaise('abc')).toBeNull();
  });

  it('returns null for zero and negatives', () => {
    expect(amountToPaise('0')).toBeNull();
    expect(amountToPaise('-5')).toBeNull();
  });
});
