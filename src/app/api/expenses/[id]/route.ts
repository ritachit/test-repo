import { handler, json, parseBody, requireUser } from "@/lib/api";
import { deleteExpense, getExpense, updateExpense } from "@/lib/services/expenses";
import { expenseSchema } from "@/lib/validation";

type P = { id: string };

export const GET = handler<P>(async (req, { params }) => {
  const user = await requireUser(req);
  return json({ expense: await getExpense(params.id, user.id) });
});

export const PATCH = handler<P>(async (req, { params }) => {
  const user = await requireUser(req);
  const body = await parseBody(req, expenseSchema);
  return json({ expense: await updateExpense(params.id, user.id, body) });
});

export const DELETE = handler<P>(async (req, { params }) => {
  const user = await requireUser(req);
  await deleteExpense(params.id, user.id);
  return json({ ok: true });
});
