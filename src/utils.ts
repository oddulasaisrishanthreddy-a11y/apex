/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSelector } from 'react-redux';
import { RootState } from './store';

/**
 * Formats a numeric value into the Indian Rupee currency format (e.g., ₹1,25,999)
 */
export const formatRupee = (value: number): string => {
  if (isNaN(value)) return '₹0';
  return '₹' + Math.round(value).toLocaleString('en-IN');
};

/**
 * Formats date into human readable form
 */
export const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (err) {
    return dateString;
  }
};

/**
 * CENTRALIZED CURRENCY DISPLAY & DYNAMIC CONVERSION HOOK
 */
export function useCurrency() {
  const currency = useSelector((state: RootState) => state.currency);

  const convertPrice = (priceINR: number): number => {
    if (!currency) return priceINR;
    const rate = currency.rates[currency.currencyCode] || 1.0;
    return Number((priceINR * rate).toFixed(2));
  };

  const formatPrice = (priceINR: number): string => {
    if (!currency) {
      return '₹' + Math.round(priceINR).toLocaleString('en-IN');
    }
    const converted = convertPrice(priceINR);
    const code = currency.currencyCode;
    const symbol = currency.currencySymbol;

    if (code === 'INR') {
      return '₹' + Math.round(converted).toLocaleString('en-IN');
    }
    if (code === 'JPY') {
      return '¥' + Math.round(converted).toLocaleString('ja-JP');
    }
    if (code === 'AED') {
      return 'د.إ' + converted.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    const formattedValue = converted.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${symbol}${formattedValue}`;
  };

  return {
    ...(currency || {
      country: 'India',
      currencyCode: 'INR',
      currencySymbol: '₹',
      locale: 'en-IN',
      rates: { INR: 1 },
      loading: false
    }),
    convertPrice,
    formatPrice
  };
}
