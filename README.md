# ALEMAX company website

Next.js 16 / React 19 / Tailwind CSS 4 frontend, FastAPI / SQLAlchemy backend, MySQL 8.4, Docker Compose deployment. Visual direction follows `design.md`.

## Included

- EN / ES content, responsive homepage, two-slide hero, shrinking navigation and mobile menu.
- Six production categories, ingredient search, product filtering, detail dialogs and inquiry prefill.
- Validated inquiry form, explicit privacy consent, loading/error/success feedback and SMTP delivery to the company mailbox.
- Cloudflare Turnstile verification, honeypot and per-email throttling. FastAPI is private to the Compose network; reserved server-side calls use `frontend/lib/internal-api.ts` with a shared internal key. Public inquiries use a Next.js Server Action and SMTP, bypassing FastAPI and MySQL. The private FastAPI service also manages bilingual CMS content and the translation queue.
- Local copies of public Alemax images and Logo. Asset attribution: `frontend/public/images/SOURCES.md`.

## Docker deployment

```sh
cp .env.example .env
# Replace database passwords and INTERNAL_API_KEY with unique secrets.
# Add both Turnstile keys registered for the public domain.
docker compose up -d --build
```

Open http://localhost:3000 (or your configured `WEB_PORT`; this checkout currently uses 3100). Only the frontend port is exposed. MySQL records live in the named `mysql_data` volume. Do not use `docker compose down -v` unless intentionally deleting the database.

Production defaults to `ENVIRONMENT=production`: inquiries require SMTP credentials and CAPTCHA_SECRET_KEY. For a local preview only, set `ENVIRONMENT=development`; this permits local testing without CAPTCHA keys and shows a configuration notice, but SMTP is still required. Never use this mode for public deployment.

Use alphanumeric database passwords or URL-encode reserved characters in the connection URL. Public deployments need HTTPS at a reverse proxy. Back up the MySQL volume and confirm the privacy notice and retention policy before launch. The single-worker in-memory email throttle is intentionally simple; multi-instance deployments should use a shared rate limiter.

## Local development

Use Node.js 22 or newer. From the project root:

```sh
npm --prefix frontend ci
npm run dev
```

The root command loads `.env`, then `.env.development.local` (shell environment takes precedence), sets development mode and starts Next.js, the local FastAPI server and a translation worker. The first run creates `.env.development.local` with a random local administrator password, session secret and internal API key. It uses a separate SQLite database at `backend/.local/cms.db` and uploaded images at `backend/.local/uploads`; it does not connect to the production MySQL database. Open http://localhost:3100/admin (or `WEB_PORT` from `.env`). SMTP settings are reused from `.env`; sending inquiries still requires a working SMTP account.

Install backend dependencies once before using the root command:

```sh
python3.12 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
```

CMS-managed public content is loaded server-side from the published CMS API, including homepage products, categories, production bases and search. API requests use `no-store`; failed requests surface an error instead of falling back to static or unpublished content. `legacy-content.json` is retained only as an input to the offline seed export script and is not imported by the frontend.

To run the entire stack with frontend hot reload and backend reload, configure `.env` from `.env.example`, then run:

```sh
npm run dev:docker
```

This uses `compose.dev.yaml` with separate dependency/build volumes, and preserves the existing MySQL data volume. Stop any running production stack before using the same port. Plain `docker compose up -d --build` continues to use the production configuration.

For frontend-only development without the root environment loader:

```sh
cd frontend
npm ci
npm run dev
```

For the backend, use Python 3.12 and a running MySQL instance:

```sh
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL='mysql+pymysql://alemax:password@localhost:3306/alemax?charset=utf8mb4'
export INTERNAL_API_KEY='your-local-service-key'
uvicorn app.main:app --reload
```

Configure matching frontend environment variables in `frontend/.env.local`:

```dotenv
API_INTERNAL_URL=http://127.0.0.1:8000
INTERNAL_API_KEY=your-local-service-key
CAPTCHA_SITE_KEY=
CAPTCHA_SECRET_KEY=
ENVIRONMENT=development
SITE_ORIGINS=http://localhost:3000
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
INQUIRY_TO=info@alemaxglobal.com
```

Production database tables are created at initial startup. For later schema changes, add a migration workflow before changing deployed tables.

## Checks

```sh
cd frontend
npm run typecheck
npm run build
cd ../backend
.venv/bin/python -m pytest tests -q
```

Backend tests use an isolated temporary SQLite database; Docker integration verification uses MySQL. Inquiry data has no public listing endpoint. Public inquiries are emailed and no longer stored in MySQL. Existing inquiry records remain intact. The private FastAPI storage endpoint remains available to authorized internal callers; content administration is available at `/admin`; inquiry records are not exposed by the content administrator.

## Content

Use `/admin` for published products, categories, production bases, About us, contact/legal page content and update articles. `frontend/lib/content.ts` holds interface labels and homepage marketing copy. Replace images under `frontend/public/images`. The homepage updates section displays up to three published CMS articles. Product and production dialogs request technical documentation via the inquiry form. Existing Alemax links provide the complete catalog and legal information. The brand panel presents published CMS ingredient categories.

