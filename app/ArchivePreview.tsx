import type { EarthloomSnapshot } from "./types";

/** A small geographic study, not a replacement for the full animated portrait. */
export function ArchivePreview({ snapshot }: { snapshot: EarthloomSnapshot }) {
  const { metrics, palette } = snapshot;
  const lines = 6 + Math.round(metrics.kpIndex * 2);
  return (
    <svg className="archive-preview" viewBox="0 0 400 300" aria-hidden="true">
      <circle cx="200" cy="140" r="95" fill={palette.ink} stroke={palette.aurora} strokeOpacity=".3" />
      {Array.from({ length: lines }, (_, index) => (
        <ellipse key={index} cx="200" cy="140" rx={10 + index * 85 / lines} ry="95" fill="none" stroke={palette.aurora} strokeOpacity=".16" transform={`rotate(${metrics.meanWind - 12} 200 140)`} />
      ))}
      {snapshot.earthquakes.map((quake) => {
        const lat = quake.latitude * Math.PI / 180;
        const lon = quake.longitude * Math.PI / 180;
        if (Math.cos(lat) * Math.cos(lon) < 0) return null;
        return <circle key={quake.id} cx={200 + Math.cos(lat) * Math.sin(lon) * 95} cy={140 - Math.sin(lat) * 95} r={Math.max(1, quake.magnitude * .8)} fill="none" stroke={palette.ember} opacity={Math.max(.15, 1 - quake.depth / 700)} />;
      })}
      <circle cx={200 + (metrics.moonPhase - .5) * 65} cy="140" r="94" fill={palette.void} opacity=".32" />
      <text x="20" y="280" fill={palette.mist} fontSize="9" letterSpacing="2">SIGNAL STUDY · KP {metrics.kpIndex} · {metrics.earthquakeCount} EVENTS</text>
    </svg>
  );
}
