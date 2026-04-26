import { Role } from "@/lib/roles";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import MemberPanel from "./MemberPanel";

export default async function MemberPage() {
  const u = await getCurrentUser();
  if (!u || u.role !== Role.MEMBER) {
    redirect("/dashboard");
  }
  return <MemberPanel />;
}
