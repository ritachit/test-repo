import { describe, expect, it } from "vitest";
import { computeSplits } from "../split";

const p = (ids: string[], values?: number[]) => ids.map((userId, i) => ({ userId, value: values?.[i] }));

describe("computeSplits", () => {
  it("equal split distributes remainder cents", () => {
    const r = computeSplits(1000, "equal", p(["a", "b", "c"]));
    expect(r.map((x) => x.amountCents)).toEqual([334, 333, 333]);
    expect(r.reduce((s, x) => s + x.amountCents, 0)).toBe(1000);
  });
  it("exact must sum to total", () => {
    expect(computeSplits(1000, "exact", p(["a", "b"], [600, 400])).map((x) => x.amountCents)).toEqual([600, 400]);
    expect(() => computeSplits(1000, "exact", p(["a", "b"], [600, 300]))).toThrow(/sum/);
  });
  it("percent must sum to 100 and rounds correctly", () => {
    const r = computeSplits(1001, "percent", p(["a", "b", "c"], [33.3, 33.3, 33.4]));
    expect(r.reduce((s, x) => s + x.amountCents, 0)).toBe(1001);
    expect(() => computeSplits(1000, "percent", p(["a", "b"], [50, 40]))).toThrow(/100/);
  });
  it("shares are proportional", () => {
    const r = computeSplits(900, "shares", p(["a", "b"], [2, 1]));
    expect(r.map((x) => x.amountCents)).toEqual([600, 300]);
  });
  it("rejects duplicates and bad amounts", () => {
    expect(() => computeSplits(100, "equal", p(["a", "a"]))).toThrow(/Duplicate/);
    expect(() => computeSplits(0, "equal", p(["a"]))).toThrow();
  });
});
