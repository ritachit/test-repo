import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handler, json, parseBody, badRequest } from "@/lib/api";
import { hashPassword, setSessionCookie, signSession } from "@/lib/auth";
import { signupSchema } from "@/lib/validation";

export const POST = handler(async (req) => {
  const body = await parseBody(req, signupSchema);
  const existing = await db.query.users.findFirst({ where: eq(users.email, body.email) });
  if (existing) throw badRequest("An account with that email already exists");
  const user = {
    id: nanoid(12),
    name: body.name,
    email: body.email,
    passwordHash: await hashPassword(body.password),
    createdAt: new Date(),
  };
  await db.insert(users).values(user);
  const token = await signSession(user.id);
  await setSessionCookie(token);
  return json({ user: { id: user.id, name: user.name, email: user.email }, token }, 201);
});
