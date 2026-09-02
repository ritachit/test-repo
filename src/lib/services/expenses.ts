import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import {
  expenseSplits,
  expenses,
  settlements,
  type Expense,
  type ExpenseSplit,
  type Settlement,
  type SplitType,
} from "@/db/schema";
import { badRequest, forbidden, notFound } from "@/lib/api";
import { computeSplits, type SplitInput } from "@/lib/split";
import { assertMember, getGroupForUser } from "./groups";

export type ExpenseWithSplits = Expense & { splits: ExpenseSplit[] };

export type ExpenseInput = {
  description: string;
  amountCents: number;
  paidBy: string;
  splitType: SplitType;
  date: string;
  notes?: string | null;
  participants: SplitInput[];
};

async function validateInput(groupId: string, actorId: string, input: ExpenseInput) {
  const g = await getGroupForUser(groupId, actorId);
  const memberIds = new Set(g.members.map((m) => m.id));
  if (!memberIds.has(input.paidBy)) throw badRequest("Payer is not a group member");
  for (const p of input.participants) {
    if (!memberIds.has(p.userId)) throw badRequest("Participant is not a group member");
  }
  let splits;
  try {
    splits = computeSplits(input.amountCents, input.splitType, input.participants);
  } catch (e) {
    throw badRequest((e as Error).message);
  }
  return splits.filter((s) => s.amountCents > 0 || input.splitType === "exact");
}

export async function listExpenses(groupId: string, userId: string): Promise<ExpenseWithSplits[]> {
  await assertMember(groupId, userId);
  const rows = await db.query.expenses.findMany({
    where: eq(expenses.groupId, groupId),
    orderBy: [desc(expenses.date), desc(expenses.createdAt)],
  });
  if (rows.length === 0) return [];
  const splits = await db.query.expenseSplits.findMany({
    where: inArray(expenseSplits.expenseId, rows.map((r) => r.id)),
  });
  return rows.map((e) => ({ ...e, splits: splits.filter((s) => s.expenseId === e.id) }));
}

export async function getExpense(expenseId: string, userId: string): Promise<ExpenseWithSplits> {
  const e = await db.query.expenses.findFirst({ where: eq(expenses.id, expenseId) });
  if (!e) throw notFound("Expense not found");
  await assertMember(e.groupId, userId);
  const splits = await db.query.expenseSplits.findMany({ where: eq(expenseSplits.expenseId, e.id) });
  return { ...e, splits };
}

export async function createExpense(groupId: string, actorId: string, input: ExpenseInput) {
  const splits = await validateInput(groupId, actorId, input);
  const now = new Date();
  const e: Expense = {
    id: nanoid(12),
    groupId,
    description: input.description,
    amountCents: input.amountCents,
    paidBy: input.paidBy,
    splitType: input.splitType,
    date: input.date,
    notes: input.notes ?? null,
    createdBy: actorId,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(expenses).values(e);
  await db.insert(expenseSplits).values(splits.map((s) => ({ expenseId: e.id, ...s })));
  return getExpense(e.id, actorId);
}

export async function updateExpense(expenseId: string, actorId: string, input: ExpenseInput) {
  const existing = await getExpense(expenseId, actorId);
  const splits = await validateInput(existing.groupId, actorId, input);
  await db
    .update(expenses)
    .set({
      description: input.description,
      amountCents: input.amountCents,
      paidBy: input.paidBy,
      splitType: input.splitType,
      date: input.date,
      notes: input.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(expenses.id, expenseId));
  await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
  await db.insert(expenseSplits).values(splits.map((s) => ({ expenseId, ...s })));
  return getExpense(expenseId, actorId);
}

export async function deleteExpense(expenseId: string, actorId: string) {
  await getExpense(expenseId, actorId); // membership check
  await db.delete(expenses).where(eq(expenses.id, expenseId));
}

export async function listSettlements(groupId: string, userId: string): Promise<Settlement[]> {
  await assertMember(groupId, userId);
  return db.query.settlements.findMany({
    where: eq(settlements.groupId, groupId),
    orderBy: [desc(settlements.date), desc(settlements.createdAt)],
  });
}

export async function createSettlement(
  groupId: string,
  actorId: string,
  input: { fromUserId: string; toUserId: string; amountCents: number; date: string; note?: string | null },
) {
  const g = await getGroupForUser(groupId, actorId);
  const ids = new Set(g.members.map((m) => m.id));
  if (!ids.has(input.fromUserId) || !ids.has(input.toUserId)) throw badRequest("Not a group member");
  if (input.fromUserId === input.toUserId) throw badRequest("Payer and recipient must differ");
  const s: Settlement = {
    id: nanoid(12),
    groupId,
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
    amountCents: input.amountCents,
    date: input.date,
    note: input.note ?? null,
    createdBy: actorId,
    createdAt: new Date(),
  };
  await db.insert(settlements).values(s);
  return s;
}

export async function deleteSettlement(settlementId: string, actorId: string) {
  const s = await db.query.settlements.findFirst({ where: eq(settlements.id, settlementId) });
  if (!s) throw notFound("Settlement not found");
  await assertMember(s.groupId, actorId);
  if (![s.fromUserId, s.toUserId, s.createdBy].includes(actorId)) {
    throw forbidden("Only the people involved can delete this payment");
  }
  await db.delete(settlements).where(and(eq(settlements.id, settlementId)));
}
