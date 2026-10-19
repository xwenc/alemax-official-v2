import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
const file = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const rootEnv = existsSync(file(".env"))
  ? parseEnv(readFileSync(file(".env"), "utf8"))
  : {};
const devFile = file(".env.development.local");
if (!existsSync(devFile)) {
  writeFileSync(
    devFile,
    [
      "# Local development only. Generated once; never committed.",
      "ADMIN_USERNAME=admin",
      `ADMIN_PASSWORD=${randomBytes(18).toString("base64url")}`,
      `ADMIN_SESSION_SECRET=${randomBytes(32).toString("hex")}`,
      `INTERNAL_API_KEY=${randomBytes(32).toString("hex")}`,
      "API_INTERNAL_URL=http://127.0.0.1:8000",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
}
const env = {
  ...rootEnv,
  ...parseEnv(readFileSync(devFile, "utf8")),
  ...process.env,
};

const port = env.WEB_PORT || "3100";
Object.assign(env, {
  VISIT_STATS_ENABLED: env.VISIT_STATS_ENABLED || "true",
  NODE_ENV: "development",
  ENVIRONMENT: "development",
  SITE_ORIGINS: `http://localhost:${port},http://127.0.0.1:${port}`,
});
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
}
function start(command, args, cwd, extra = {}) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...env, ...extra },
  });
  children.push(child);
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
{
  const python = file("backend/.venv/bin/python");
  if (!existsSync(python))
    throw new Error(
      "Set up backend/.venv and install backend/requirements.txt before running npm run dev.",
    );
  mkdirSync(file("backend/.local/uploads"), { recursive: true });
  const backendEnv = {
    DATABASE_URL:
      env.DEV_DATABASE_URL || `sqlite:///${file("backend/.local/cms.db")}`,
    UPLOADS_DIR: file("backend/.local/uploads"),
    PYTHONUNBUFFERED: "1",
  };
  start(
    python,
    [
      "-m",
      "uvicorn",
      "app.main:app",
      "--host",
      "127.0.0.1",
      "--port",
      "8000",
      "--reload",
    ],
    file("backend"),
    backendEnv,
  );
  start(python, ["-m", "app.translation"], file("backend"), backendEnv);
  console.log(
    `Admin: http://localhost:${port}/admin — credentials are in .env.development.local`,
  );
}
start("npm", ["run", "dev", "--", "--port", port], file("frontend"));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
