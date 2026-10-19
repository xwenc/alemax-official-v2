import { notFound } from "next/navigation";
import ContentEditor from "@/components/admin/ContentEditor";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  return <ContentEditor key={id} id={id} />;
}
