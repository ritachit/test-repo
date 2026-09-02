import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { expenseSplits, expenses, settlements, groupMembers } from "@/db/schema";
import { computeNet, computePairwise, simplifyDebts, type PairDebt, type ExpenseLike } from "@/lib/balances";

async function loadGroupLedger(groupId: string) {
  const exps = await db.query.expenses.findMany({ where: eq(expenses.groupId, groupId) });
  const splits = exps.length
    ? await db.query.expenseSplits.findMany({
        where: inArray(expenseSplits.expenseId, exps.map((e) => e.id)),
      })
    : [];
  const sets = await db.query.settlements.findMany({ where: eq(settlements.groupId, groupId) });
  const expenseLikes: ExpenseLike[] = exps.map((e) => ({
    paidBy: e.paidBy,
    splits: splits.filter((s) => s.expenseId === e.id),
  }));
  return { expenseLikes, sets };
}

export async function getGroupNet(groupId: string) {
  const { expenseLikes, sets } = await loadGroupLedger(groupId);
  return computeNet(expenseLikes, sets);
}

export type GroupBalances = {
  net: Record<string, number>;
  pairwise: PairDebt[];
  simplified: PairDebt[];
};

export async function getGroupBalances(groupId: string): Promise<GroupBalances> {
  const { expenseLikes, sets } = await loadGroupLedger(groupId);
  const net = computeNet(expenseLikes, sets);
  return {
    net: Object.fromEntries(net),
    pairwise: computePairwise(expenseLikes, sets),
    simplified: simplifyDebts(net),
  };
}

export type OverallBalance = {
  counterpartyId: string;
  /** positive: they owe you; negative: you owe them */
  amountCents: number;
  perGroup: { groupId: string; amountCents: number }[];
};

/** Across all the user's groups, netted per counterparty (only same-currency groups are summed). */
export async function getOverallBalances(userId: string) {
  const memberships = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, userId),
  });
  const byCurrency = new Map<string, Map<string, OverallBalance>>();
  for (const m of memberships) {
    const g = await db.query.groups.findFirst({
      where: (t, { eq }) => eq(t.id, m.groupId),
    });
    if (!g) continue;
    const b = await getGroupBalances(g.id);
    const debts = g.simplifyDebts ? b.simplified : b.pairwise;
    const bucket = byCurrency.get(g.currency) ?? new Map<string, OverallBalance>();
    byCurrency.set(g.currency, bucket);
    for (const d of debts) {
      if (d.from !== userId && d.to !== userId) continue;
      const other = d.from === userId ? d.to : d.from;
      const signed = d.to === userId ? d.amountCents : -d.amountCents;
      const ob = bucket.get(other) ?? { counterpartyId: other, amountCents: 0, perGroup: [] };
      ob.amountCents += signed;
      ob.perGroup.push({ groupId: g.id, amountCents: signed });
      bucket.set(other, ob);
    }
  }
  return [...byCurrency].map(([currency, m]) => ({
    currency,
    balances: [...m.values()].filter((b) => b.amountCents !== 0),
  }));
}
