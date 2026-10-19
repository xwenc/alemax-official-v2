import ContentEditor from "@/components/admin/ContentEditor";
import { kinds } from "@/components/admin/admin-content";
import type { CmsKind } from "@/lib/cms-types";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const initialKind = kinds.includes(kind as CmsKind)
    ? (kind as CmsKind)
    : "product";
  return <ContentEditor id="new" initialKind={initialKind} />;
}
