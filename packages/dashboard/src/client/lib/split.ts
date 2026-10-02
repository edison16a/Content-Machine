import { DASHBOARD_PLATFORMS, type DashboardPlatform } from '../../shared/types.js';

/** A share per platform, as whole percentages or as any relative weights. */
type Split = Record<DashboardPlatform, number>;

/**
 * Whole percentages that add up to exactly 100, from any weights. Each gets
 * its rounded-down share and the leftover points go to the largest
 * remainders, so the sliders always total 100. All-zero weights split evenly.
 */
export function toPercentages(split: Split): Split {
  const sum = DASHBOARD_PLATFORMS.reduce((total, p) => total + split[p], 0);
  const exact = DASHBOARD_PLATFORMS.map((p) => (sum === 0 ? 100 / 3 : (split[p] / sum) * 100));
  const whole = exact.map(Math.floor);
  const order = exact
    .map((value, i) => ({ i, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);
  const leftover = 100 - whole.reduce((a, b) => a + b, 0);
  for (let k = 0; k < leftover; k += 1) {
    const target = order[k % order.length]?.i ?? 0;
    whole[target] = (whole[target] ?? 0) + 1;
  }
  return Object.fromEntries(DASHBOARD_PLATFORMS.map((p, i) => [p, whole[i] ?? 0])) as Split;
}

/**
 * Moving one slider takes the room it needs from the other two in
 * proportion to their size (evenly if both are at zero), so the three
 * always add up to 100 and each slider's position is its real share.
 */
export function rebalance(split: Split, moved: DashboardPlatform, value: number): Split {
  const others = DASHBOARD_PLATFORMS.filter((p) => p !== moved);
  const rest = 100 - value;
  const sumOthers = others.reduce((total, p) => total + split[p], 0);
  const weights = Object.fromEntries(
    others.map((p) => [p, sumOthers === 0 ? 1 : split[p]]),
  ) as Partial<Split>;
  const shares = toPercentages({ tiktok: 0, instagram: 0, youtube: 0, ...weights });
  const result = { ...split, [moved]: value };
  let given = 0;
  for (const [i, p] of others.entries()) {
    const amount = i === others.length - 1 ? rest - given : Math.round((shares[p] / 100) * rest);
    result[p] = amount;
    given += amount;
  }
  return result;
}
