import { formatPrice } from './format-price.js';
import type { Money } from './types.js';

export function loadPrices(): Promise<Money[]> {
  return Promise.resolve([
    { value: 19.99, currency: 'EUR' },
    { value: 0, currency: 'CHF' },
  ]);
}

export async function main(): Promise<void> {
  const prices = await loadPrices();

  for (const price of prices) {
    console.log(formatPrice(price, true));
  }
}
