import Link from "next/link";
import type { CmsItem } from "@/lib/cms-types";
import { formatDate, publishedDate } from "./admin-content";
export default function ContentTable({
  items,
  products,
  loading,
  page,
  pages,
  total,
  onPage,
}: {
  items: CmsItem[];
  products: boolean;
  loading: boolean;
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <>
      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>English</th>
              <th>Spanish</th>
              <th>Last published</th>
              <th>{products ? "Product name" : "Title"}</th>
              <th>{products ? "Product code" : "URL slug"}</th>
              <th>Source version</th>
              <th className="admin-action-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="admin-table-empty" role="status">
                  Loading content…
                </td>
              </tr>
            ) : items.length ? (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span
                      className={`admin-status ${item.published.en ? "is-live" : "is-draft"}`}
                    >
                      {item.published.en ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-status ${item.translations.es?.status === "outdated" || item.translations.es?.status === "review" ? "is-review" : item.published.es ? "is-live" : "is-draft"}`}
                    >
                      {item.translations.es?.status === "outdated"
                        ? "Needs update"
                        : item.translations.es?.status === "review"
                          ? "In review"
                          : item.published.es
                            ? "Published"
                            : item.translations.es?.status === "approved"
                              ? "Approved"
                              : "Missing"}
                    </span>
                  </td>
                  <td className="admin-muted-cell">
                    {formatDate(publishedDate(item))}
                  </td>
                  <td>
                    <Link
                      className="admin-title-link"
                      href={`/admin/content/${item.id}`}
                    >
                      {item.translations.en?.fields.title || item.slug}
                    </Link>
                  </td>
                  <td className="admin-slug-cell">
                    {products ? item.shared.code || "—" : item.slug}
                  </td>
                  <td className="admin-muted-cell">v{item.version}</td>
                  <td className="admin-action-cell">
                    <Link
                      className="admin-row-link"
                      href={`/admin/content/${item.id}`}
                    >
                      Edit <span aria-hidden="true">↗</span>
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="admin-table-empty">
                  No content matches these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="admin-pagination">
        <span>
          {total} records · Page {page} of {pages}
        </span>
        <div>
          <button
            disabled={loading || page <= 1}
            onClick={() => onPage(page - 1)}
          >
            Previous
          </button>
          <button
            disabled={loading || page >= pages}
            onClick={() => onPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
