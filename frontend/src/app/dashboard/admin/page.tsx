import { Role } from "@/lib/roles";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import AdminPanel from "./AdminPanel";

export default async function AdminPage() {
  const u = await getCurrentUser();
  if (!u || u.role !== Role.ADMIN) {
    redirect("/dashboard");
  }
  return <AdminPanel />;
}
