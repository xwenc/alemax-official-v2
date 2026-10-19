"use client";
import Link from "next/link";
import useContentLibrary from "./useContentLibrary";
import {
  kinds,
  kindName,
  sectionUrl,
  formatDate,
  publishedDate,
} from "./admin-content";
import AdminIcon from "./AdminIcon";
export default function OverviewPage() {
  const { items, loading, error } = useContentLibrary();
  const review = items.filter((i) =>
    ["outdated", "review"].includes(i.translations.es?.status || ""),
  );
  if (error) {
    return (
      <p className="admin-error" role="alert">
        {error}
      </p>
    );
  }
  return (
    <>
      <div className="admin-intro">
        <div>
          <h1>Overview</h1>
          <p>Manage your content and keep both language editions up to date.</p>
        </div>
        <Link className="admin-primary admin-button" href="/admin/content/new">
          <AdminIcon name="plus" />
          New content
        </Link>
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-stats">
        {[
          [items.length, "Content items"],
          [items.filter((i) => i.published.en).length, "English published"],
          [items.filter((i) => i.published.es).length, "Spanish published"],
          [review.length, "Need Spanish review"],
        ].map(([count, label]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{loading ? "—" : count}</strong>
          </div>
        ))}
      </div>
      <div className="admin-overview-grid">
        <section className="admin-data-panel">
          <div className="admin-panel-heading">
            <h2>Content collections</h2>
            <span>English source · Spanish edition</span>
          </div>
          {kinds.map((kind) => (
            <Link
              key={kind}
              className="admin-collection-row"
              href={sectionUrl(kind)}
            >
              <span>{kindName(kind)}</span>
              <span>
                {items.filter((i) => i.kind === kind).length}
                <span aria-hidden="true"> ↗</span>
              </span>
            </Link>
          ))}
        </section>
        <section className="admin-data-panel">
          <div className="admin-panel-heading">
            <h2>Spanish review</h2>
            <span>{review.length} pending</span>
          </div>
          {loading ? (
            <p className="admin-empty-note">Loading content…</p>
          ) : review.length ? (
            review.slice(0, 6).map((item) => (
              <Link
                className="admin-collection-row"
                href={`/admin/content/${item.id}`}
                key={item.id}
              >
                <span>{item.translations.en?.fields.title}</span>
                <span className="admin-status is-review">
                  {item.translations.es?.status === "outdated"
                    ? "Needs update"
                    : "In review"}
                </span>
              </Link>
            ))
          ) : (
            <div className="admin-empty-note">
              <AdminIcon name="settings" />
              <h3>No editions awaiting review</h3>
              <p>Spanish content waiting for review will appear here.</p>
            </div>
          )}
        </section>
      </div>
      <section className="admin-data-panel">
        <div className="admin-panel-heading">
          <h2>Latest publications</h2>
          <span>Published content only</span>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Collection</th>
                <th>Last published</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter((i) => publishedDate(i) > 0)
                .sort((a, b) => publishedDate(b) - publishedDate(a))
                .slice(0, 5)
                .map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        className="admin-title-link"
                        href={`/admin/content/${item.id}`}
                      >
                        {item.translations.en?.fields.title}
                      </Link>
                    </td>
                    <td>{kindName(item.kind)}</td>
                    <td>{formatDate(publishedDate(item))}</td>
                    <td>
                      <Link
                        className="admin-row-link"
                        href={`/admin/content/${item.id}`}
                      >
                        Edit ↗
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
