import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Nav } from "@/components/Nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 p-4">{children}</main>
    </>
  );
}