## 旧官网内容迁移

2026-10-11 从 https://www.alemaxglobal.com 的英文、西班牙文公开页面提取内容，保存在 `frontend/lib/legacy-content.json`。每种语言包含 6 个生产基地、12 个分类、64 个产品，以及联系、动态、法律声明、隐私政策和 Cookie 政策。生产基地正文及法律文案来自原站，不补写未提供的产品规格或价格。动态页原站无文章内容，因此显示空状态。

访问 `/en`、`/es`，子页面使用原站路径（例如 `/es/products?cat=hydrocolloids`），新增 `/es/production-bases` 及 `/es/products/[slug]`。产品详情展示原站提供的名称、代码、分类及生产基地关系，并链接询价表单。共享首页页头和页脚，页头收缩保持稳定页面占位。生产基地图库沿用旧站公开图片 URL。更新旧站资料后重新同步该 JSON；正式上线前复核法律文案、联系方式及图片使用权。

## SMTP 询价发送

公开表单使用 Next.js Server Action，不调用 `/api/inquiries`，也不转发 FastAPI；旧公开 REST 路由已移除。Server Action 仍通过 HTTPS 向网站服务端提交表单，随后服务端执行来源检查、字段校验、蜜罐、每邮箱限流和 Turnstile 校验，再使用 SMTP 发信。

在本地 `.env` 填写 `SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASSWORD`、`SMTP_FROM`；收件邮箱 `INQUIRY_TO` 默认为 `info@alemaxglobal.com`。发件地址必须是 SMTP 服务商允许的邮箱，访客地址只用于 Reply-To，点击回复可直接联系访客。465 使用 TLS，587 强制 STARTTLS，并验证证书。SMTP 配置和密码仅位于服务端，不使用 NEXT_PUBLIC 前缀。`SITE_ORIGINS` 设置为实际网站完整来源地址；本地预览使用 `http://localhost:3100`。

配置缺失或 SMTP 未接受投递时显示失败，不显示虚假的成功。成功代表 SMTP 接受邮件，不保证已进入收件箱；上线后使用公司邮箱进行真实投递检查。本机已用模拟 SMTP 服务器验证 STARTTLS、收件人和 Reply-To，尚未配置真实 SMTP 账号。

更新配置后运行 `docker compose up -d --build web`。只有 web 发布宿主机端口，api 和 db 不发布端口；不要为它们增加公网端口映射。单实例使用进程内限流，多实例需共享限流存储。运行 `cd frontend && npm test` 验证邮件处理（Node.js 22，SMTP 测试需要 openssl）。


## Bilingual content administration

The admin workspace uses a shared sidebar and account header, with separate route files for `/admin/overview`, `/admin/products`, `/admin/categories`, `/admin/production-bases`, `/admin/pages`, `/admin/updates` and `/admin/settings`. Each collection provides search, status/date filters and pagination. Content creation and editing live at `/admin/content/new` and `/admin/content/[id]`; English editing, Spanish review and publishing are separate components under `frontend/components/admin`.

Visit `/admin`. The administration interface is English; the public site uses `/en/...` and `/es/...`. Local credentials are stored in the ignored `.env.development.local` file (`ADMIN_USERNAME` and `ADMIN_PASSWORD`). Deployment requires an `ADMIN_PASSWORD` of at least 12 characters and a random `ADMIN_SESSION_SECRET` of at least 32 characters in `.env`; generate the latter with `openssl rand -hex 32`. There is one administrator account, an eight-hour signed HttpOnly session, same-origin mutation checks and a single-process login attempt limit. Changing the password or session secret invalidates sessions. Production must use HTTPS for the Secure cookie. Multi-instance deployments should put a shared login rate limiter at the reverse proxy.

1. Select an existing item or choose **New content**. Products, categories, production bases, fixed pages and update articles have separate content types. Fixed page slugs are `about`, `activity`, `contact`, `privacy`, `cookie`, `terms`; article slugs produce `/en/activity/[slug]` and `/es/activity/[slug]`. URLs and content types are immutable after creation.
2. Enter the English title and summary, then write the body in the rich-text editor (headings, bold, italic, underline, strikethrough, lists, quotes, links and undo/redo). Add product relationships, an image, display order and SEO/accessibility fields. PNG/JPEG/WebP image uploads are limited to 10 MB and use content-addressed filenames; remove unwanted URLs before saving.
3. **Save English draft** persists the source and queues Spanish translation. It never replaces a published snapshot. Existing Spanish drafts become **outdated** when the English source or shared fields change.
4. Under **Spanish edition**, inspect the English source and edit the Spanish fields, or **Generate / retry translation**. Saving Spanish marks it as ready for review against the currently displayed English version. Select **Approve Spanish** once it has been checked.
5. Under **Preview & publish**, preview both saved editions and publish English and Spanish separately. Spanish must match the current English source version and be approved. Unpublishing removes only that language's live snapshot. No public endpoint exposes drafts.

