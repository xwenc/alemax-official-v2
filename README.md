# ALEMAX company website

Next.js 16 / React 19 / Tailwind CSS 4 frontend, FastAPI / SQLAlchemy backend, MySQL 8.4, Docker Compose deployment. Visual direction follows `design.md`.

## Included

- EN / ES content, responsive homepage, two-slide hero, shrinking navigation and mobile menu.
- Six production categories, ingredient search, product filtering, detail dialogs and inquiry prefill.
- Validated inquiry form, explicit privacy consent, loading/error/success feedback and SMTP delivery to the company mailbox.
- Cloudflare Turnstile verification, honeypot and per-email throttling. FastAPI is private to the Compose network; reserved server-side calls use `frontend/lib/internal-api.ts` with a shared internal key. Public inquiries use a Next.js Server Action and SMTP, bypassing FastAPI and MySQL.
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

The root command loads `.env` if present, sets `NODE_ENV` and `ENVIRONMENT` to `development`, and starts Next.js with hot reload. Open http://localhost:3100 (or `WEB_PORT` from `.env`). Local origins are configured automatically. SMTP settings are reused from `.env`; sending inquiries still requires a working SMTP account. The public website does not require the backend or database to run.

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

Backend tests use an isolated temporary SQLite database; Docker integration verification uses MySQL. Inquiry data has no public listing endpoint. Public inquiries are emailed and no longer stored in MySQL. Existing inquiry records remain intact. The private FastAPI storage endpoint remains available to authorized internal callers; an administration interface is not included.

## Content

Edit `frontend/lib/content.ts` for bilingual text, products and categories. Replace images under `frontend/public/images`. The homepage updates section contains company/resource links rather than fabricated dated news. Product and production dialogs request technical documentation via the inquiry form. Existing Alemax links provide the complete catalog and legal information. The brand panel presents ingredient categories until separate brand names are provided.

## 旧官网内容迁移

2026-10-11 从 https://www.alemaxglobal.com 的英文、西班牙文公开页面提取内容，保存在 `frontend/lib/legacy-content.json`。每种语言包含 6 个生产基地、12 个分类、64 个产品，以及联系、动态、法律声明、隐私政策和 Cookie 政策。生产基地正文及法律文案来自原站，不补写未提供的产品规格或价格。动态页原站无文章内容，因此显示空状态。

访问 `/en`、`/es`，子页面使用原站路径（例如 `/es/products?cat=hydrocolloids`），新增 `/es/production-bases` 及 `/es/products/[slug]`。产品详情展示原站提供的名称、代码、分类及生产基地关系，并链接询价表单。共享首页页头和页脚，页头收缩保持稳定页面占位。生产基地图库沿用旧站公开图片 URL。更新旧站资料后重新同步该 JSON；正式上线前复核法律文案、联系方式及图片使用权。

## SMTP 询价发送

公开表单使用 Next.js Server Action，不调用 `/api/inquiries`，也不转发 FastAPI；旧公开 REST 路由已移除。Server Action 仍通过 HTTPS 向网站服务端提交表单，随后服务端执行来源检查、字段校验、蜜罐、每邮箱限流和 Turnstile 校验，再使用 SMTP 发信。

在本地 `.env` 填写 `SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASSWORD`、`SMTP_FROM`；收件邮箱 `INQUIRY_TO` 默认为 `info@alemaxglobal.com`。发件地址必须是 SMTP 服务商允许的邮箱，访客地址只用于 Reply-To，点击回复可直接联系访客。465 使用 TLS，587 强制 STARTTLS，并验证证书。SMTP 配置和密码仅位于服务端，不使用 NEXT_PUBLIC 前缀。`SITE_ORIGINS` 设置为实际网站完整来源地址；本地预览使用 `http://localhost:3100`。

配置缺失或 SMTP 未接受投递时显示失败，不显示虚假的成功。成功代表 SMTP 接受邮件，不保证已进入收件箱；上线后使用公司邮箱进行真实投递检查。本机已用模拟 SMTP 服务器验证 STARTTLS、收件人和 Reply-To，尚未配置真实 SMTP 账号。

更新配置后运行 `docker compose up -d --build web`。只有 web 发布宿主机端口，api 和 db 不发布端口；不要为它们增加公网端口映射。单实例使用进程内限流，多实例需共享限流存储。运行 `cd frontend && npm test` 验证邮件处理（Node.js 22，SMTP 测试需要 openssl）。
