import { handler, json, parseBody, requireUser } from "@/lib/api";
import { addMemberByEmail, removeMember } from "@/lib/services/groups";
import { addMemberSchema, removeMemberSchema } from "@/lib/validation";

type P = { id: string };

export const POST = handler<P>(async (req, { params }) => {
  const user = await requireUser(req);
  const { email } = await parseBody(req, addMemberSchema);
  return json({ member: await addMemberByEmail(params.id, user.id, email) }, 201);
});

export const DELETE = handler<P>(async (req, { params }) => {
  const user = await requireUser(req);
  const { userId } = await parseBody(req, removeMemberSchema);
  await removeMember(params.id, user.id, userId);
  return json({ ok: true });
});
