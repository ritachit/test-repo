/**
 * Pure balance math. All amounts are integer cents.
 * Convention: a positive net means the user is owed money.
 */
export type ExpenseLike = {
  paidBy: string;
  splits: { userId: string; amountCents: number }[];
};
export type SettlementLike = { fromUserId: string; toUserId: string; amountCents: number };

export type PairDebt = { from: string; to: string; amountCents: number };

export function computeNet(
  expenses: ExpenseLike[],
  settlements: SettlementLike[],
): Map<string, number> {
  const net = new Map<string, number>();
  const add = (u: string, c: number) => net.set(u, (net.get(u) ?? 0) + c);
  for (const e of expenses) {
    for (const s of e.splits) {
      add(e.paidBy, s.amountCents);
      add(s.userId, -s.amountCents);
    }
  }
  for (const s of settlements) {
    add(s.fromUserId, s.amountCents);
    add(s.toUserId, -s.amountCents);
  }
  return net;
}

/** Exact pairwise debts, i.e. who owes whom without any simplification. */
export function computePairwise(
  expenses: ExpenseLike[],
  settlements: SettlementLike[],
): PairDebt[] {
  // key "a|b" with a<b, value = amount a owes b (negative => b owes a)
  const m = new Map<string, number>();
  const add = (debtor: string, creditor: string, c: number) => {
    if (debtor === creditor) return;
    const [a, b] = debtor < creditor ? [debtor, creditor] : [creditor, debtor];
    const sign = debtor === a ? 1 : -1;
    const k = `${a}|${b}`;
    m.set(k, (m.get(k) ?? 0) + sign * c);
  };
  for (const e of expenses) for (const s of e.splits) add(s.userId, e.paidBy, s.amountCents);
  for (const s of settlements) add(s.fromUserId, s.toUserId, -s.amountCents);
  const out: PairDebt[] = [];
  for (const [k, v] of m) {
    if (v === 0) continue;
    const [a, b] = k.split("|");
    out.push(v > 0 ? { from: a, to: b, amountCents: v } : { from: b, to: a, amountCents: -v });
  }
  return out.sort((x, y) => y.amountCents - x.amountCents);
}

/** Greedy min-cash-flow: settles all nets with at most n-1 transfers. */
export function simplifyDebts(net: Map<string, number>): PairDebt[] {
  const debtors = [...net].filter(([, v]) => v < 0).map(([u, v]) => ({ u, v: -v }));
  const creditors = [...net].filter(([, v]) => v > 0).map(([u, v]) => ({ u, v }));
  debtors.sort((a, b) => b.v - a.v || a.u.localeCompare(b.u));
  creditors.sort((a, b) => b.v - a.v || a.u.localeCompare(b.u));
  const out: PairDebt[] = [];
  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].v, creditors[j].v);
    out.push({ from: debtors[i].u, to: creditors[j].u, amountCents: amt });
    debtors[i].v -= amt;
    creditors[j].v -= amt;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return out;
}
