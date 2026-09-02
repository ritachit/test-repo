import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

export const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production");
    }
    return new TextEncoder().encode("dev-only-insecure-secret-change-me");
  }
  return new TextEncoder().encode(s);
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}

export type PublicUser = Pick<User, "id" | "name" | "email">;

export function toPublicUser(u: User): PublicUser {
  return { id: u.id, name: u.name, email: u.email };
}

/** Resolve the current user from a Bearer token (API clients) or the cookie. */
export async function getCurrentUser(req?: Request): Promise<PublicUser | null> {
  let token: string | undefined;
  const auth = req?.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) token = auth.slice(7).trim();
  if (!token) token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await verifySession(token);
  if (!userId) return null;
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return u ? toPublicUser(u) : null;
}

/** For server components: redirect to /login when signed out. */
export async function requireCurrentUser(): Promise<PublicUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}
