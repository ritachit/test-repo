import { describe, expect, it } from "vitest";
import { computeNet, computePairwise, simplifyDebts } from "../balances";

const expenses = [
  { paidBy: "a", splits: [{ userId: "a", amountCents: 500 }, { userId: "b", amountCents: 500 }] },
  { paidBy: "b", splits: [{ userId: "b", amountCents: 200 }, { userId: "c", amountCents: 200 }] },
];

describe("balances", () => {
  it("computes net per user", () => {
    const net = computeNet(expenses, []);
    expect(net.get("a")).toBe(500);
    expect(net.get("b")).toBe(-300);
    expect(net.get("c")).toBe(-200);
  });
  it("settlements reduce debts", () => {
    const net = computeNet(expenses, [{ fromUserId: "b", toUserId: "a", amountCents: 500 }]);
    expect(net.get("a")).toBe(0);
    expect(net.get("b")).toBe(200);
  });
  it("pairwise keeps exact who-owes-whom", () => {
    const pw = computePairwise(expenses, []);
    expect(pw).toEqual([
      { from: "b", to: "a", amountCents: 500 },
      { from: "c", to: "b", amountCents: 200 },
    ]);
  });
  it("simplify uses fewer transfers and preserves nets", () => {
    const net = computeNet(expenses, []);
    const s = simplifyDebts(net);
    expect(s).toEqual([
      { from: "b", to: "a", amountCents: 300 },
      { from: "c", to: "a", amountCents: 200 },
    ]);
    const check = new Map<string, number>();
    for (const t of s) {
      check.set(t.from, (check.get(t.from) ?? 0) + t.amountCents);
      check.set(t.to, (check.get(t.to) ?? 0) - t.amountCents);
    }
    for (const [u, v] of net) expect(check.get(u) ?? 0).toBe(-v);
  });
});
