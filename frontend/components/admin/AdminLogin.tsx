import { login } from "@/app/admin/actions";
export default function AdminLogin({
  configured,
  error,
}: {
  configured: boolean;
  error?: string;
}) {
  return (
    <main className="admin-shell admin-login-shell">
      <section className="admin-login">
        <a href="/en" className="admin-login-brand">
          <img src="/images/logo.svg" alt="ALEMAX Global Ingredients" />
        </a>
        <h1>Welcome back</h1>
        <p>Sign in to manage your English and Spanish content.</p>
        {!configured ? (
          <p role="alert" className="admin-error">
            Set ADMIN_PASSWORD (12+ characters), ADMIN_SESSION_SECRET (32+
            characters) and INTERNAL_API_KEY on the server to enable
            administrator access.
          </p>
        ) : (
          <form action={login}>
            {error && (
              <p role="alert" className="admin-error">
                {error === "rate"
                  ? "Too many attempts. Wait one minute and retry."
                  : "Unable to sign in. Check your credentials."}
              </p>
            )}
            <label>
              Username
              <input name="username" autoComplete="username" required />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </label>
            <button className="admin-primary">Sign in</button>
          </form>
        )}
        <p className="admin-login-note">ALEMAX · Content administration</p>
      </section>
    </main>
  );
}
