"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Settlement } from "@/db/schema";
import type { PublicUser } from "@/lib/auth";
import type { GroupWithMembers } from "@/lib/services/groups";
import type { ExpenseWithSplits } from "@/lib/services/expenses";
import type { GroupBalances } from "@/lib/services/balances";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/money";
import { Amount, Button, Card, ErrorText, Input } from "./ui";
import { ExpenseForm } from "./ExpenseForm";
import { SettleForm } from "./SettleForm";

type Props = {
  me: PublicUser;
  group: GroupWithMembers;
  expenses: ExpenseWithSplits[];
  settlements: Settlement[];
  balances: GroupBalances;
};

type Tab = "expenses" | "balances" | "members";

export function GroupView({ me, group, expenses, settlements, balances }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("expenses");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ExpenseWithSplits | null>(null);
  const [settling, setSettling] = useState<null | { from: string; to: string; amountCents: number } | "blank">(null);
  const [error, setError] = useState<string | null>(null);

  const name = (id: string) => (id === me.id ? "You" : group.members.find((m) => m.id === id)?.name ?? "Former member");
  const cur = group.currency;
  const myNet = balances.net[me.id] ?? 0;

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const feed = [
    ...expenses.map((e) => ({ kind: "expense" as const, date: e.date, createdAt: e.createdAt, e })),
    ...settlements.map((s) => ({ kind: "settlement" as const, date: s.date, createdAt: s.createdAt, s })),
  ].sort((a, b) => (b.date + b.createdAt) > (a.date + a.createdAt) ? 1 : -1);

  const debts = group.simplifyDebts ? balances.simplified : balances.pairwise;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{group.name}</h1>
          <p className="text-sm text-zinc-500">
            {myNet === 0 ? "You are settled up" : myNet > 0 ? "You are owed " : "You owe "}
            {myNet !== 0 && <Amount cents={myNet} currency={cur} signed />}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setSettling("blank")}>Settle up</Button>
          <Button onClick={() => setAdding(true)}>+ Add expense</Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-200 text-sm dark:border-zinc-800">
        {(["expenses", "balances", "members"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 capitalize ${tab === t ? "border-b-2 border-emerald-600 font-medium text-emerald-600" : "text-zinc-500"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <ErrorText>{error}</ErrorText>

      {tab === "expenses" && (
        <ul className="space-y-2">
          {feed.length === 0 && <p className="text-sm text-zinc-500">No expenses yet.</p>}
          {feed.map((item) =>
            item.kind === "expense" ? (
              <li key={item.e.id}>
                <Card className="flex items-center gap-3">
                  <div className="w-12 text-center text-xs text-zinc-500">{item.e.date.slice(5)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{item.e.description}</div>
                    <div className="text-xs text-zinc-500">
                      {name(item.e.paidBy)} paid {formatMoney(item.e.amountCents, cur)}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <MyShare e={item.e} me={me.id} currency={cur} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button className="text-xs text-zinc-500 hover:text-zinc-900" onClick={() => setEditing(item.e)}>
                      Edit
                    </button>
                    <button
                      className="text-xs text-red-600"
                      onClick={() => confirm("Delete this expense?") && run(() => api(`/api/expenses/${item.e.id}`, { method: "DELETE" }))}
                    >
                      Delete
                    </button>
                  </div>
                </Card>
              </li>
            ) : (
              <li key={item.s.id}>
                <Card className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900/60">
                  <div className="w-12 text-center text-xs text-zinc-500">{item.s.date.slice(5)}</div>
                  <div className="flex-1 text-sm">
                    {name(item.s.fromUserId)} paid {name(item.s.toUserId)}{" "}
                    <span className="font-medium">{formatMoney(item.s.amountCents, cur)}</span>
                    {item.s.note && <span className="text-zinc-500"> · {item.s.note}</span>}
                  </div>
                  <button
                    className="text-xs text-red-600"
                    onClick={() => confirm("Delete this payment?") && run(() => api(`/api/settlements/${item.s.id}`, { method: "DELETE" }))}
                  >
                    Delete
                  </button>
                </Card>
              </li>
            ),
          )}
        </ul>
      )}

      {tab === "balances" && (
        <div className="space-y-4">
          <Card>
            <h3 className="mb-2 text-sm font-medium text-zinc-500">Net balances</h3>
            <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
              {group.members.map((m) => {
                const n = balances.net[m.id] ?? 0;
                return (
                  <li key={m.id} className="flex justify-between py-2">
                    <span>{name(m.id)}</span>
                    <span>
                      {n === 0 ? <span className="text-zinc-500">settled up</span> : (
                        <>{n > 0 ? "gets back " : "owes "}<Amount cents={n} currency={cur} signed /></>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-500">
                {group.simplifyDebts ? "Suggested payments (simplified)" : "Who owes whom"}
              </h3>
              <label className="flex items-center gap-1 text-xs text-zinc-500">
                <input
                  type="checkbox"
                  checked={group.simplifyDebts}
                  onChange={(e) =>
                    run(() => api(`/api/groups/${group.id}`, { method: "PATCH", body: { simplifyDebts: e.target.checked } }))
                  }
                />
                Simplify debts
              </label>
            </div>
            {debts.length === 0 && <p className="text-sm text-zinc-500">Everyone is settled up.</p>}
            <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
              {debts.map((d) => (
                <li key={`${d.from}-${d.to}`} className="flex items-center justify-between py-2">
                  <span>
                    {name(d.from)} → {name(d.to)}: <span className="font-medium">{formatMoney(d.amountCents, cur)}</span>
                  </span>
                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setSettling(d)}>
                    Settle
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === "members" && <Members group={group} me={me} run={run} />}

      {adding && (
        <ExpenseForm groupId={group.id} currency={cur} members={group.members} me={me} onClose={() => setAdding(false)} />
      )}
      {editing && (
        <ExpenseForm groupId={group.id} currency={cur} members={group.members} me={me} existing={editing} onClose={() => setEditing(null)} />
      )}
      {settling && (
        <SettleForm
          groupId={group.id}
          currency={cur}
          members={group.members}
          me={me}
          initial={settling === "blank" ? undefined : settling}
          onClose={() => setSettling(null)}
        />
      )}
    </div>
  );
}

function MyShare({ e, me, currency }: { e: ExpenseWithSplits; me: string; currency: string }) {
  const myOwed = e.splits.find((s) => s.userId === me)?.amountCents ?? 0;
  if (e.paidBy === me) {
    const lent = e.amountCents - myOwed;
    return lent === 0 ? <span className="text-zinc-500">not involved</span> : (
      <><div className="text-xs text-zinc-500">you lent</div><Amount cents={lent} currency={currency} signed /></>
    );
  }
  if (myOwed === 0) return <span className="text-xs text-zinc-500">not involved</span>;
  return (
    <><div className="text-xs text-zinc-500">you borrowed</div><Amount cents={-myOwed} currency={currency} signed /></>
  );
}

function Members({ group, me, run }: { group: GroupWithMembers; me: PublicUser; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/join/${group.inviteCode}` : "";

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-2 text-sm font-medium text-zinc-500">Invite link</h3>
        <div className="flex gap-2">
          <Input readOnly value={link} onFocus={(e) => e.target.select()} />
          <Button
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api(`/api/groups/${group.id}/members`, { body: { email } })).then(() => setEmail(""));
          }}
        >
          <Input type="email" placeholder="Add by email (existing account)" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" variant="secondary">Add</Button>
        </form>
      </Card>
      <Card>
        <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
          {group.members.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <div>
                <div>{m.id === me.id ? `${m.name} (you)` : m.name}</div>
                <div className="text-xs text-zinc-500">{m.email}</div>
              </div>
              <Button
                variant="danger"
                className="px-2 py-1 text-xs"
                onClick={() =>
                  confirm(m.id === me.id ? "Leave this group?" : `Remove ${m.name}?`) &&
                  run(() => api(`/api/groups/${group.id}/members`, { method: "DELETE", body: { userId: m.id } })).then(() => {
                    if (m.id === me.id) router.push("/dashboard");
                  })
                }
              >
                {m.id === me.id ? "Leave" : "Remove"}
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      {group.createdBy === me.id && (
        <Button
          variant="danger"
          onClick={() =>
            confirm("Delete this group and all its expenses? This cannot be undone.") &&
            run(() => api(`/api/groups/${group.id}`, { method: "DELETE" })).then(() => router.push("/dashboard"))
          }
        >
          Delete group
        </Button>
      )}
    </div>
  );
}
