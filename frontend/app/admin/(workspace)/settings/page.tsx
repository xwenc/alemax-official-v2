import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-session";
import { internalApi } from "@/lib/internal-api";
import AdministratorPage from "@/components/admin/AdministratorPage";
export default async function Page() {
  if (!(await isAdmin())) redirect("/admin");
  let translationConfigured: boolean | null = null;
  try {
    const response = await internalApi("/cms/content");
    if (response.ok)
      translationConfigured = (await response.json()).translation_configured;
  } catch {}
  return (
    <AdministratorPage
      username={process.env.ADMIN_USERNAME || "admin"}
      translationConfigured={translationConfigured}
    />
  );
}
