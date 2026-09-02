import { handler, json, requireUser } from "@/lib/api";
import { getGroupBalances } from "@/lib/services/balances";
import { assertMember } from "@/lib/services/groups";

export const GET = handler<{ id: string }>(async (req, { params }) => {
  const user = await requireUser(req);
  await assertMember(params.id, user.id);
  return json(await getGroupBalances(params.id));
});
