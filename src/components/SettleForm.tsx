"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicUser } from "@/lib/auth";
import { api, todayISO } from "@/lib/client";
import { centsToInput, parseAmountToCents } from "@/lib/money";
import { Button, ErrorText, Field, Input, Modal, Select } from "./ui";

type Props = {
  groupId: string;
  currency: string;
  members: PublicUser[];
  me: PublicUser;
  initial?: { from: string; to: string; amountCents: number };
  onClose: () => void;
};

export function SettleForm({ groupId, currency, members, me, initial, onClose }: Props) {
  const router = useRouter();
  const other = members.find((m) => m.id !== me.id)?.id ?? me.id;
  const [from, setFrom] = useState(initial?.from ?? me.id);
  const [to, setTo] = useState(initial?.to ?? other);
  const [amount, setAmount] = useState(initial ? centsToInput(initial.amountCents) : "");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const amountCents = parseAmountToCents(amount);
    if (!amountCents) return setError("Enter a valid amount");
    setBusy(true);
    setError(null);
    try {
      await api(`/api/groups/${groupId}/settlements`, {
        body: { fromUserId: from, toUserId: to, amountCents, date, note: note || null },
      });
      router.refresh();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const name = (id: string) => (id === me.id ? "You" : members.find((m) => m.id === id)?.name ?? "?");

  return (
    <Modal title="Record a payment" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Payer">
            <Select value={from} onChange={(e) => setFrom(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{name(m.id)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Recipient">
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{name(m.id)}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Amount (${currency})`}>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Note (optional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || from === to}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
