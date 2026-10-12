# ALEMAX company website

Next.js 16 / React 19 / Tailwind CSS 4 frontend, FastAPI / SQLAlchemy backend, MySQL 8.4, Docker Compose deployment. Visual direction follows `design.md`.

## Included

- EN / ES content, responsive homepage, two-slide hero, shrinking navigation and mobile menu.
- Six production categories, ingredient search, product filtering, detail dialogs and inquiry prefill.
- Validated inquiry form, explicit privacy consent, loading/error/success feedback and durable MySQL storage.
- Cloudflare Turnstile verification, honeypot and per-email throttling. The API is private to the Compose network; the Next.js server proxies submissions using a shared internal key.
- Local copies of public Alemax images and Logo. Asset attribution: `frontend/public/images/SOURCES.md`.

## Docker deployment

```sh
cp .env.example .env
# Replace database passwords and INTERNAL_API_KEY with unique secrets.
# Add both Turnstile keys registered for the public domain.
docker compose up -d --build
```

Open http://localhost:3000 (or your configured `WEB_PORT`; this checkout currently uses 3100). Only the frontend port is exposed. MySQL records live in the named `mysql_data` volume. Do not use `docker compose down -v` unless intentionally deleting the database.

Production defaults to `ENVIRONMENT=production`: inquiries are rejected until CAPTCHA_SECRET_KEY is configured. For a local preview only, set `ENVIRONMENT=development`; this allows submission without CAPTCHA keys and shows a configuration notice. Never use this mode for public deployment.

Use alphanumeric database passwords or URL-encode reserved characters in the connection URL. Public deployments need HTTPS at a reverse proxy. Back up the MySQL volume and confirm the privacy notice and retention policy before launch. The single-worker in-memory email throttle is intentionally simple; multi-instance deployments should use a shared rate limiter.

## Local development

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

Backend tests use an isolated temporary SQLite database; Docker integration verification uses MySQL. Inquiry data has no public listing endpoint. Inquiries currently persist to the database; automatic email delivery and an administration interface are not included.

## Content

Edit `frontend/lib/content.ts` for bilingual text, products and categories. Replace images under `frontend/public/images`. The homepage updates section contains company/resource links rather than fabricated dated news. Product and production dialogs request technical documentation via the inquiry form. Existing Alemax links provide the complete catalog and legal information. The brand panel presents ingredient categories until separate brand names are provided.

## 旧官网内容迁移

2026-10-11 从 https://www.alemaxglobal.com 的英文、西班牙文公开页面提取内容，保存在 `frontend/lib/legacy-content.json`。每种语言包含 6 个生产基地、12 个分类、64 个产品，以及联系、动态、法律声明、隐私政策和 Cookie 政策。生产基地正文及法律文案来自原站，不补写未提供的产品规格或价格。动态页原站无文章内容，因此显示空状态。

访问 `/en`、`/es`，子页面使用原站路径（例如 `/es/products?cat=hydrocolloids`），新增 `/es/production-bases` 及 `/es/products/[slug]`。产品详情展示原站提供的名称、代码、分类及生产基地关系，并链接询价表单。共享首页页头和页脚，页头收缩保持稳定页面占位。生产基地图库沿用旧站公开图片 URL。更新旧站资料后重新同步该 JSON；正式上线前复核法律文案、联系方式及图片使用权。
