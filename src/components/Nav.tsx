"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { PublicUser } from "@/lib/auth";

export function Nav({ user }: { user: PublicUser }) {
  const router = useRouter();
  async function logout() {
    await api("/api/auth/logout", { method: "POST", body: {} });
    router.push("/login");
    router.refresh();
  }
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-lg font-bold text-emerald-600">
          Splitly
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-zinc-500 sm:inline">{user.name}</span>
          <button onClick={logout} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
