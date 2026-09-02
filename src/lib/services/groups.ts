import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { groupMembers, groups, users, type Group } from "@/db/schema";
import { badRequest, forbidden, notFound } from "@/lib/api";
import { type PublicUser, toPublicUser } from "@/lib/auth";
import { getGroupNet } from "./balances";

export type GroupWithMembers = Group & { members: PublicUser[] };

export async function listGroupsForUser(userId: string): Promise<GroupWithMembers[]> {
  const rows = await db
    .select({ g: groups })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(eq(groupMembers.userId, userId));
  const list = rows.map((r) => r.g);
  if (list.length === 0) return [];
  const members = await db
    .select({ groupId: groupMembers.groupId, u: users })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(inArray(groupMembers.groupId, list.map((g) => g.id)));
  return list.map((g) => ({
    ...g,
    members: members.filter((m) => m.groupId === g.id).map((m) => toPublicUser(m.u)),
  }));
}

export async function getGroupForUser(groupId: string, userId: string): Promise<GroupWithMembers> {
  const g = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
  if (!g) throw notFound("Group not found");
  const members = await db
    .select({ u: users })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, groupId));
  const list = members.map((m) => toPublicUser(m.u));
  if (!list.some((m) => m.id === userId)) throw forbidden("You are not a member of this group");
  return { ...g, members: list };
}

export async function assertMember(groupId: string, userId: string) {
  const m = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
  });
  if (!m) throw forbidden("You are not a member of this group");
}

export async function createGroup(userId: string, input: { name: string; currency: string }) {
  const now = new Date();
  const g: Group = {
    id: nanoid(12),
    name: input.name,
    currency: input.currency,
    inviteCode: nanoid(10),
    simplifyDebts: true,
    createdBy: userId,
    createdAt: now,
  };
  await db.insert(groups).values(g);
  await db.insert(groupMembers).values({ groupId: g.id, userId, joinedAt: now });
  return g;
}

export async function updateGroup(
  groupId: string,
  userId: string,
  patch: Partial<Pick<Group, "name" | "currency" | "simplifyDebts">>,
) {
  await assertMember(groupId, userId);
  await db.update(groups).set(patch).where(eq(groups.id, groupId));
}

export async function deleteGroup(groupId: string, userId: string) {
  const g = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
  if (!g) throw notFound("Group not found");
  if (g.createdBy !== userId) throw forbidden("Only the group creator can delete it");
  await db.delete(groups).where(eq(groups.id, groupId));
}

export async function addMemberByEmail(groupId: string, actorId: string, email: string) {
  await assertMember(groupId, actorId);
  const u = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  if (!u) throw notFound("No account with that email. Share the invite link instead.");
  await addMember(groupId, u.id);
  return toPublicUser(u);
}

async function addMember(groupId: string, userId: string) {
  const existing = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
  });
  if (existing) return;
  await db.insert(groupMembers).values({ groupId, userId, joinedAt: new Date() });
}

export async function joinByInviteCode(code: string, userId: string) {
  const g = await db.query.groups.findFirst({ where: eq(groups.inviteCode, code) });
  if (!g) throw notFound("Invalid invite link");
  await addMember(g.id, userId);
  return g;
}

export async function removeMember(groupId: string, actorId: string, targetId: string) {
  await assertMember(groupId, actorId);
  await assertMember(groupId, targetId);
  const net = await getGroupNet(groupId);
  if ((net.get(targetId) ?? 0) !== 0) {
    throw badRequest("Member still has an outstanding balance. Settle up first.");
  }
  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetId)));
}

export async function getUsersByIds(ids: string[]): Promise<Record<string, PublicUser>> {
  if (ids.length === 0) return {};
  const rows = await db.select().from(users).where(inArray(users.id, ids));
  return Object.fromEntries(rows.map((u) => [u.id, toPublicUser(u)]));
}
