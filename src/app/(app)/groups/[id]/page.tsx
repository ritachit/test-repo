import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { getGroupForUser } from "@/lib/services/groups";
import { listExpenses, listSettlements } from "@/lib/services/expenses";
import { getGroupBalances } from "@/lib/services/balances";
import { GroupView } from "@/components/GroupView";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCurrentUser();
  let group;
  try {
    group = await getGroupForUser(id, user.id);
  } catch (e) {
    if (e instanceof ApiError) notFound();
    throw e;
  }
  const [expenses, settlements, balances] = await Promise.all([
    listExpenses(id, user.id),
    listSettlements(id, user.id),
    getGroupBalances(id),
  ]);
  return (
    <GroupView
      me={user}
      group={group}
      expenses={expenses}
      settlements={settlements}
      balances={balances}
    />
  );
}
