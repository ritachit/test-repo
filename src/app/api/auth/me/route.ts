import { handler, json, requireUser } from "@/lib/api";

export const GET = handler(async (req) => json({ user: await requireUser(req) }));
