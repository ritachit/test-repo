"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Card, ErrorText, Field, Input } from "@/components/ui";

export default function NewGroup() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const { group } = await api<{ group: { id: string } }>("/api/groups", {
        body: { name: fd.get("name"), currency: fd.get("currency") },
      });
      router.push(`/groups/${group.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-xl font-semibold">New group</h1>
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Group name">
            <Input name="name" required placeholder="Trip to Lisbon" />
          </Field>
          <Field label="Currency (ISO code)">
            <Input name="currency" defaultValue="USD" maxLength={3} required />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={busy}>
            Create group
          </Button>
        </form>
      </Card>
    </div>
  );
}
