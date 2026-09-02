import type { SplitType } from "@/db/schema";

export type SplitInput = { userId: string; value?: number };
export type SplitResult = { userId: string; amountCents: number; value: number | null };

/**
 * Compute per-user owed amounts in integer cents. Rounding remainders are
 * distributed one cent at a time so the shares always sum to the total.
 */
export function computeSplits(
  amountCents: number,
  type: SplitType,
  inputs: SplitInput[],
): SplitResult[] {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("Amount must be a positive whole number of cents");
  }
  if (inputs.length === 0) throw new Error("At least one participant required");
  const ids = new Set(inputs.map((i) => i.userId));
  if (ids.size !== inputs.length) throw new Error("Duplicate participant");

  switch (type) {
    case "equal":
      return distribute(amountCents, inputs.map(() => 1), inputs, null);
    case "exact": {
      const cents = inputs.map((i) => {
        const v = i.value ?? 0;
        if (!Number.isInteger(v) || v < 0) throw new Error("Exact amounts must be whole cents");
        return v;
      });
      const sum = cents.reduce((a, b) => a + b, 0);
      if (sum !== amountCents) {
        throw new Error(`Exact amounts sum to ${sum} but expense is ${amountCents}`);
      }
      return inputs.map((i, k) => ({ userId: i.userId, amountCents: cents[k], value: cents[k] }));
    }
    case "percent": {
      const pct = inputs.map((i) => i.value ?? 0);
      if (pct.some((p) => p < 0)) throw new Error("Percentages must be non-negative");
      const sum = pct.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > 0.001) throw new Error(`Percentages sum to ${sum}, expected 100`);
      return distribute(amountCents, pct, inputs, "value");
    }
    case "shares": {
      const shares = inputs.map((i) => i.value ?? 0);
      if (shares.some((s) => s < 0)) throw new Error("Shares must be non-negative");
      if (shares.reduce((a, b) => a + b, 0) <= 0) throw new Error("Total shares must be positive");
      return distribute(amountCents, shares, inputs, "value");
    }
  }
}

/** Largest-remainder apportionment of `total` cents by `weights`. */
function distribute(
  total: number,
  weights: number[],
  inputs: SplitInput[],
  keep: "value" | null,
): SplitResult[] {
  const wsum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (total * w) / wsum);
  const floors = raw.map(Math.floor);
  let remainder = total - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - floors[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] += 1;
    remainder -= 1;
  }
  return inputs.map((inp, i) => ({
    userId: inp.userId,
    amountCents: floors[i],
    value: keep ? (inp.value ?? 0) : null,
  }));
}
