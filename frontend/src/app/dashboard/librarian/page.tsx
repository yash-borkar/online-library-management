import { Role } from "@/lib/roles";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import LibrarianPanel from "./LibrarianPanel";

export default async function LibrarianPage() {
  const u = await getCurrentUser();
  if (!u || u.role !== Role.LIBRARIAN) {
    redirect("/dashboard");
  }
  return <LibrarianPanel />;
}
