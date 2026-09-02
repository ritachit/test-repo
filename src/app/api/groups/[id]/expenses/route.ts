import { handler, json, parseBody, requireUser } from "@/lib/api";
import { createExpense, listExpenses } from "@/lib/services/expenses";
import { expenseSchema } from "@/lib/validation";

type P = { id: string };

export const GET = handler<P>(async (req, { params }) => {
  const user = await requireUser(req);
  return json({ expenses: await listExpenses(params.id, user.id) });
});

export const POST = handler<P>(async (req, { params }) => {
  const user = await requireUser(req);
  const body = await parseBody(req, expenseSchema);
  return json({ expense: await createExpense(params.id, user.id, body) }, 201);
});
