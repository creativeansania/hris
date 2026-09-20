/**
 * Centralized Indonesian Formatting Utilities (DRY Compliance)
 * Standardizes IDR Currency, Numbers, and Percentages across the entire HRIS system.
 */

/**
 * Formats a numeric value to Indonesian Rupiah (IDR).
 * Example: 5000000 -> "Rp 5.000.000"
 */
export function formatIDR(amount: number | null | undefined): string {
  const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Formats a large number into compact Indonesian notation.
 * Example: 15500000 -> "Rp 15,5 Jt"
 */
export function formatCompactIDR(amount: number | null | undefined): string {
  const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  if (Math.abs(val) >= 1_000_000_000) {
    return `Rp ${(val / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
  }
  if (Math.abs(val) >= 1_000_000) {
    return `Rp ${(val / 1_000_000).toFixed(1).replace('.', ',')} Jt`;
  }
  if (Math.abs(val) >= 1_000) {
    return `Rp ${(val / 1_000).toFixed(0)} Rb`;
  }
  return formatIDR(val);
}

/**
 * Formats a percentage value.
 * Example: 95.5 -> "95,5%"
 */
export function formatPercent(value: number | null | undefined, decimals: number = 1): string {
  const val = typeof value === 'number' && !isNaN(value) ? value : 0;
  return `${val.toFixed(decimals).replace('.', ',')}%`;
}

/**
 * Formats standard tabular number with Indonesian thousand separators.
 * Example: 12500 -> "12.500"
 */
export function formatNumber(value: number | null | undefined): string {
  const val = typeof value === 'number' && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat('id-ID').format(val);
}
