import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import tls from "node:tls";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import nodemailer from "nodemailer";
import {
  parseInquiry,
  smtpConfiguration,
  processInquiry,
  InquiryLimiter,
} from "../lib/inquiry-mail.ts";
const input = {
  region: "EMEA",
  company: "Test Company",
  name: "Test Visitor",
  subject: "Ingredients",
  email: "visitor@example.com",
  message: "Please send specifications.",
  locale: "en",
  privacy: true,
  captcha_token: "",
  website: "",
};
const env = {
  ENVIRONMENT: "development",
  SITE_ORIGINS: "https://www.alemaxglobal.com",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_USER: "test-user",
  SMTP_PASSWORD: "test-password",
  SMTP_FROM: "website@example.com",
  INQUIRY_TO: "info@alemaxglobal.com",
};
const context = {
  origin: "https://www.alemaxglobal.com",
  host: "www.alemaxglobal.com",
  fetchSite: "same-origin",
};
const deps = () => ({
  env,
  limiter: new InquiryLimiter(),
  createTransport: () => ({
    sendMail: async () => ({
      accepted: ["info@alemaxglobal.com"],
      rejected: [],
    }),
  }),
});
test("invalid fields, header injection, spam trap and missing consent are rejected", () => {
  for (const patch of [
    { privacy: false },
    { email: "bad" },
    { subject: "A\r\nBcc: attacker@example.com" },
    { company: " " },
    { message: "x".repeat(5001) },
    { website: "bot" },
    { locale: "xx" },
    { region: "bad" },
  ])
    assert.equal(parseInquiry({ ...input, ...patch }), null);
  assert.equal(
    parseInquiry({ ...input, name: " Test Visitor " }).name,
    "Test Visitor",
  );
});
test("cross-origin submissions do not invoke the SMTP sender", async () => {
  let called = false;
  const d = {
    ...deps(),
    createTransport: () => {
      called = true;
      throw Error();
    },
  };
  assert.deepEqual(
    await processInquiry(
      input,
      { ...context, origin: "https://attacker.example" },
      d,
    ),
    { ok: false, error: "forbidden" },
  );
  assert.deepEqual(
    await processInquiry(input, { ...context, fetchSite: "cross-site" }, d),
    { ok: false, error: "forbidden" },
  );
  assert.equal(called, false);
});
test("SMTP is required; TLS is enforced on STARTTLS and direct TLS ports", async () => {
  assert.equal(smtpConfiguration(env).options.requireTLS, true);
  assert.equal(
    smtpConfiguration({ ...env, SMTP_PORT: "465" }).options.secure,
    true,
  );
  assert.deepEqual(
    await processInquiry(input, context, {
      ...deps(),
      env: { ...env, SMTP_PASSWORD: "" },
    }),
    { ok: false, error: "unavailable" },
  );
});
test("production cannot send without configured or valid CAPTCHA", async () => {
  assert.deepEqual(
    await processInquiry(input, context, {
      ...deps(),
      env: { ...env, ENVIRONMENT: "production" },
    }),
    { ok: false, error: "verification" },
  );
  const base = {
    ...deps(),
    env: { ...env, ENVIRONMENT: "production", CAPTCHA_SECRET_KEY: "test-key" },
  };
  assert.deepEqual(
    await processInquiry({ ...input, captcha_token: "test" }, context, {
      ...base,
      fetch: async () =>
        new Response(
          JSON.stringify({
            success: true,
            action: "other",
            hostname: "www.alemaxglobal.com",
          }),
        ),
    }),
    { ok: false, error: "verification" },
  );
  assert.deepEqual(
    await processInquiry({ ...input, captcha_token: "test" }, context, {
      ...base,
      fetch: async () =>
        new Response(
          JSON.stringify({
            success: true,
            action: "inquiry",
            hostname: "attacker.example",
          }),
        ),
    }),
    { ok: false, error: "verification" },
  );
  assert.deepEqual(
    await processInquiry({ ...input, captcha_token: "test" }, context, {
      ...base,
      fetch: async () =>
        new Response(
          JSON.stringify({
            success: true,
            action: "inquiry",
            hostname: "www.alemaxglobal.com",
          }),
        ),
    }),
    { ok: true },
  );
});
test("throttle is case-insensitive and expires after ten minutes", () => {
  const limiter = new InquiryLimiter();
  for (let i = 0; i < 5; i++)
    assert.equal(limiter.accept(input.email, 1000), true);
  assert.equal(limiter.accept(input.email.toUpperCase(), 2000), false);
  assert.equal(limiter.accept(input.email, 601001), true);
});
test("mail errors and recipient rejection never return success", async () => {
  for (const sendMail of [
    async () => {
      throw new Error("SMTP password rejected");
    },
    async () => ({ accepted: [], rejected: ["info@alemaxglobal.com"] }),
  ])
    assert.deepEqual(
      await processInquiry(input, context, {
        ...deps(),
        createTransport: () => ({ sendMail }),
      }),
      { ok: false, error: "unavailable" },
    );
});
test("SMTP delivery uses STARTTLS, fixed recipient and visitor Reply-To", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "alemax-smtp-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const certPath = join(dir, "cert.pem"),
    keyPath = join(dir, "key.pem");
  assert.equal(
    spawnSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        keyPath,
        "-out",
        certPath,
        "-days",
        "1",
        "-subj",
        "/CN=localhost",
        "-addext",
        "subjectAltName=DNS:localhost",
      ],
      { stdio: "ignore" },
    ).status,
    0,
  );
  const cert = readFileSync(certPath),
    secureContext = tls.createSecureContext({
      cert,
      key: readFileSync(keyPath),
    });
  const messages = [],
    commands = [],
    sockets = new Set();
  let upgraded = false;
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("error", () => {});
    socket.write("220 localhost SMTP test\r\n");
    function listen(stream, secured) {
      let buffer = "",
        data = false;
      function receive(chunk) {
        buffer += chunk.toString();
        while (buffer.includes("\r\n")) {
          if (data) {
            const end = buffer.indexOf("\r\n.\r\n");
            if (end < 0) return;
            messages.push(buffer.slice(0, end));
            buffer = buffer.slice(end + 5);
            data = false;
            stream.write("250 queued\r\n");
            continue;
          }
          const end = buffer.indexOf("\r\n"),
            line = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          commands.push(line);
          if (line.startsWith("EHLO"))
            stream.write(
              secured
                ? "250-localhost\r\n250 AUTH PLAIN\r\n"
                : "250-localhost\r\n250 STARTTLS\r\n",
            );
          else if (line === "STARTTLS") {
            stream.write("220 Ready for TLS\r\n");
            stream.removeListener("data", receive);
            const encrypted = new tls.TLSSocket(stream, {
              isServer: true,
              secureContext,
            });
            sockets.add(encrypted);
            encrypted.on("error", () => {});
            upgraded = true;
            listen(encrypted, true);
            return;
          } else if (line.startsWith("AUTH"))
            stream.write("235 authenticated\r\n");
          else if (line.startsWith("MAIL FROM") || line.startsWith("RCPT TO"))
            stream.write("250 OK\r\n");
          else if (line === "DATA") {
            data = true;
            stream.write("354 Continue\r\n");
          } else if (line === "QUIT") {
            stream.end("221 Bye\r\n");
          } else stream.write("250 OK\r\n");
        }
      }
      stream.on("data", receive);
    }
    listen(socket, false);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    for (const s of sockets) s.destroy();
    await new Promise((resolve) => server.close(resolve));
  });
  const d = {
    ...deps(),
    env: {
      ...env,
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(server.address().port),
    },
    createTransport: (options) =>
      nodemailer.createTransport({
        ...options,
        tls: { ...options.tls, ca: cert, servername: "localhost" },
      }),
  };
  assert.deepEqual(await processInquiry(input, context, d), { ok: true });
  assert.equal(upgraded, true);
  assert.equal(messages.length, 1);
  assert.ok(commands.some((c) => c === "RCPT TO:<info@alemaxglobal.com>"));
  assert.match(messages[0], /Reply-To: Test Visitor <visitor@example.com>/);
  assert.match(messages[0], /Please send specifications\./);
});
