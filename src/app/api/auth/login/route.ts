import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handler, json, parseBody, ApiError } from "@/lib/api";
import { setSessionCookie, signSession, toPublicUser, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export const POST = handler(async (req) => {
  const body = await parseBody(req, loginSchema);
  const u = await db.query.users.findFirst({ where: eq(users.email, body.email) });
  if (!u || !(await verifyPassword(body.password, u.passwordHash))) {
    throw new ApiError(401, "Invalid email or password");
  }
  const token = await signSession(u.id);
  await setSessionCookie(token);
  return json({ user: toPublicUser(u), token });
});
