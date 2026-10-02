/**
 * Number formatting for the statistics section. Counts get thousands
 * separators, money keeps six decimals (the estimate is a fraction of a cent
 * per view, and watching it tick is half the fun), and chart axes use short
 * forms so labels never crowd. parseAmount reads what people type into the
 * admin panel ("30,000", "1.5k", "2M").
 */

export function count(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function money(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })}`;
}

/** "1.2K", "3.4M": for axis labels, where space is tight. */
export function compact(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

/** Axis money: whole cents are plenty on a tick label. */
export function compactMoney(value: number): string {
  if (value === 0) return '$0';
  if (value < 1) return `$${value.toFixed(value < 0.01 ? 4 : 2)}`;
  return `$${compact(value)}`;
}

/**
 * Round tick values from zero to just above `max`: steps of 1, 2 or 5 times
 * a power of ten, so the gridlines land on numbers people can read.
 */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = ([1, 2, 5, 10].find((m) => m * power >= rough) ?? 10) * power;
  const ticks: number[] = [];
  for (let value = 0; value < max + step; value += step) ticks.push(Number(value.toPrecision(12)));
  return ticks;
}

/**
 * Reads a typed amount like "30000", "30,000", "1.5k" or "2M". Returns
 * undefined for anything else, so a form can say what is wrong.
 */
export function parseAmount(text: string): number | undefined {
  const match = /^\s*\$?([\d,]*\.?\d+)\s*([km])?\s*$/i.exec(text);
  if (match === null) return undefined;
  const value = Number((match[1] ?? '').replace(/,/g, ''));
  const scale = { k: 1e3, m: 1e6 }[(match[2] ?? '').toLowerCase()] ?? 1;
  // Check after scaling: a very long number times a thousand can overflow.
  const result = value * scale;
  return Number.isFinite(result) && result <= Number.MAX_SAFE_INTEGER ? result : undefined;
}
