import type { FormEvent } from "react";
export type ContentFilter = {
  query: string;
  english: string;
  spanish: string;
  period: string;
};
export const emptyFilters: ContentFilter = {
  query: "",
  english: "all",
  spanish: "all",
  period: "all",
};
export default function ContentFilters({
  value,
  onChange,
  onApply,
  onReset,
  disabled,
}: {
  value: ContentFilter;
  onChange: (value: ContentFilter) => void;
  onApply: () => void;
  onReset: () => void;
  disabled: boolean;
}) {
  return (
    <form
      className="admin-filters"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onApply();
      }}
    >
      <label className="admin-search-field">
        Search
        <input
          aria-label="Search content"
          placeholder="Search title, slug or product code"
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
        />
      </label>
      <label>
        English edition
        <select
          value={value.english}
          onChange={(e) => onChange({ ...value, english: e.target.value })}
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Not published</option>
        </select>
      </label>
      <label>
        Spanish edition
        <select
          value={value.spanish}
          onChange={(e) => onChange({ ...value, spanish: e.target.value })}
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="missing">Missing translation</option>
          <option value="review">Ready for review</option>
          <option value="outdated">Needs update</option>
          <option value="approved">Approved</option>
        </select>
      </label>
      <label>
        Last published
        <select
          value={value.period}
          onChange={(e) => onChange({ ...value, period: e.target.value })}
        >
          <option value="all">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>
      </label>
      <button className="admin-primary" disabled={disabled}>
        Filter
      </button>
      <button type="button" onClick={onReset} disabled={disabled}>
        Reset
      </button>
    </form>
  );
}
