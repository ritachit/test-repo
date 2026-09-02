import { handler, json, parseBody, requireUser } from "@/lib/api";
import { createGroup, listGroupsForUser } from "@/lib/services/groups";
import { createGroupSchema } from "@/lib/validation";

export const GET = handler(async (req) => {
  const user = await requireUser(req);
  return json({ groups: await listGroupsForUser(user.id) });
});

export const POST = handler(async (req) => {
  const user = await requireUser(req);
  const body = await parseBody(req, createGroupSchema);
  return json({ group: await createGroup(user.id, body) }, 201);
});
