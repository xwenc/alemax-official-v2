import { redirect } from "next/navigation";
import { adminConfigured, isAdmin } from "@/lib/admin-session";
import AdminLogin from "@/components/admin/AdminLogin";
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdmin()) redirect("/admin/overview");
  return (
    <AdminLogin
      configured={adminConfigured()}
      error={(await searchParams).error}
    />
  );
}
