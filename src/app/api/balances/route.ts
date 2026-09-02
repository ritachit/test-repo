import { handler, json, requireUser } from "@/lib/api";
import { getOverallBalances } from "@/lib/services/balances";

export const GET = handler(async (req) => {
  const user = await requireUser(req);
  return json({ balances: await getOverallBalances(user.id) });
});
