import type { Metadata } from "next";
import type { CSSProperties } from "react";
import archive from "@/data/archive-index.json";
import latest from "@/data/latest.json";
import { EarthloomExperience } from "./EarthloomExperience";
import type { EarthloomSnapshot } from "./types";

const snapshot = latest as EarthloomSnapshot;

export const metadata: Metadata = {
  title: `今日地球 · ${snapshot.date}`,
  description: "地球每天用开放数据织出一幅自己的画像。",
};

const metricCards = [
  {
    label: "地表回声",
    english: "EARTHQUAKES",
    value: snapshot.metrics.earthquakeCount,
    unit: "M2.5+ / 24H",
  },
  {
    label: "地磁脉搏",
    english: "PLANETARY K",
    value: snapshot.metrics.kpIndex,
    unit: "KP INDEX",
  },
  {
    label: "太阳来风",
    english: "SOLAR WIND",
    value: snapshot.metrics.solarWind,
    unit: "KM/S",
  },
  {
    label: "世界均温",
    english: "12-POINT MEAN",
    value: snapshot.metrics.meanTemperature,
    unit: "°C",
  },
];

const mappings = [
  { index: "01", signal: "地震 / SEISMIC", form: "涟漪与结点", detail: "震级决定半径，深度决定透明度。" },
  { index: "02", signal: "地磁 / GEOMAGNETIC", form: "极光与明度", detail: "Kp 越高，光带越密、色彩越亮。" },
  { index: "03", signal: "气象 / WEATHER", form: "色温与流向", detail: "十二个全球采样点共同决定织物的呼吸。" },
  { index: "04", signal: "月相 / LUNAR", form: "留白与暗面", detail: "月相塑造画面中心的可见边界。" },
];

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00+08:00`));
}

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#today" aria-label="Earthloom 首页">
          <span className="wordmark-mark" aria-hidden="true" />
          EARTHLOOM
        </a>
        <nav className="site-nav" aria-label="主导航">
          <a href="#today">今日</a>
          <a href="#archive">档案</a>
          <a href="#method">方法</a>
        </nav>
        <div className="live-status">
          <span className="status-dot" aria-hidden="true" />
          {snapshot.status === "live" ? "LIVE DATA" : "PARTIAL DATA"}
        </div>
      </header>

      <section className="hero" id="today" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">ONE EARTH · ONE PORTRAIT · EVERY DAY</p>
          <h1 id="hero-title">
            地球，今天
            <span>织成这样。</span>
          </h1>
          <p className="hero-summary">{snapshot.summary}</p>
          <p className="hero-description">
            地震、太阳风、天气与月相进入同一台数字织机，留下今日不可复制、却可以验证的地球纹理。
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#portrait">
              进入今日作品 <span aria-hidden="true">↘</span>
            </a>
            <a className="text-action" href="data/latest.json">
              VIEW RAW DATA
            </a>
          </div>
        </div>

        <div className="hero-date" aria-label={`今日作品日期 ${dateLabel(snapshot.date)}`}>
          <span>{snapshot.date.slice(0, 4)}</span>
          <strong>{snapshot.date.slice(5).replace("-", " / ")}</strong>
          <small>ASIA / SHANGHAI</small>
        </div>

        <div className="portrait-stage" id="portrait">
          <EarthloomExperience snapshot={snapshot} />
          <div className="portrait-caption">
            <span>PORTRAIT {snapshot.seed.toString(16).toUpperCase()}</span>
            <span>{dateLabel(snapshot.date)}</span>
          </div>
        </div>

        <div className="scroll-note" aria-hidden="true">
          <span /> SCROLL TO READ THE SIGNALS
        </div>
      </section>

      <section className="signal-section" aria-labelledby="signals-title">
        <div className="section-heading">
          <p className="eyebrow">TODAY&apos;S SIGNALS / 今日信号</p>
          <h2 id="signals-title">一幅作品，<br />四种地球读数。</h2>
        </div>
        <div className="metric-grid">
          {metricCards.map((metric) => (
            <article className="metric-card" key={metric.english}>
              <div className="metric-topline">
                <span>{metric.label}</span>
                <span>{metric.english}</span>
              </div>
              <strong>{metric.value}</strong>
              <small>{metric.unit}</small>
            </article>
          ))}
        </div>
        <div className="signal-footnote">
          <p>最强震级 M{snapshot.metrics.maxMagnitude} · 平均深度 {snapshot.metrics.averageDepth} km · 平均风速 {snapshot.metrics.meanWind} km/h</p>
          <p>CAPTURED {new Date(snapshot.generatedAt).toISOString().slice(11, 16)} UTC · SEED {snapshot.seed.toString(16).toUpperCase()}</p>
        </div>
      </section>

      <section className="archive-section" id="archive" aria-labelledby="archive-title">
        <div className="archive-intro">
          <p className="eyebrow">THE LIVING ARCHIVE / 生长中的档案</p>
          <h2 id="archive-title">每天一幅，<br />把时间织成收藏。</h2>
          <p>每张作品都保存生成参数与原始快照。相同数据、相同日期，永远得到同一幅纹理。</p>
        </div>
        <div className="archive-list">
          {archive.map((item, index) => (
            <a
              className="archive-card"
              href={`data/archive/${item.date}.json`}
              key={item.date}
              style={{
                "--archive-ink": item.palette.ink,
                "--archive-aurora": item.palette.aurora,
                "--archive-ember": item.palette.ember,
              } as CSSProperties}
            >
              <div className="archive-art" aria-hidden="true">
                <span className="archive-orbit orbit-one" />
                <span className="archive-orbit orbit-two" />
                <span className="archive-moon" />
              </div>
              <div className="archive-meta">
                <span>NO. {String(archive.length - index).padStart(3, "0")}</span>
                <strong>{item.date}</strong>
                <small>M{item.metrics.maxMagnitude} · KP {item.metrics.kpIndex}</small>
              </div>
            </a>
          ))}
          <article className="archive-card next-card">
            <div>
              <span className="next-pulse" aria-hidden="true" />
              <p>NEXT WEAVE</p>
            </div>
            <div className="archive-meta">
              <span>北京时间</span>
              <strong>明日 08:08</strong>
              <small>等待下一批地球信号</small>
            </div>
          </article>
        </div>
      </section>

      <section className="method-section" id="method" aria-labelledby="method-title">
        <div className="method-header">
          <p className="eyebrow">THE LOOM / 生成方法</p>
          <h2 id="method-title">数据不是注脚，<br />数据就是画笔。</h2>
          <p>Earthloom 不让算法凭空幻想。每个颜色、结点和运动都有真实读数作为理由。</p>
        </div>
        <div className="mapping-list">
          {mappings.map((mapping) => (
            <article className="mapping-row" key={mapping.index}>
              <span>{mapping.index}</span>
              <strong>{mapping.signal}</strong>
              <h3>{mapping.form}</h3>
              <p>{mapping.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="provenance-section" aria-labelledby="provenance-title">
        <div>
          <p className="eyebrow">OPEN BY DESIGN</p>
          <h2 id="provenance-title">作品可以凝视，<br />来源也可以追溯。</h2>
        </div>
        <div className="source-list">
          {snapshot.sources.map((source) => (
            <a href={source.url} key={source.label} rel="noreferrer" target="_blank">
              <span>{source.status}</span>
              <strong>{source.label}</strong>
              <i aria-hidden="true">↗</i>
            </a>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-lockup">
          <span className="wordmark-mark" aria-hidden="true" />
          <strong>EARTHLOOM</strong>
          <p>THE EARTH WEAVES ONE PORTRAIT A DAY.</p>
        </div>
        <div className="footer-links">
          <a href="cards/latest.svg">PROFILE CARD</a>
          <a href="data/latest.json">RAW JSON</a>
          <a href="#today">BACK TO TOP ↑</a>
        </div>
        <p className="copyright">OPEN SOURCE · OPEN DATA · {snapshot.date.slice(0, 4)}</p>
      </footer>
    </main>
  );
}
