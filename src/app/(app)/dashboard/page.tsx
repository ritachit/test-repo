import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { getUsersByIds, listGroupsForUser } from "@/lib/services/groups";
import { getGroupNet, getOverallBalances } from "@/lib/services/balances";
import { Amount, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireCurrentUser();
  const [groups, overall] = await Promise.all([
    listGroupsForUser(user.id),
    getOverallBalances(user.id),
  ]);
  const groupNets = await Promise.all(
    groups.map(async (g) => ({ g, net: (await getGroupNet(g.id)).get(user.id) ?? 0 })),
  );
  const people = await getUsersByIds(overall.flatMap((o) => o.balances.map((b) => b.counterpartyId)));

  return (
    <div className="space-y-6">
      <section>
        <h1 className="mb-3 text-xl font-semibold">Your balances</h1>
        {overall.length === 0 && <p className="text-sm text-zinc-500">You are all settled up.</p>}
        {overall.map(({ currency, balances }) => {
          const owed = balances.filter((b) => b.amountCents > 0).reduce((a, b) => a + b.amountCents, 0);
          const owe = balances.filter((b) => b.amountCents < 0).reduce((a, b) => a - b.amountCents, 0);
          return (
            <Card key={currency} className="mb-3">
              <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-zinc-500">You owe</div>
                  <Amount cents={-owe} currency={currency} signed />
                </div>
                <div>
                  <div className="text-zinc-500">You are owed</div>
                  <Amount cents={owed} currency={currency} signed />
                </div>
              </div>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {balances.map((b) => (
                  <li key={b.counterpartyId} className="flex items-center justify-between py-2 text-sm">
                    <span>{people[b.counterpartyId]?.name ?? "Unknown"}</span>
                    <span>
                      {b.amountCents > 0 ? "owes you " : "you owe "}
                      <Amount cents={b.amountCents} currency={currency} signed />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Groups</h2>
          <Link href="/groups/new" className="text-sm font-medium text-emerald-600">
            + New group
          </Link>
        </div>
        {groups.length === 0 && (
          <p className="text-sm text-zinc-500">No groups yet. Create one to start splitting expenses.</p>
        )}
        <ul className="space-y-2">
          {groupNets.map(({ g, net }) => (
            <li key={g.id}>
              <Link href={`/groups/${g.id}`} className="block">
                <Card className="flex items-center justify-between hover:border-emerald-400">
                  <div>
                    <div className="font-medium">{g.name}</div>
                    <div className="text-xs text-zinc-500">
                      {g.members.length} member{g.members.length === 1 ? "" : "s"} · {g.currency}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-xs text-zinc-500">
                      {net === 0 ? "settled up" : net > 0 ? "you are owed" : "you owe"}
                    </div>
                    <Amount cents={net} currency={g.currency} signed />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
