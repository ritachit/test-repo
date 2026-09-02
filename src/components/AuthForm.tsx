"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Card, ErrorText, Field, Input } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await api(`/api/auth/${mode}`, { body: Object.fromEntries(fd) });
      router.push(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center p-4">
      <h1 className="mb-1 text-2xl font-bold text-emerald-600">Splitly</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {mode === "login" ? "Sign in to your account" : "Create an account"}
      </p>
      <Card>
        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <Field label="Name">
              <Input name="name" required autoComplete="name" />
            </Field>
          )}
          <Field label="Email">
            <Input name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="Password">
            <Input
              name="password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : 1}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={busy} className="w-full">
            {mode === "login" ? "Sign in" : "Sign up"}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-zinc-500">
        {mode === "login" ? (
          <>
            No account?{" "}
            <Link className="text-emerald-600" href={`/signup?next=${encodeURIComponent(next)}`}>
              Sign up
            </Link>
          </>
        ) : (
          <>
            Have an account?{" "}
            <Link className="text-emerald-600" href={`/login?next=${encodeURIComponent(next)}`}>
              Sign in
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
