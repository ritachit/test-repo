import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { joinByInviteCode } from "@/lib/services/groups";
import { ApiError } from "@/lib/api";

export default async function Join({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/join/${code}`)}`);
  let groupId: string;
  try {
    groupId = (await joinByInviteCode(code, user.id)).id;
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : "Could not join group";
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <p className="mb-4">{msg}</p>
        <Link href="/dashboard" className="text-emerald-600">Go to dashboard</Link>
      </main>
    );
  }
  redirect(`/groups/${groupId}`);
}
