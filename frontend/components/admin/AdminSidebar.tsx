"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { sections } from "./admin-content";
import AdminIcon from "./AdminIcon";
export default function AdminSidebar() {
  const pathname = usePathname(),
    [open, setOpen] = useState(false);
  return (
    <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
      <Link
        href="/admin/overview"
        className="admin-brand"
        aria-label="ALEMAX administration"
      >
        <img src="/images/logo.svg" alt="ALEMAX Global Ingredients" />
      </Link>
      <button
        className="admin-menu-toggle"
        aria-expanded={open}
        aria-controls="admin-navigation"
        onClick={() => setOpen(!open)}
      >
        Menu <span>{open ? "−" : "+"}</span>
      </button>
      <nav id="admin-navigation" aria-label="Administration">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            aria-current={pathname === section.href ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <AdminIcon name={section.icon} />
            <span>{section.title}</span>
          </Link>
        ))}
      </nav>
      <div className="admin-sidebar-bottom">
        <span className="admin-online-dot" />
        Content management
        <br />
        <small>English / Español</small>
      </div>
    </aside>
  );
}
