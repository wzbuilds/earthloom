import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const explicitDate = [...args].find((arg) => arg.startsWith("--date="))?.slice(7);
const offline = args.has("--offline");
const digestOnly = args.has("--digest");
const weeklyOnly = args.has("--weekly");
const monthlyOnly = args.has("--monthly");

const LOCATIONS = [
  [64.15, -21.94],
  [35.68, 139.69],
  [1.35, 103.82],
  [-33.87, 151.21],
  [-1.29, 36.82],
  [51.51, -0.13],
  [40.71, -74.01],
  [-23.55, -46.63],
  [31.23, 121.47],
  [19.43, -99.13],
  [37.77, -122.42],
  [-34.6, -58.38],
];

const SOURCES = {
  earthquakes: {
    label: "USGS Earthquake Hazards Program",
    url: "https://earthquake.usgs.gov/fdsnws/event/1/",
  },
  spaceWeather: {
    label: "NOAA Space Weather Prediction Center",
    url: "https://services.swpc.noaa.gov/",
  },
  weather: {
    label: "Open-Meteo",
    url: "https://open-meteo.com/",
  },
};

function shanghaiDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function fnv1a(input) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mean(values, fallback = 0) {
  const usable = values.filter(Number.isFinite);
  return usable.length
    ? usable.reduce((total, value) => total + value, 0) / usable.length
    : fallback;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function moonPhase(date) {
  const synodicMonth = 29.53058867;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const current = new Date(`${date}T12:00:00Z`).getTime();
  const days = (current - knownNewMoon) / 86_400_000;
  return ((days % synodicMonth) + synodicMonth) % synodicMonth / synodicMonth;
}

async function fetchJson(url, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "user-agent": "earthloom/1.0 (+https://github.com/)" },
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function previousSnapshot() {
  try {
    return JSON.parse(await readFile(join(root, "data", "latest.json"), "utf8"));
  } catch {
    return null;
  }
}

async function collectEarthquakes(previous) {
  const url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
  try {
    if (offline) throw new Error("offline mode");
    const payload = await fetchJson(url);
    const events = (payload.features ?? [])
      .map((feature) => ({
        id: String(feature.id),
        latitude: Number(feature.geometry?.coordinates?.[1] ?? 0),
        longitude: Number(feature.geometry?.coordinates?.[0] ?? 0),
        depth: Number(feature.geometry?.coordinates?.[2] ?? 0),
        magnitude: Number(feature.properties?.mag ?? 0),
        place: String(feature.properties?.place ?? "Unknown region"),
        time: new Date(feature.properties?.time ?? Date.now()).toISOString(),
      }))
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, 64);
    return { events, status: "live", capturedAt: payload.metadata?.generated };
  } catch (error) {
    return {
      events: previous?.earthquakes ?? [],
      status: previous ? "cached" : "fallback",
      error: String(error),
    };
  }
}

async function collectSpaceWeather(previous) {
  try {
    if (offline) throw new Error("offline mode");
    const [kpPayload, windPayload] = await Promise.all([
      fetchJson("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"),
      fetchJson("https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json"),
    ]);
    const kpValues = kpPayload
      .slice(-1_440)
      .map((entry) => Number(entry.kp_index ?? entry.estimated_kp))
      .filter(Number.isFinite);
    const windRecord = Array.isArray(windPayload) ? windPayload.at(-1) : windPayload;
    const wind = Number(
      windRecord?.proton_speed ??
        windRecord?.solar_wind_speed ??
        windRecord?.WindSpeed ??
        windRecord?.value,
    );
    return {
      kpIndex: round(Math.max(0, ...kpValues), 2),
      solarWind: Number.isFinite(wind) ? round(wind, 0) : 400,
      status: "live",
    };
  } catch (error) {
    return {
      kpIndex: previous?.metrics?.kpIndex ?? 2.7,
      solarWind: previous?.metrics?.solarWind ?? 400,
      status: previous ? "cached" : "fallback",
      error: String(error),
    };
  }
}

