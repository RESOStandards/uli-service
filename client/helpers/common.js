import format from "format-number";

// function to round a number to Integer
export const roundNumbertoInteger = (value) => {
  if (value < 1) return 0;
  return format()(Math.round(value));
};

export const roundPercentage = (value) => {
  if (value <= 1) return " < 1";
  if (value >= 99) return Math.round(value * 10) / 10;
  return Math.round(value);
};

/**
 * Computes the max bound for a collection of items as the nearest round power
 * of 10 from the max number in items.
 *
 * Examples:
 *  computeMaxBound(0, 0, 0, ..., 0) = 0
 *  computeMaxBound(-1, -2, -3) = -4
 *  computeMaxBound(-0.1, -0.2, 0) = -1
 *  computeMaxBound(1, 10, 2250) = 3000
 *
 * @param items a list of real numbers
 * @returns the next even power of 10 closest to the max in the set
 */
export const computeMaxBound = (...items) => {
  const filtered = items.filter((x) => typeof x === "number");

  if (!filtered.length || !filtered.reduce((p, v) => p || v)) return 0;

  const r0 = Math.max(...filtered),
    r1 = r0 <= 0 ? Math.min(...filtered) : r0,
    r2 = Math.abs(r1),
    r3 = Math.floor(Math.log10(r2)),
    r4 = r2 * Math.pow(10, -r3),
    r5 = Math.ceil(r4 + 0.5 * Math.pow(10, -r3 - 1));

  return Math.max(1, r5 * Math.pow(10, r3)) * (r1 > 0 ? 1 : -1);
};
