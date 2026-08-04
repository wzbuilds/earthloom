import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { getArchiveNavigationTarget } from "../app/archive-navigation.js";
import { toggleArchiveSelection } from "../app/archive-selection.js";
import { deriveSnapshotComparison, findPreviousSnapshot } from "../app/snapshot-comparison.js";
import { deriveSoundscapePlan } from "../app/soundscape-plan.js";
import { buildSourceInspector } from "../app/source-inspector.js";
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

test("moves keyboard focus through every archived portrait", () => {
  assert.equal(getArchiveNavigationTarget("ArrowRight", 1, 5), 2);
  assert.equal(getArchiveNavigationTarget("ArrowDown", 1, 5), 2);
  assert.equal(getArchiveNavigationTarget("ArrowLeft", 1, 5), 0);
  assert.equal(getArchiveNavigationTarget("ArrowUp", 1, 5), 0);
  assert.equal(getArchiveNavigationTarget("ArrowLeft", 0, 5), 0);
  assert.equal(getArchiveNavigationTarget("ArrowRight", 4, 5), 4);
  assert.equal(getArchiveNavigationTarget("Home", 3, 5), 0);
  assert.equal(getArchiveNavigationTarget("End", 1, 5), 4);
  assert.equal(getArchiveNavigationTarget("Enter", 1, 5), null);
  assert.equal(getArchiveNavigationTarget("ArrowRight", -1, 5), null);
});

test("keeps archive comparison selection bounded and reversible", () => {
  assert.deepEqual(toggleArchiveSelection([], "2026-07-28"), ["2026-07-28"]);
  assert.deepEqual(
    toggleArchiveSelection(["2026-07-28"], "2026-07-26"),
    ["2026-07-28", "2026-07-26"],
  );
  assert.deepEqual(
    toggleArchiveSelection(["2026-07-28", "2026-07-26"], "2026-07-24"),
    ["2026-07-26", "2026-07-24"],
  );
  assert.deepEqual(
    toggleArchiveSelection(["2026-07-26", "2026-07-24"], "2026-07-26"),
    ["2026-07-24"],
  );
  assert.deepEqual(
    toggleArchiveSelection(["2026-07-24", "2026-07-24"], "2026-07-22"),
    ["2026-07-24", "2026-07-22"],
  );
});

test("explains the three strongest visual changes from adjacent snapshots", () => {
  const previous = {
    date: "2026-07-20",
    metrics: {
      earthquakeCount: 49,
      maxMagnitude: 5.5,
      averageDepth: 53,
      kpIndex: 1,
      solarWind: 273,
      meanTemperature: 19.1,
      meanWind: 10.1,
      moonPhase: 0.1933,
    },
  };
  const current = {
    date: "2026-07-21",
    metrics: {
      earthquakeCount: 53,
      maxMagnitude: 5.6,
      averageDepth: 39.2,
      kpIndex: 2,
      solarWind: 279,
      meanTemperature: 19.9,
      meanWind: 8,
      moonPhase: 0.2271,
    },
  };
  const comparison = deriveSnapshotComparison(current, previous);

  assert.equal(comparison.currentDate, current.date);
  assert.equal(comparison.previousDate, previous.date);
  assert.deepEqual(comparison.changes.map((change) => change.key), ["meanWind", "kpIndex", "earthquakeCount"]);
  assert.deepEqual(comparison.changes.map((change) => change.change), ["−2.1 km/h", "+1 Kp", "+4 次"]);
  assert.match(comparison.changes[0].effect, /织线摆幅与漂移/);
  assert.equal(deriveSnapshotComparison(current, null), null);
  assert.equal(findPreviousSnapshot(current, [current, { ...previous, date: "2026-07-18" }, previous]), previous);
});

test("connects every portrait layer to recorded metrics and providers", async () => {
  const snapshot = JSON.parse(await readFile(new URL("../data/latest.json", import.meta.url), "utf8"));
  const sources = snapshot.sources.map((source) =>
    source.label.includes("NOAA") ? { ...source, status: "cached" } : source,
  );
  const layers = buildSourceInspector({ ...snapshot, sources });

  assert.deepEqual(layers.map((layer) => layer.id), [
    "seismic-pulses",
    "aurora-threads",
    "weather-flow",
    "lunar-shadow",
  ]);
  assert.deepEqual(layers.flatMap((layer) => layer.fields.map((field) => field.path)), [
    "metrics.earthquakeCount",
    "metrics.maxMagnitude",
    "metrics.averageDepth",
    "metrics.kpIndex",
    "metrics.solarWind",
    "metrics.meanTemperature",
    "metrics.meanWind",
    "metrics.moonPhase",
  ]);
  assert.equal(layers[0].providerLabel, snapshot.sources[0].label);
  assert.equal(layers[0].providerUrl, snapshot.sources[0].url);
  assert.equal(layers[1].providerStatus, "cached");
  assert.equal(layers[3].providerStatus, "local");
  assert.equal(layers[3].providerUrl, null);
  assert.match(layers[0].fields[0].value, new RegExp(`${snapshot.metrics.earthquakeCount}`));
  assert.match(layers[3].fields[0].value, /%$/);
});

test("server-renders the finished Earthloom experience", async () => {
  const latest = JSON.parse(await readFile(new URL("../data/latest.json", import.meta.url), "utf8"));
  const archive = JSON.parse(await readFile(new URL("../data/archive-index.json", import.meta.url), "utf8"));
  const previous = findPreviousSnapshot(latest, archive);
  const experienceSource = await readFile(new URL("../app/EarthloomExperience.tsx", import.meta.url), "utf8");
  const archiveGallerySource = await readFile(new URL("../app/ArchiveGallery.tsx", import.meta.url), "utf8");
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
  assert.match(html, /SOURCE INSPECTOR/);
  assert.match(html, /逐层检查今日画面/);
  assert.match(html, /metrics\.earthquakeCount/);
  assert.match(html, /metrics\.moonPhase/);
  assert.match(html, /Earthloom 本地周期计算/);
  assert.match(html, /开启今日声景/);
  assert.match(html, /SHARE TODAY/);
  assert.match(html, new RegExp(`将分享 ${latest.date} 与官方链接`));
  assert.match(html, /WHY TODAY LOOKS DIFFERENT/);
  assert.match(html, /ARCHIVE COMPARE/);
  assert.match(html, /archive-compare-status/);
  assert.match(html, /键盘：Tab 进入画廊/);
  assert.match(html, /aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"/);
  assert.match(html, new RegExp(`只比较 <strong>${latest.date}<\/strong> 与紧邻的 <strong>${previous.date}<\/strong>`));
  assert.match(html, new RegExp(`data/archive/${latest.date}\\.json`));
  assert.match(html, new RegExp(`data/archive/${previous.date}\\.json`));
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
  assert.match(archiveGallerySource, /data-archive-card/);
  assert.match(archiveGallerySource, /\.focus\(\)/);
  assert.match(archiveGallerySource, /aria-pressed=\{isSelected\}/);
  assert.match(archiveGallerySource, /toggleArchiveSelection/);
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
