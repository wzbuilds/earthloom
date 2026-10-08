import { loadPortrait } from "../../load-portrait";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import archive from "@/data/archive-index.json";
import { EarthloomExperience } from "../../EarthloomExperience";
import { archiveNeighbors } from "../../portrait-paths";
import { buildSourceInspector } from "../../source-inspector";

export const dynamicParams = false;

export function generateStaticParams() {
  return archive.map(({ date }) => ({ date }));
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  return { title: `地球收藏 · ${date}`, description: `${date} 的地球画像，来自当天记录的地震、太空天气、天气和月相。` };
}

export default async function PortraitPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!archive.some((item) => item.date === date)) notFound();
  const snapshot = await loadPortrait(date);
  const neighbors = archiveNeighbors(archive, date);
  const layers = buildSourceInspector(snapshot);
  const base = process.env.GITHUB_PAGES === "true" ? `/${process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "earthloom"}` : "";
  return (
    <main className="collection-page">
      <header className="site-header">
        <a className="wordmark" href={`${base}/#archive`}>← EARTHLOOM</a>
        <a className="text-action" href={`${base}/data/archive/${date}.json`}>原始快照 ↗</a>
      </header>
      <section className="collection-heading" aria-labelledby="collection-title">
        <p className="eyebrow">THE EARTH REMEMBERS / 地球收藏</p>
        <h1 id="collection-title">{date}</h1>
        <p>{snapshot.summary}</p>
        <p className="collection-note">这是当日保存的记录。播放重现当天的绘制规则，数据不会随当前日期更新。</p>
      </section>
      <div className="collection-portrait"><EarthloomExperience snapshot={snapshot} /></div>
      <nav className="collection-navigation" aria-label="相邻作品">
        {neighbors.previous ? <a href={`${base}/portraits/${neighbors.previous}/`}>← {neighbors.previous}</a> : <span>收藏起点</span>}
        <a href={`${base}/#archive`}>返回完整收藏</a>
        {neighbors.next ? <a href={`${base}/portraits/${neighbors.next}/`}>{neighbors.next} →</a> : <span>最新记录</span>}
      </nav>
      <section className="collection-evidence" aria-labelledby="evidence-title">
        <p className="eyebrow">RECORDED SIGNALS / 当日证据</p>
        <h2 id="evidence-title">每一道痕迹，都有来处。</h2>
        <div className="collection-readings">
          <p><strong>{snapshot.metrics.earthquakeCount}</strong> M2.5+ 地震 / 24H</p>
          <p><strong>{snapshot.metrics.kpIndex}</strong> 地磁 Kp</p>
          <p><strong>{snapshot.metrics.solarWind}</strong> 太阳风 km/s</p>
          <p><strong>{snapshot.metrics.meanTemperature}°</strong> 12 点采样均温</p>
        </div>
        <p className="collection-note">生成于 {snapshot.generatedAt} · SEED {snapshot.seed} · {snapshot.status === "live" ? "全部来源当时为实时数据" : "部分来源使用缓存或备用值"}</p>
        {layers.map((layer) => (
          <article className="collection-layer" key={layer.id}>
            <h3>{layer.name}</h3>
            <p>{layer.effect}</p>
          </article>
        ))}
        <ul className="collection-sources">
          {snapshot.sources.map((source) => <li key={source.label}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a> <span>{source.status}</span></li>)}
        </ul>
        <p className="collection-note">月相为本地周期计算；艺术映射不代表风险等级或科学预测。</p>
        <a className="text-action" href={`${base}/data/archive/${date}.json`}>查看完整观测与绘制参数 ↗</a>
      </section>
    </main>
  );
}
