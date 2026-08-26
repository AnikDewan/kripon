const amountPattern = /^\d*(\.\d{0,2})?$/;

/** Keeps only digits and a single decimal point with at most two decimal places. */
export const sanitizeAmountInput = (input: string) => {
  let cleaned = input.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  while (!amountPattern.test(cleaned) && cleaned.includes('.')) {
    cleaned = cleaned.slice(0, -1);
  }
  if (!cleaned.includes('.') && cleaned.length > 12) cleaned = cleaned.slice(0, 12);
  return cleaned;
};

/** Converts a sanitized rupee string to paise; returns null unless the amount is positive. */
export const amountToPaise = (input: string) => {
  if (!/^\d+(\.\d{0,2})?$/.test(input)) return null;
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
};
