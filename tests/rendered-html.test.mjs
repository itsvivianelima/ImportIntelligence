import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(headers = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", ...headers },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the IMPORT INTELLIGENCE login", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>IMPORT INTELLIGENCE<\/title>/i);
  assert.match(html, /IMPORT MANAGEMENT PLATFORM/);
  assert.match(html, /SIGN IN/);
  assert.match(html, /empty greenfield database/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("keeps the greenfield product name and database binding", async () => {
  const [page, layout, packageJson, hosting, migration] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_brave_eternity.sql", import.meta.url), "utf8"),
  ]);

  assert.match(page, /IMPORT INTELLIGENCE/);
  assert.match(layout, /title:\s*"IMPORT INTELLIGENCE"/);
  assert.match(packageJson, /"name": "import-intelligence"/);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(migration, /CREATE TABLE `shipments`/);
  assert.match(migration, /`delivery_date` text DEFAULT '' NOT NULL/);
  assert.doesNotMatch(page + layout + packageJson, /MAERSK CONTRACT VISIBILITY|FREIGHT CONTRACTS VISIBILITY|SHIPMENT INTELLIGENCE/);
});
