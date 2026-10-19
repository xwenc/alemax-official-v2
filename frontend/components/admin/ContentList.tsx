"use client";
import Link from "next/link";
import { useState } from "react";
import type { CmsKind } from "@/lib/cms-types";
import useContentLibrary from "./useContentLibrary";
import ContentFilters, { emptyFilters } from "./ContentFilters";
import ContentTable from "./ContentTable";
import AdminIcon from "./AdminIcon";
import { kindName, publishedDate } from "./admin-content";
export default function ContentList({
  kind,
  description,
}: {
  kind: CmsKind;
  description: string;
}) {
  const { items, loading, error, refresh } = useContentLibrary();
  const [filters, setFilters] = useState(emptyFilters),
    [applied, setApplied] = useState(emptyFilters),
    [page, setPage] = useState(1);
  const filtered = items.filter((item) => {
    const search =
      `${item.translations.en?.fields.title || ""} ${item.slug} ${item.shared.code || ""}`.toLowerCase();
    return (
      item.kind === kind &&
      search.includes(applied.query.trim().toLowerCase()) &&
      (applied.english === "all" ||
        (applied.english === "published"
          ? !!item.published.en
          : !item.published.en)) &&
      (applied.spanish === "all" ||
        (applied.spanish === "published"
          ? !!item.published.es
          : applied.spanish === "missing"
            ? !item.translations.es
            : item.translations.es?.status === applied.spanish)) &&
      (applied.period === "all" ||
        publishedDate(item) >=
          Date.now() / 1000 - Number(applied.period) * 86400)
    );
  });
  const pages = Math.max(1, Math.ceil(filtered.length / 15)),
    currentPage = Math.min(page, pages);
  return (
    <>
      <div className="admin-intro">
        <div>
          <h1>{kindName(kind)}</h1>
          <p>{description}</p>
        </div>
        <div className="admin-page-actions">
          <button onClick={refresh} disabled={loading}>
            Refresh
          </button>
          <Link
            className="admin-primary admin-button"
            href={`/admin/content/new?kind=${kind}`}
          >
            <AdminIcon name="plus" />
            New{" "}
            {kind === "production-base"
              ? "production base"
              : kind === "article"
                ? "update"
                : kind}
          </Link>
        </div>
      </div>
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      <section
        className="admin-data-panel"
        aria-label={`${kindName(kind)} library`}
      >
        <ContentFilters
          value={filters}
          onChange={setFilters}
          disabled={loading}
          onApply={() => {
            setApplied(filters);
            setPage(1);
          }}
          onReset={() => {
            setFilters(emptyFilters);
            setApplied(emptyFilters);
            setPage(1);
          }}
        />
        <ContentTable
          items={filtered.slice((currentPage - 1) * 15, currentPage * 15)}
          products={kind === "product"}
          loading={loading}
          page={currentPage}
          pages={pages}
          total={filtered.length}
          onPage={setPage}
        />
      </section>
    </>
  );
}
