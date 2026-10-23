/** Formatting helpers for calculation results. */

export function formatValue(value: number | Record<string, number>, unit: string): string {
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, v]) => `${key} = ${formatNumber(v)} ${unit}`)
      .join(' · ');
  }
  return `${formatNumber(value)} ${unit}`;
}

export function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return Number(value.toPrecision(6)).toString();
}

export function parseNumber(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}
