const MINIMUM_SAMPLE_COUNT = 14;

const metricKeys = [
  "earthquakeCount",
  "kpIndex",
  "solarWind",
  "meanTemperature",
];

function recordedThroughToday(current, archive) {
  const byDate = new Map();

  archive.forEach((snapshot) => {
    if (snapshot.date <= current.date) byDate.set(snapshot.date, snapshot);
  });
  byDate.set(current.date, current);

  return [...byDate.values()];
}

function positionFor(values, currentValue) {
  if (values.length < MINIMUM_SAMPLE_COUNT) return null;

  const sorted = [...values].sort((left, right) => left - right);
  if (sorted[0] === sorted[sorted.length - 1]) return null;

  const lowerThreshold = sorted[Math.floor((sorted.length - 1) * 0.1)];
  const upperThreshold = sorted[Math.ceil((sorted.length - 1) * 0.9)];

  if (currentValue <= lowerThreshold) {
    const rank = 1 + sorted.filter((value) => value < currentValue).length;
    const tied = sorted.filter((value) => value === currentValue).length > 1;
    return {
      position: "low",
      label: "接近收藏低位",
      detail: `${sorted.length} 天中${tied ? "并列" : ""}第 ${rank} 低`,
    };
  }

  if (currentValue >= upperThreshold) {
    const rank = 1 + sorted.filter((value) => value > currentValue).length;
    const tied = sorted.filter((value) => value === currentValue).length > 1;
    return {
      position: "high",
      label: "接近收藏高位",
      detail: `${sorted.length} 天中${tied ? "并列" : ""}第 ${rank} 高`,
    };
  }

  return null;
}

/**
 * Describe only where today's headline readings sit inside recorded Earthloom
 * snapshots. This is archive context, not a scientific alert threshold.
 * @param {{ date: string, metrics: Record<string, number> }} current
 * @param {Array<{ date: string, metrics: Record<string, number> }>} archive
 */
export function deriveSignalContext(current, archive) {
  const snapshots = recordedThroughToday(current, archive);
  /** @type {Record<string, { position: "high" | "low", label: string, detail: string }>} */
  const annotations = {};

  metricKeys.forEach((key) => {
    const values = snapshots
      .map((snapshot) => snapshot.metrics[key])
      .filter(Number.isFinite);
    const currentValue = current.metrics[key];

    if (!Number.isFinite(currentValue)) return;
    const position = positionFor(values, currentValue);
    if (position) annotations[key] = position;
  });

  const sampleCount = snapshots.length;
  const unusualCount = Object.keys(annotations).length;
  const summary = sampleCount < MINIMUM_SAMPLE_COUNT
    ? `档案累计 ${sampleCount} 天；满 ${MINIMUM_SAMPLE_COUNT} 天后才标记收藏高低位。`
    : unusualCount > 0
      ? `今日有 ${unusualCount} 项读数落在 ${sampleCount} 天收藏记录的高低一成。`
      : `今日四项读数均未落在 ${sampleCount} 天收藏记录的最高或最低一成。`;

  return { annotations, sampleCount, summary };
}
