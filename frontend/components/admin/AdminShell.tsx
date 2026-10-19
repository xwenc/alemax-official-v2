import type { ReactNode } from "react";
import { logout } from "@/app/admin/actions";
import AdminSidebar from "./AdminSidebar";
import AdminIcon from "./AdminIcon";
export default function AdminShell({
  username,
  children,
}: {
  username: string;
  children: ReactNode;
}) {
  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-account">
            <span className="admin-avatar">
              {username.slice(0, 1).toUpperCase()}
            </span>
            <span>
              {username}
              <small> · Administrator</small>
            </span>
          </div>
          <form action={logout} data-admin-logout>
            <button>
              <AdminIcon name="logout" />
              Sign out
            </button>
          </form>
        </header>
        <main className="admin-page-content">{children}</main>
      </div>
    </div>
  );
}
