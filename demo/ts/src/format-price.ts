import type { Money } from './types.js';

const eurFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

const chfFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'CHF',
  minimumFractionDigits: 2,
});

export function formatPrice(price: Money, replaceZero = false): string {
  if (replaceZero && price.value === 0) {
    return 'kostenlos';
  }

  return price.currency === 'EUR' ? eurFormatter.format(price.value) : chfFormatter.format(price.value);
}
