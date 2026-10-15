import type { ReactNode } from "react";
import { pageLocale } from "@/lib/page-routing";
export default async function LanguageLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ language: string }>;
}) {
  pageLocale((await params).language);
  return children;
}
