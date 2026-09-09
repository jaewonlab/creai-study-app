import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextRequest, NextResponse } = require("next/server");

function load(env: Record<string, string>) {
  const source = ts.transpileModule(readFileSync("middleware.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} as { middleware: (req: unknown) => Promise<Response> } };
  runInNewContext(source, {
    module, exports: module.exports, URL, process: { env },
    require(name: string) {
      if (name === "next/server") return { NextResponse };
      if (name === "next-auth/jwt") return { getToken: async () => null };
      throw new Error(name);
    },
  });
  return (url: string) => module.exports.middleware(new NextRequest(url));
}

const production = { VERCEL_ENV: "production", NEXTAUTH_URL: "https://creai-study-app.vercel.app" };

test("production alias redirects before the public login and consent routes", async () => {
  const request = load(production);
  for (const path of ["/login?consent=1", "/api/consent", "/api/auth/signin/google", "/admin"]) {
    const response = await request(`https://creai-study-app-git-main-jaewonwater-s-projects.vercel.app${path}`);
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), `${production.NEXTAUTH_URL}${path}`);
  }
});

test("canonical login does not loop", async () => {
  const response = await load(production)(`${production.NEXTAUTH_URL}/login`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});

test("local development and preview are not redirected to production", async () => {
  for (const VERCEL_ENV of ["development", "preview"]) {
    const response = await load({ ...production, VERCEL_ENV })("http://localhost:3000/login");
    assert.equal(response.status, 200);
  }
});

test("AUTH_URL takes precedence just as it does in Auth.js", async () => {
  const response = await load({ ...production, AUTH_URL: "https://canonical.example/api/auth" })("https://alias.example/login");
  assert.equal(response.headers.get("location"), "https://canonical.example/login");
});
