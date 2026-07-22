const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const threadCount = (value) => 24 + Math.round(value * 3.5);
const windFlow = (value) => clamp(value / 12, 0.65, 1.6);
const rotationRate = (value) => clamp(value / 180, 1.2, 4);
const paletteHeat = (value) => clamp((value + 10) / 45, 0, 1);

function signed(value, digits, unit) {
  const rounded = Number(value.toFixed(digits));
  const prefix = rounded > 0 ? "+" : rounded < 0 ? "−" : "±";
  return `${prefix}${Math.abs(rounded).toFixed(digits)}${unit ? ` ${unit}` : ""}`;
}

const metricDefinitions = [
  {
    key: "earthquakeCount",
    label: "地表回声",
    digits: 0,
    unit: "次",
    score: (current, previous) => Math.abs(current - previous) / 100,
    effect: (current, previous) => {
      const difference = current - previous;
      if (difference > 0) return `画面多出 ${difference} 个定位脉冲。`;
      if (difference < 0) return `画面减少 ${Math.abs(difference)} 个定位脉冲。`;
      return "定位脉冲数量与前一日相同。";
    },
  },
  {
    key: "kpIndex",
    label: "地磁脉搏",
    digits: 0,
    unit: "Kp",
    score: (current, previous) => Math.abs(current - previous) / 9,
    effect: (current, previous) => {
      const currentThreads = threadCount(current);
      const previousThreads = threadCount(previous);
      if (current > previous) return `极光织线增至 ${currentThreads} 条，前一日为 ${previousThreads} 条。`;
      if (current < previous) return `极光织线减至 ${currentThreads} 条，前一日为 ${previousThreads} 条。`;
      return `极光织线保持 ${currentThreads} 条。`;
    },
  },
  {
    key: "solarWind",
    label: "太阳来风",
    digits: 0,
    unit: "km/s",
    score: (current, previous) => Math.abs(rotationRate(current) - rotationRate(previous)) / 2.8,
    effect: (current, previous) => current >= previous
      ? "地球与经纬线的旋转节奏更快。"
      : "地球与经纬线的旋转节奏更缓。",
  },
  {
    key: "meanTemperature",
    label: "世界均温",
    digits: 1,
    unit: "°C",
    score: (current, previous) => Math.abs(paletteHeat(current) - paletteHeat(previous)),
    effect: (current, previous) => current >= previous
      ? "暖色端在今日配色中略微增强。"
      : "暖色端在今日配色中略微收敛。",
  },
  {
    key: "meanWind",
    label: "全球风速",
    digits: 1,
    unit: "km/h",
    score: (current, previous) => Math.abs(windFlow(current) - windFlow(previous)) / 0.95,
    effect: (current, previous) => current >= previous
      ? "织线摆幅与漂移更舒展。"
      : "织线摆幅与漂移更收拢。",
  },
  {
    key: "moonPhase",
    label: "月相周期",
    digits: 1,
    unit: "%",
    value: (value) => value * 100,
    score: (current, previous) => Math.abs(current - previous),
    effect: (current, previous) => current >= previous
      ? "球面明暗边界沿周期向前移动。"
      : "球面明暗边界跨过周期起点。",
  },
  {
    key: "maxMagnitude",
    label: "最强震级",
    digits: 1,
    unit: "M",
    score: (current, previous) => Math.abs(current - previous) / 10,
    effect: (current, previous) => current >= previous
      ? "最强地震对应的脉冲圆环更宽。"
      : "最强地震对应的脉冲圆环更窄。",
  },
  {
    key: "averageDepth",
    label: "平均震源深度",
    digits: 1,
    unit: "km",
    score: (current, previous) => Math.abs(current - previous) / 700,
    effect: (current, previous) => current >= previous
      ? "地震脉冲整体趋于更淡。"
      : "地震脉冲整体趋于更清晰。",
  },
];

/**
 * Find the closest archived day before the current portrait.
 * @param {{ date: string }} current
 * @param {Array<{ date: string }>} archive
 */
export function findPreviousSnapshot(current, archive) {
  return archive
    .filter((candidate) => candidate.date < current.date)
    .sort((left, right) => right.date.localeCompare(left.date))[0] ?? null;
}

/**
 * Rank recorded metric changes by the same bounded inputs used by the portrait.
 * @param {{ date: string, metrics: Record<string, number> }} current
 * @param {{ date: string, metrics: Record<string, number> } | null | undefined} previous
 */
export function deriveSnapshotComparison(current, previous) {
  if (!previous) return null;

  const changes = metricDefinitions
    .map((definition, order) => {
      const currentValue = current.metrics[definition.key];
      const previousValue = previous.metrics[definition.key];
      const displayCurrent = definition.value?.(currentValue) ?? currentValue;
      const displayPrevious = definition.value?.(previousValue) ?? previousValue;
      return {
        key: definition.key,
        label: definition.label,
        change: signed(displayCurrent - displayPrevious, definition.digits, definition.unit),
        effect: definition.effect(currentValue, previousValue),
        score: definition.score(currentValue, previousValue),
        order,
      };
    })
    .filter((change) => change.score > 0)
    .sort((left, right) => right.score - left.score || left.order - right.order)
    .slice(0, 3)
    .map(({ key, label, change, effect, score }) => ({ key, label, change, effect, score }));

  return {
    currentDate: current.date,
    previousDate: previous.date,
    changes,
  };
}
