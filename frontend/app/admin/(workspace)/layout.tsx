import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-session";
import AdminShell from "@/components/admin/AdminShell";
export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await isAdmin())) redirect("/admin");
  return (
    <AdminShell username={process.env.ADMIN_USERNAME || "admin"}>
      {children}
    </AdminShell>
  );
}
