import { handler, json, requireUser } from "@/lib/api";
import { deleteSettlement } from "@/lib/services/expenses";

export const DELETE = handler<{ id: string }>(async (req, { params }) => {
  const user = await requireUser(req);
  await deleteSettlement(params.id, user.id);
  return json({ ok: true });
});
