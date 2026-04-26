import { redirect } from "next/navigation";
import { Role } from "@/lib/roles";
import { getCurrentUser } from "@/lib/authz";

export default async function DashboardIndex() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === Role.ADMIN) redirect("/dashboard/admin");
  if (user.role === Role.LIBRARIAN) redirect("/dashboard/librarian");
  redirect("/dashboard/member");
}
