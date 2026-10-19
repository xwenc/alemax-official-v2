import GlobalSeoEditor from "./GlobalSeoEditor";
export default function AdministratorPage({
  username,
  translationConfigured,
}: {
  username: string;
  translationConfigured: boolean | null;
}) {
  return (
    <>
      <div className="admin-intro">
        <div>
          <h1>Administrator information</h1>
          <p>
            Your account and the services used for bilingual content publishing.
          </p>
        </div>
      </div>
      <GlobalSeoEditor />
      <div className="admin-settings-grid">
        <section className="admin-data-panel">
          <div className="admin-panel-heading">
            <h2>Account</h2>
          </div>
          <dl className="admin-info-list">
            <div>
              <dt>Username</dt>
              <dd>{username}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>Content administrator</dd>
            </div>
            <div>
              <dt>Session duration</dt>
              <dd>8 hours</dd>
            </div>
            <div>
              <dt>Interface language</dt>
              <dd>English</dd>
            </div>
            <div>
              <dt>Website languages</dt>
              <dd>English / Español</dd>
            </div>
          </dl>
        </section>
        <section className="admin-data-panel">
          <div className="admin-panel-heading">
            <h2>Translation service</h2>
            <span
              className={`admin-status ${translationConfigured ? "is-live" : "is-review"}`}
            >
              {translationConfigured === null
                ? "Unavailable"
                : translationConfigured
                  ? "Configured"
                  : "Not configured"}
            </span>
          </div>
          <div className="admin-settings-body">
            <h3>English → Spanish</h3>
            <p>
              {translationConfigured === null
                ? "The content service is temporarily unavailable. Check the connection and reload this page."
                : translationConfigured
                  ? "Automatic translation is available. Review each Spanish draft before publishing."
                  : "Automatic translation is not configured. You can still edit, review and publish Spanish manually."}
            </p>
            {translationConfigured === false && (
              <p>
                Add your DeepL API key to the server configuration to enable
                automatic translation.
              </p>
            )}
            <p className="admin-hint">
              Credentials and signing secrets are managed on the server and are
              never displayed here.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
