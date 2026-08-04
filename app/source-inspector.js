const providerFor = (sources, labelFragment) =>
  sources.find((source) => source.label.includes(labelFragment)) ?? null;

/**
 * Keep the inspector tied to recorded snapshot fields and source status.
 * @param {{
 *   metrics: Record<string, number>,
 *   sources: Array<{ label: string, url: string, status: string }>
 * }} snapshot
 */
export function buildSourceInspector(snapshot) {
  const usgs = providerFor(snapshot.sources, "USGS");
  const noaa = providerFor(snapshot.sources, "NOAA");
  const openMeteo = providerFor(snapshot.sources, "Open-Meteo");

  return [
    {
      id: "seismic-pulses",
      name: "地震定位脉冲",
      fields: [
        { path: "metrics.earthquakeCount", value: `${snapshot.metrics.earthquakeCount} 次` },
        { path: "metrics.maxMagnitude", value: `M${snapshot.metrics.maxMagnitude}` },
        { path: "metrics.averageDepth", value: `${snapshot.metrics.averageDepth} km` },
      ],
      effect: "脉冲数量来自事件数；快照中的经纬度定位，震级扩大圆环，深度降低透明度。",
      providerLabel: usgs?.label ?? "USGS source missing from snapshot",
      providerUrl: usgs?.url ?? null,
      providerStatus: usgs?.status ?? "unlisted",
    },
    {
      id: "aurora-threads",
      name: "极光织线与旋转",
      fields: [
        { path: "metrics.kpIndex", value: `Kp ${snapshot.metrics.kpIndex}` },
        { path: "metrics.solarWind", value: `${snapshot.metrics.solarWind} km/s` },
      ],
      effect: "Kp 决定织线数量与光晕强度；太阳风速度决定地球与经纬线的旋转节奏。",
      providerLabel: noaa?.label ?? "NOAA source missing from snapshot",
      providerUrl: noaa?.url ?? null,
      providerStatus: noaa?.status ?? "unlisted",
    },
    {
      id: "weather-flow",
      name: "天气色温与流动",
      fields: [
        { path: "metrics.meanTemperature", value: `${snapshot.metrics.meanTemperature}°C` },
        { path: "metrics.meanWind", value: `${snapshot.metrics.meanWind} km/h` },
      ],
      effect: "十二个固定采样点的均温参与生成色盘，平均风速决定织线摆幅与漂移。",
      providerLabel: openMeteo?.label ?? "Open-Meteo source missing from snapshot",
      providerUrl: openMeteo?.url ?? null,
      providerStatus: openMeteo?.status ?? "unlisted",
    },
    {
      id: "lunar-shadow",
      name: "月相明暗边界",
      fields: [
        { path: "metrics.moonPhase", value: `${Math.round(snapshot.metrics.moonPhase * 100)}%` },
      ],
      effect: "月相周期位置移动球面遮罩中心；它不表示月面照明度。",
      providerLabel: "Earthloom 本地周期计算",
      providerUrl: null,
      providerStatus: "local",
    },
  ];
}
