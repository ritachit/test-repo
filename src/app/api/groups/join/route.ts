import { handler, json, parseBody, requireUser } from "@/lib/api";
import { joinByInviteCode } from "@/lib/services/groups";
import { joinSchema } from "@/lib/validation";

export const POST = handler(async (req) => {
  const user = await requireUser(req);
  const { code } = await parseBody(req, joinSchema);
  return json({ group: await joinByInviteCode(code, user.id) });
});