Configure `DEEPL_API_KEY` on both the API and worker to enable automatic translation. Free accounts use `https://api-free.deepl.com/v2/translate`; Pro accounts use `https://api.deepl.com/v2/translate`. `DEEPL_GLOSSARY_ID` optionally selects an existing EN–ES DeepL glossary. A small built-in terminology map lives in `backend/app/translation.py`; brands, formulas, codes, numbers/units, URLs and emails are protected with ignored XML tags, and changed protected tokens cause translation failure. Editors should still review technical terminology. Only translatable text is sent to DeepL; images, passwords and shared product identifiers are not sent as separate fields.

The worker (`python -m app.translation`) processes a database-backed queue with atomic claims. Source-version and revision checks prevent late jobs from overwriting newer source or manual edits. Failed jobs remain visible and can be retried; interrupted running jobs become eligible again after a 15-minute lease. Missing credentials produce an explicit configuration error; they never produce fake translations or prevent manual Spanish editing. Existing imported Spanish is retained without calling a provider.

CMS tables are additive (`cms_content`, `cms_translation_jobs`). On the first startup against an empty CMS, `backend/app/seed-content.json` imports 88 records with both existing language editions published. The importer does nothing when CMS content already exists. `CMS_SEED_ON_START=false` disables it. To regenerate the seed for a new empty installation, run `node --experimental-strip-types scripts/export-cms-seed.mjs`; this does not update a populated database. Back up the MySQL volume and the `cms_uploads` volume together. Future schema changes require versioned migrations; restarting `create_all` does not alter existing columns.

The public frontend reads only published snapshots on the server, using request-scoped deduplication and `cache: no-store`. Publishing appears on the next page request without rebuilding or waiting for stale caches. Missing Spanish content shows a Spanish notice with an English link and `noindex`, rather than showing an English body under a Spanish URL. Language switching preserves path and query parameters. Page metadata comes from published localized SEO fields, and `proxy.ts` supplies the server-rendered HTML language.

Run `npm run dev` locally or `npm run dev:docker` for the MySQL-backed stack. Production uses `docker compose up -d --build` for `db`, `api`, `worker` and `web`; API and database remain private to the Compose network. This implementation's automated backend workflow tests run against isolated SQLite. The same 16-test suite was also verified against an isolated MySQL 8.4 container; set CMS_TEST_DATABASE_URL to an empty, disposable test database to repeat it. Tests delete CMS records in that database, so never use a production URL. Real DeepL translation requires provider credentials and quota; mocked tests cover request formatting, protected tokens, failures, retries and publication isolation.


### Rich-text body format

The Body content editor uses Tiptap and stores an optional structured `body` document inside the existing localized fields JSON. No database column migration is required. Existing `blocks` remain readable and convert to the editor automatically; new drafts also include plain blocks for compatibility. `body`, when present, is authoritative for previews and public rendering. English and Spanish use the same editor. Translation visits only text nodes, retaining marks, list structure, headings and link destinations; it does not translate URLs. Public pages render a validated node/mark allowlist as React elements, not executable HTML. The API rejects script nodes, unsafe link schemes, invalid nesting, excessive depth and oversized bodies, and drops unsupported attributes.

### SEO copy

Each content editor includes a visible **SEO copy** section for the English and Spanish editions. SEO title and description are stored in the database JSON fields `translations.<locale>.fields.seo_title` and `seo_description`; saving a draft does not alter the published snapshot. Publish the corresponding edition to update the Next.js metadata. No schema migration is needed because these fields already exist in the content model. Category SEO applies to its filtered `/products?cat=...` page. To manage homepage metadata, create a Page with slug `home`; use `products` and `production-bases` for those listing pages. The counters and search preview are editorial guidance, not guaranteed search engine display limits.

### Cookie choice banner

Public pages show an English/Spanish privacy banner with equally prominent Accept and Reject buttons, links to the policy pages, and a persistent Cookie settings button to change or withdraw a choice. The necessary first-party cookie `alemax_cookie_choice` stores only the choice, notice version and timestamp for 180 days (Path=/, SameSite=Lax, Secure on HTTPS). Invalid, obsolete and expired values prompt again. No interaction, scrolling or navigation constitutes acceptance. The banner is non-modal so policy pages and the site remain usable without accepting.

There are currently no analytics, advertising or personalisation scripts in the site. Acceptance does not install any. Turnstile, when configured for inquiry security, loads only after interacting with the inquiry form; it is separate from optional tracking consent. Admin authentication uses the necessary HttpOnly `alemax_admin` cookie with an eight-hour lifetime.

Before adding optional services, add purpose-specific settings, enforce consent checks before loading each service, implement shutdown/cookie cleanup on withdrawal, and update the banner version and CMS privacy/cookie policies with the actual vendors, purposes and retention periods. The current choice cookie is a browser preference record, not a server-side consent audit. Review the published CMS policies against the deployed services before launch; the banner alone does not certify legal compliance.

Design references: https://www.aepd.es/guias/guia-cookies.pdf and https://www.edpb.europa.eu/system/files/2023-01/edpb_20230118_report_cookie_banner_taskforce_en.pdf