async function collectWeather(previous) {
  try {
    if (offline) throw new Error("offline mode");
    const latitude = LOCATIONS.map(([lat]) => lat).join(",");
    const longitude = LOCATIONS.map(([, lng]) => lng).join(",");
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
      `&longitude=${longitude}&current=temperature_2m,wind_speed_10m&timezone=UTC`;
    const payload = await fetchJson(url);
    const samples = (Array.isArray(payload) ? payload : [payload]).map((entry, index) => ({
      latitude: LOCATIONS[index]?.[0] ?? Number(entry.latitude),
      longitude: LOCATIONS[index]?.[1] ?? Number(entry.longitude),
      temperature: Number(entry.current?.temperature_2m),
      wind: Number(entry.current?.wind_speed_10m),
    }));
    return { samples, status: "live" };
  } catch (error) {
    return {
      samples: previous?.weatherSamples ?? [],
      status: previous ? "cached" : "fallback",
      error: String(error),
    };
  }
}

function derivePalette(seed, metrics) {
  const base = (seed % 42) + 188;
  const heat = clamp((metrics.meanTemperature + 10) / 45, 0, 1);
  const storm = clamp(metrics.kpIndex / 9, 0, 1);
  return {
    void: `hsl(${(base + 34) % 360} 38% 5%)`,
    ink: `hsl(${(base + 12) % 360} 44% 9%)`,
    aurora: `hsl(${(base + storm * 52) % 360} 88% 65%)`,
    tide: `hsl(${(base + 78) % 360} 76% ${56 + storm * 12}%)`,
    ember: `hsl(${22 + heat * 24} 96% 66%)`,
    mist: `hsl(${(base + 168) % 360} 42% 87%)`,
  };
}

function describe(metrics) {
  if (metrics.kpIndex >= 6) return "磁暴把今天织成了明亮的极光。";
  if (metrics.maxMagnitude >= 6) return "深处的震动在织面上留下了宽阔回声。";
  if (metrics.meanWind >= 28) return "风把经纬线拉成长而轻的纤维。";
  if (metrics.moonPhase < 0.08 || metrics.moonPhase > 0.92)
    return "新月留下一块安静的暗面。";
  return "今天的地球，在低声而持续地呼吸。";
}

