import { handler, json, parseBody, requireUser } from "@/lib/api";
import { createSettlement, listSettlements } from "@/lib/services/expenses";
import { settlementSchema } from "@/lib/validation";

type P = { id: string };

export const GET = handler<P>(async (req, { params }) => {
  const user = await requireUser(req);
  return json({ settlements: await listSettlements(params.id, user.id) });
});

export const POST = handler<P>(async (req, { params }) => {
  const user = await requireUser(req);
  const body = await parseBody(req, settlementSchema);
  return json({ settlement: await createSettlement(params.id, user.id, body) }, 201);
});
