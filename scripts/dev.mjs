import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const envPath = new URL("../.env", import.meta.url);
if (existsSync(envPath)) process.loadEnvFile(fileURLToPath(envPath));

const port = process.env.WEB_PORT || "3100";
const child = spawn("npm", ["run", "dev", "--", "--port", port], {
  cwd: fileURLToPath(new URL("../frontend/", import.meta.url)),
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "development",
    ENVIRONMENT: "development",
    SITE_ORIGINS: `http://localhost:${port},http://127.0.0.1:${port}`,
    API_INTERNAL_URL: process.env.API_INTERNAL_URL || "http://127.0.0.1:8000",
  },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  console.error(`Cannot start development server from ${root}: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code) => { process.exitCode = code ?? 0; });