function sourceRecord(source, status) {
  return { ...source, status };
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function profileCard(snapshot) {
  const { metrics, palette } = snapshot;
  const points = snapshot.earthquakes.slice(0, 12).map((quake, index) => {
    const x = 58 + ((quake.longitude + 180) / 360) * 944;
    const y = 164 + ((90 - quake.latitude) / 180) * 242;
    const radius = 2 + quake.magnitude * 1.35;
    return `<circle cx="${round(x, 1)}" cy="${round(y, 1)}" r="${round(radius, 1)}" fill="none" stroke="${palette.ember}" stroke-opacity="${round(0.28 + index / 40, 2)}"/>`;
  });
  const threads = Array.from({ length: 8 }, (_, index) => {
    const amplitude = 18 + ((snapshot.seed >> index) % 34);
    const y = 188 + index * 26;
    return `<path d="M48 ${y} C250 ${y - amplitude}, 380 ${y + amplitude}, 530 ${y} S810 ${y - amplitude}, 1012 ${y + 4}" fill="none" stroke="url(#thread)" stroke-width="${index % 3 === 0 ? 1.8 : 0.8}" opacity="${0.18 + index * 0.045}"/>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1060" height="440" viewBox="0 0 1060 440" role="img" aria-labelledby="title desc">
  <title id="title">Earthloom — ${escapeXml(snapshot.date)}</title>
  <desc id="desc">${escapeXml(snapshot.summary)} Earthquakes ${metrics.earthquakeCount}, Kp ${metrics.kpIndex}, solar wind ${metrics.solarWind} km/s.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette.void}"/><stop offset="0.52" stop-color="${palette.ink}"/><stop offset="1" stop-color="#11101b"/></linearGradient>
    <linearGradient id="thread"><stop stop-color="${palette.aurora}"/><stop offset="0.5" stop-color="${palette.tide}"/><stop offset="1" stop-color="${palette.ember}"/></linearGradient>
    <radialGradient id="halo"><stop stop-color="${palette.aurora}" stop-opacity=".32"/><stop offset="1" stop-color="${palette.aurora}" stop-opacity="0"/></radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="24"/></filter>
  </defs>
  <rect width="1060" height="440" rx="30" fill="url(#bg)"/>
  <circle cx="820" cy="190" r="170" fill="url(#halo)" filter="url(#soft)"/>
  ${threads.join("\n  ")}
  ${points.join("\n  ")}
  <text x="48" y="62" fill="${palette.mist}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" letter-spacing="4">EARTHLOOM / DAILY PORTRAIT</text>
  <text x="48" y="116" fill="#fff" font-family="ui-sans-serif, system-ui, sans-serif" font-size="34" font-weight="620">${escapeXml(snapshot.date)}</text>
  <text x="48" y="392" fill="${palette.mist}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="15">${escapeXml(snapshot.summary)}</text>
  <text x="1012" y="62" text-anchor="end" fill="${palette.aurora}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12">LIVE DATA · ${snapshot.seed.toString(16).toUpperCase().padStart(8, "0")}</text>
  <g fill="${palette.mist}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12">
    <text x="620" y="392">QUAKES ${metrics.earthquakeCount}</text><text x="744" y="392">KP ${metrics.kpIndex}</text><text x="824" y="392">WIND ${metrics.solarWind} KM/S</text>
  </g>
  <rect x="1" y="1" width="1058" height="438" rx="29" fill="none" stroke="#fff" stroke-opacity=".11"/>
</svg>`;
}

async function writeSnapshot(snapshot) {
  const json = `${JSON.stringify(snapshot, null, 2)}\n`;
  const destinations = [
    join(root, "data", "latest.json"),
    join(root, "data", "archive", `${snapshot.date}.json`),
    join(root, "public", "data", "latest.json"),
    join(root, "public", "data", "archive", `${snapshot.date}.json`),
  ];
  for (const file of destinations) {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, json);
  }
  await mkdir(join(root, "public", "cards"), { recursive: true });
  await writeFile(join(root, "public", "cards", "latest.svg"), profileCard(snapshot));
}

async function loadArchive() {
  const directory = join(root, "data", "archive");
  try {
    const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
    return await Promise.all(
      files.map(async (file) => JSON.parse(await readFile(join(directory, file), "utf8"))),
    );
  } catch {
    return [];
  }
}

async function writeArchiveIndex() {
  const archive = (await loadArchive())
    .slice(-60)
    .reverse()
    .map(({ date, seed, summary, status, metrics, palette }) => ({
      date,
      seed,
      summary,
      status,
      metrics,
      palette,
    }));
  const payload = `${JSON.stringify(archive, null, 2)}\n`;
  for (const file of [
    join(root, "data", "archive-index.json"),
    join(root, "public", "data", "archive-index.json"),
  ]) {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, payload);
  }
}

function weeklyCard(snapshots) {
  const recent = snapshots.slice(-7);
  const tileWidth = 140;
  const tiles = recent.map((snapshot, index) => {
    const x = 42 + index * (tileWidth + 8);
    const phase = snapshot.metrics.moonPhase;
    return `<g transform="translate(${x} 96)"><rect width="${tileWidth}" height="210" rx="18" fill="${snapshot.palette.ink}" stroke="#fff" stroke-opacity=".12"/><circle cx="70" cy="80" r="40" fill="${snapshot.palette.aurora}" opacity="${round(0.18 + snapshot.metrics.kpIndex / 14, 2)}"/><circle cx="${70 + (phase - 0.5) * 42}" cy="80" r="32" fill="${snapshot.palette.void}"/><path d="M16 148 C42 ${132 - snapshot.metrics.meanWind}, 84 ${172 + snapshot.metrics.maxMagnitude * 2}, 124 140" fill="none" stroke="${snapshot.palette.ember}" opacity=".72"/><text x="16" y="188" fill="#fff" font-family="ui-monospace, monospace" font-size="11">${snapshot.date.slice(5)}</text></g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="360" viewBox="0 0 1100 360"><rect width="1100" height="360" rx="28" fill="#07080f"/><text x="42" y="48" fill="#fff" font-family="ui-sans-serif, system-ui" font-size="24" font-weight="600">Earthloom / Seven days of Earth</text><text x="1058" y="48" text-anchor="end" fill="#8f93a8" font-family="ui-monospace, monospace" font-size="11">${recent.at(-1)?.date ?? "AWAITING DATA"}</text>${tiles.join("")}<rect x="1" y="1" width="1098" height="358" rx="27" fill="none" stroke="#fff" stroke-opacity=".1"/></svg>`;
}

function previousMonth(value) {
  const date = new Date(`${value}-15T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

async function writeDigest(mode = "all") {
  const archive = await loadArchive();
  if (!archive.length) return;
  if (mode !== "monthly") {
    await mkdir(join(root, "public", "cards"), { recursive: true });
    await writeFile(join(root, "public", "cards", "weekly.svg"), weeklyCard(archive));
  }
  if (mode === "weekly") return;

  const month = mode === "monthly"
    ? previousMonth(shanghaiDate().slice(0, 7))
    : archive.at(-1).date.slice(0, 7);
  const monthSnapshots = archive.filter((snapshot) => snapshot.date.startsWith(month));
  if (!monthSnapshots.length) return;
  const totalQuakes = monthSnapshots.reduce(
    (total, snapshot) => total + snapshot.metrics.earthquakeCount,
    0,
  );
  const peakKp = Math.max(...monthSnapshots.map((snapshot) => snapshot.metrics.kpIndex));
  const peakMagnitude = Math.max(...monthSnapshots.map((snapshot) => snapshot.metrics.maxMagnitude));
  const report = `# Earthloom monthly weave · ${month}\n\n` +
    `> ${monthSnapshots.length} daily portraits woven from open Earth data.\n\n` +
    `| Signal | Reading |\n| --- | ---: |\n` +
    `| Portraits | ${monthSnapshots.length} |\n` +
    `| Recorded earthquakes | ${totalQuakes} |\n` +
    `| Strongest magnitude | ${round(peakMagnitude, 1)} |\n` +
    `| Peak planetary K-index | ${round(peakKp, 2)} |\n\n` +
    `Generated from the versioned snapshots in [data/archive](../../data/archive).\n`;
  const reportFile = join(root, "reports", `${month}.md`);
  await mkdir(dirname(reportFile), { recursive: true });
  await writeFile(reportFile, report);
}

async function main() {
  if (digestOnly || weeklyOnly || monthlyOnly) {
    const mode = weeklyOnly ? "weekly" : monthlyOnly ? "monthly" : "all";
    await writeDigest(mode);
    return;
  }

  const date = explicitDate ?? shanghaiDate();
  const previous = await previousSnapshot();
  const [earthquakes, spaceWeather, weather] = await Promise.all([
    collectEarthquakes(previous),
    collectSpaceWeather(previous),
    collectWeather(previous),
  ]);
  const metrics = {
    earthquakeCount: earthquakes.events.length,
    maxMagnitude: round(Math.max(0, ...earthquakes.events.map((event) => event.magnitude)), 1),
    averageDepth: round(mean(earthquakes.events.map((event) => event.depth)), 1),
    kpIndex: spaceWeather.kpIndex,
    solarWind: spaceWeather.solarWind,
    meanTemperature: round(
      mean(weather.samples.map((sample) => sample.temperature), previous?.metrics?.meanTemperature ?? 15),
      1,
    ),
    meanWind: round(
      mean(weather.samples.map((sample) => sample.wind), previous?.metrics?.meanWind ?? 12),
      1,
    ),
    moonPhase: round(moonPhase(date), 4),
  };
  const seed = fnv1a(`${date}:${JSON.stringify(metrics)}`);
  const palette = derivePalette(seed, metrics);
  const statuses = [earthquakes.status, spaceWeather.status, weather.status];
  const snapshot = {
    schemaVersion: 1,
    date,
    generatedAt: new Date().toISOString(),
    timeZone: "Asia/Shanghai",
    status: statuses.every((status) => status === "live") ? "live" : "partial",
    seed,
    summary: describe(metrics),
    metrics,
    palette,
    earthquakes: earthquakes.events,
    weatherSamples: weather.samples,
    sources: [
      sourceRecord(SOURCES.earthquakes, earthquakes.status),
      sourceRecord(SOURCES.spaceWeather, spaceWeather.status),
      sourceRecord(SOURCES.weather, weather.status),
    ],
  };
  await writeSnapshot(snapshot);
  await writeArchiveIndex();
  console.log(
    `Wove ${snapshot.date}: ${snapshot.metrics.earthquakeCount} earthquakes, Kp ${snapshot.metrics.kpIndex}, seed ${snapshot.seed.toString(16)}`,
  );
}

await main();
