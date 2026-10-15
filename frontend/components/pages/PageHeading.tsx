import type { ReactNode } from "react";
import type { Locale } from "@/lib/content";
export default function PageHeading({
  locale,
  title,
  compact = false,
  children,
}: {
  locale: Locale;
  title: string;
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className="inner-heading container">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <a href={`/${locale}`}>ALEMAX</a>
        <span>/</span>
        <span>{title}</span>
      </nav>
      {!compact && (
        <>
          <p className="eyebrow green">ALEMAX GLOBAL INGREDIENTS</p>
          <h1>{title}</h1>
        </>
      )}
      {children}
    </section>
  );
}
