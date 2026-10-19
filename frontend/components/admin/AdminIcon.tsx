export default function AdminIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    overview: (
      <>
        <path d="M4 3v17h17M8 15v-5m5 5V6m5 9v-3" />
      </>
    ),
    product: (
      <>
        <path d="m12 3 9 5v9l-9 5-9-5V8l9-5Z" />
        <path d="m3 8 9 5 9-5m-9 5v9M7 5l9 5" />
      </>
    ),
    category: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    base: (
      <>
        <path d="M3 21V10l6 3V6l6 4V3h5v18H3Z" />
        <path d="M7 17h1m4 0h1m4 0h1" />
      </>
    ),
    page: (
      <>
        <path d="M6 3h8l4 4v14H6V3Z" />
        <path d="M14 3v5h4M9 12h6m-6 4h6" />
      </>
    ),
    updates: (
      <>
        <path d="m3 11 18-8-8 18-3-8-7-2Z" />
        <path d="m10 13 5-5" />
      </>
    ),
    settings: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    logout: (
      <>
        <path d="M9 4H4v16h5m5-12 4 4-4 4m-6-4h12" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
  };
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.page}
    </svg>
  );
}
