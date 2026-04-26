import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { DashboardNav } from "@/components/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <DashboardNav
        user={{
          name: user.name,
          email: user.email,
          role: user.role,
        }}
      />
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </div>
  );
}
