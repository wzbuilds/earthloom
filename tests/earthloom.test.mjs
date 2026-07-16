import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("ships a traceable live snapshot", async () => {
  const snapshot = JSON.parse(await readFile(new URL("../data/latest.json", import.meta.url), "utf8"));
  assert.equal(snapshot.schemaVersion, 1);
  assert.match(snapshot.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(["live", "partial"].includes(snapshot.status));
  assert.ok(snapshot.seed > 0);
  assert.ok(snapshot.metrics.earthquakeCount >= 0);
  assert.ok(snapshot.metrics.moonPhase >= 0 && snapshot.metrics.moonPhase <= 1);
  assert.equal(snapshot.sources.length, 3);
  assert.ok(snapshot.sources.every((source) => source.url.startsWith("https://")));
});

test("keeps the public portrait and its source data together", async () => {
  const latest = JSON.parse(await readFile(new URL("../data/latest.json", import.meta.url), "utf8"));
  const publicLatest = JSON.parse(await readFile(new URL("../public/data/latest.json", import.meta.url), "utf8"));
  const card = await readFile(new URL("../public/cards/latest.svg", import.meta.url), "utf8");
  assert.deepEqual(publicLatest, latest);
  assert.match(card, new RegExp(latest.date));
  assert.match(card, new RegExp(`QUAKES ${latest.metrics.earthquakeCount}`));
  await access(new URL(`../data/archive/${latest.date}.json`, import.meta.url));
});

test("server-renders the finished Earthloom experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Earthloom/);
  assert.match(html, /地球，今天/);
  assert.match(html, /TODAY'S SIGNALS/);
  assert.match(html, /OPEN BY DESIGN/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/);
});

test("includes automation and deployment contracts", async () => {
  const [weave, pages, productCi, agentGuide, iterationPolicy, guard] = await Promise.all([
    readFile(new URL("../.github/workflows/weave.yml", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
    readFile(new URL("../AGENTS.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/AUTONOMOUS_ITERATION.md", import.meta.url), "utf8"),
    readFile(new URL("../scripts/autonomy-guard.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(weave, /Asia\/Shanghai/);
  assert.match(weave, /npm run weave/);
  assert.match(pages, /actions\/deploy-pages/);
  assert.match(pages, /GITHUB_PAGES: true/);
  assert.match(pages, /workflow_run:/);
  assert.match(pages, /Weave today's Earth/);
  assert.match(productCi, /pull_request:/);
  assert.match(productCi, /npm run lint/);
  assert.match(productCi, /npm run build:pages/);
  assert.match(agentGuide, /choose exactly one small requirement/i);
  assert.match(iterationPolicy, /AUTO-MERGE/);
  assert.match(iterationPolicy, /draft pull request/i);
  assert.match(guard, /reviewOnly/);
  assert.match(guard, /maxChangedLines/);
});
