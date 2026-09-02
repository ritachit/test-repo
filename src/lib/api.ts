import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { getCurrentUser, type PublicUser } from "./auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const unauthorized = () => new ApiError(401, "Not signed in");
export const forbidden = (m = "Forbidden") => new ApiError(403, m);
export const notFound = (m = "Not found") => new ApiError(404, m);
export const badRequest = (m: string) => new ApiError(400, m);

type Ctx<P> = { params: Promise<P> };

/** Wrap a route handler: maps thrown errors to JSON responses. */
export function handler<P = Record<string, never>>(
  fn: (req: Request, ctx: { params: P }) => Promise<Response>,
) {
  return async (req: Request, ctx: Ctx<P>): Promise<Response> => {
    try {
      return await fn(req, { params: await ctx.params });
    } catch (e) {
      if (e instanceof ApiError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      if (e instanceof ZodError) {
        return NextResponse.json(
          { error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
          { status: 400 },
        );
      }
      console.error(e);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  };
}

export async function requireUser(req: Request): Promise<PublicUser> {
  const u = await getCurrentUser(req);
  if (!u) throw unauthorized();
  return u;
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw badRequest("Invalid JSON body");
  }
  return schema.parse(json);
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
