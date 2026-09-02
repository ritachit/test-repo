"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SplitType } from "@/db/schema";
import type { PublicUser } from "@/lib/auth";
import type { ExpenseWithSplits } from "@/lib/services/expenses";
import { api, todayISO } from "@/lib/client";
import { centsToInput, formatMoney, parseAmountToCents } from "@/lib/money";
import { computeSplits } from "@/lib/split";
import { Button, ErrorText, Field, Input, Modal, Select } from "./ui";

const SPLIT_LABELS: Record<SplitType, string> = {
  equal: "Equally",
  exact: "By exact amounts",
  percent: "By percentage",
  shares: "By shares",
};

type Props = {
  groupId: string;
  currency: string;
  members: PublicUser[];
  me: PublicUser;
  existing?: ExpenseWithSplits;
  onClose: () => void;
};

export function ExpenseForm({ groupId, currency, members, me, existing, onClose }: Props) {
  const router = useRouter();
  const [description, setDescription] = useState(existing?.description ?? "");
  const [amount, setAmount] = useState(existing ? centsToInput(existing.amountCents) : "");
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [paidBy, setPaidBy] = useState(existing?.paidBy ?? me.id);
  const [splitType, setSplitType] = useState<SplitType>(existing?.splitType ?? "equal");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [included, setIncluded] = useState<Set<string>>(
    () => new Set(existing ? existing.splits.map((s) => s.userId) : members.map((m) => m.id)),
  );
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const s of existing?.splits ?? []) {
      if (s.value == null) continue;
      v[s.userId] = existing?.splitType === "exact" ? centsToInput(s.value) : String(s.value);
    }
    return v;
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const amountCents = parseAmountToCents(amount || "0") ?? 0;

  const participants = useMemo(() => {
    return members
      .filter((m) => (splitType === "equal" ? included.has(m.id) : true))
      .map((m) => {
        const raw = values[m.id] ?? "";
        let value: number | undefined;
        if (splitType === "exact") value = parseAmountToCents(raw || "0") ?? 0;
        else if (splitType !== "equal") value = Number(raw) || 0;
        return { userId: m.id, value };
      })
      .filter((p) => splitType === "equal" || (p.value ?? 0) > 0);
  }, [members, splitType, included, values]);

  const preview = useMemo(() => {
    if (amountCents <= 0 || participants.length === 0) return { splits: null, err: null };
    try {
      return { splits: computeSplits(amountCents, splitType, participants), err: null };
    } catch (e) {
      return { splits: null, err: (e as Error).message };
    }
  }, [amountCents, splitType, participants]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const body = { description, amountCents, paidBy, splitType, date, notes: notes || null, participants };
      if (existing) await api(`/api/expenses/${existing.id}`, { method: "PATCH", body });
      else await api(`/api/groups/${groupId}/expenses`, { body });
      router.refresh();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const splitTotal =
    splitType === "exact"
      ? formatMoney(participants.reduce((a, p) => a + (p.value ?? 0), 0), currency)
      : splitType === "percent"
        ? `${participants.reduce((a, p) => a + (p.value ?? 0), 0)}%`
        : splitType === "shares"
          ? `${participants.reduce((a, p) => a + (p.value ?? 0), 0)} shares`
          : null;

  return (
    <Modal title={existing ? "Edit expense" : "Add expense"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dinner" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Amount (${currency})`}>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Paid by">
            <Select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === me.id ? "You" : m.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Split">
            <Select value={splitType} onChange={(e) => setSplitType(e.target.value as SplitType)}>
              {(Object.keys(SPLIT_LABELS) as SplitType[]).map((t) => (
                <option key={t} value={t}>
                  {SPLIT_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
          {members.map((m) => {
            const share = preview.splits?.find((s) => s.userId === m.id)?.amountCents;
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 border-b border-zinc-100 px-3 py-2 text-sm last:border-b-0 dark:border-zinc-800"
              >
                {splitType === "equal" ? (
                  <input
                    type="checkbox"
                    checked={included.has(m.id)}
                    onChange={(e) => {
                      const next = new Set(included);
                      if (e.target.checked) next.add(m.id);
                      else next.delete(m.id);
                      setIncluded(next);
                    }}
                  />
                ) : (
                  <Input
                    inputMode="decimal"
                    className="w-24"
                    value={values[m.id] ?? ""}
                    onChange={(e) => setValues({ ...values, [m.id]: e.target.value })}
                    placeholder={splitType === "exact" ? "0.00" : splitType === "percent" ? "%" : "shares"}
                  />
                )}
                <span className="flex-1">{m.id === me.id ? "You" : m.name}</span>
                <span className="tabular-nums text-zinc-500">
                  {share != null ? formatMoney(share, currency) : ""}
                </span>
              </div>
            );
          })}
        </div>
        {splitTotal && <p className="text-xs text-zinc-500">Total entered: {splitTotal}</p>}

        <Field label="Notes (optional)">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <ErrorText>{error ?? preview.err}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !description || amountCents <= 0 || !preview.splits}>
            {existing ? "Save" : "Add"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
