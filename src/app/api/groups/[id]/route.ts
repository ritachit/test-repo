import { handler, json, parseBody, requireUser } from "@/lib/api";
import { deleteGroup, getGroupForUser, updateGroup } from "@/lib/services/groups";
import { updateGroupSchema } from "@/lib/validation";

type P = { id: string };

export const GET = handler<P>(async (req, { params }) => {
  const user = await requireUser(req);
  return json({ group: await getGroupForUser(params.id, user.id) });
});

export const PATCH = handler<P>(async (req, { params }) => {
  const user = await requireUser(req);
  const body = await parseBody(req, updateGroupSchema);
  await updateGroup(params.id, user.id, body);
  return json({ group: await getGroupForUser(params.id, user.id) });
});

export const DELETE = handler<P>(async (req, { params }) => {
  const user = await requireUser(req);
  await deleteGroup(params.id, user.id);
  return json({ ok: true });
});
