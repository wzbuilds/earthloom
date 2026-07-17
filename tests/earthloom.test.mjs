import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { deriveSoundscapePlan } from "../app/soundscape-plan.js";
import {
  buildPortraitShareDetails,
  CANONICAL_SITE_URL,
  formatPortraitShareText,
  performPortraitShare,
} from "../app/share-details.js";

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

test("derives one bounded and repeatable score from the snapshot", async () => {
  const snapshot = JSON.parse(await readFile(new URL("../data/latest.json", import.meta.url), "utf8"));
  const firstPlan = deriveSoundscapePlan(snapshot);
  const repeatedPlan = deriveSoundscapePlan(snapshot);
  assert.deepEqual(repeatedPlan, firstPlan);
  assert.equal(firstPlan.scoreSteps, 16);
  assert.ok(firstPlan.tempo >= 42 && firstPlan.tempo <= 68);
  assert.ok(firstPlan.voiceIntervals.length >= 2 && firstPlan.voiceIntervals.length <= 4);
  assert.ok(firstPlan.pulseEvents.length <= 10);
  assert.ok(firstPlan.pulseEvents.every((pulse) => snapshot.earthquakes.some((quake) => quake.id === pulse.id)));
  assert.notDeepEqual(deriveSoundscapePlan({ ...snapshot, seed: snapshot.seed + 1 }), firstPlan);
  assert.deepEqual(deriveSoundscapePlan({
    ...snapshot,
    metrics: { ...snapshot.metrics, earthquakeCount: 0 },
    earthquakes: [],
  }).pulseEvents, []);
});

test("shares the current portrait date with the canonical Pages URL", async () => {
  const date = "2026-07-17";
  const details = buildPortraitShareDetails(date);
  assert.equal(details.url, "https://wzbuilds.github.io/earthloom/");
  assert.equal(details.url, CANONICAL_SITE_URL);
  assert.match(details.title, new RegExp(date));
  assert.match(details.text, new RegExp(date));

  let nativePayload;
  assert.equal(await performPortraitShare(details, {
    async share(payload) { nativePayload = payload; },
  }), "shared");
  assert.deepEqual(nativePayload, details);

  let copiedPayload;
  assert.equal(await performPortraitShare(details, {
    clipboard: { async writeText(payload) { copiedPayload = payload; } },
  }), "copied");
  assert.equal(copiedPayload, formatPortraitShareText(details));
  assert.match(copiedPayload, new RegExp(date));
  assert.ok(copiedPayload.includes(CANONICAL_SITE_URL));
  assert.equal(await performPortraitShare(details, {}), "fallback");
});

test("server-renders the finished Earthloom experience", async () => {
  const latest = JSON.parse(await readFile(new URL("../data/latest.json", import.meta.url), "utf8"));
  const experienceSource = await readFile(new URL("../app/EarthloomExperience.tsx", import.meta.url), "utf8");
  const soundscapeSource = await readFile(new URL("../app/EarthloomSoundscape.tsx", import.meta.url), "utf8");
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Earthloom/);
  assert.match(html, /地球，今天/);
  assert.match(html, /TODAY'S SIGNALS/);
  assert.match(html, /OPEN BY DESIGN/);
  assert.match(html, /今日读数/);
  assert.match(html, /画面结果/);
  assert.match(html, new RegExp(`${latest.metrics.earthquakeCount} 次`));
  assert.match(html, new RegExp(`Kp ${latest.metrics.kpIndex}`));
  assert.match(html, new RegExp(`${latest.metrics.solarWind} km/s`));
  assert.match(html, new RegExp(`${latest.metrics.meanTemperature}°C`));
  assert.match(html, /位置 → 坐标/);
  assert.match(html, /打开今日完整快照/);
  assert.match(html, /开启今日声景/);
  assert.match(html, /SHARE TODAY/);
  assert.match(html, new RegExp(`将分享 ${latest.date} 与官方链接`));
  assert.match(html, /这是艺术映射，不是科学声学读数/);
  assert.doesNotMatch(html, /色温与流向/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/);
  assert.match(experienceSource, /const landMasses/);
  assert.match(experienceSource, /const graticules/);
  assert.match(experienceSource, /quake\.depth/);
  assert.match(experienceSource, /role="img"/);
  assert.match(soundscapeSource, /new AudioContextClass/);
  assert.match(soundscapeSource, /context\.suspend\(\)/);
  assert.match(soundscapeSource, /aria-label="今日声景音量"/);
  assert.doesNotMatch(soundscapeSource, /Math\.random/);
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
