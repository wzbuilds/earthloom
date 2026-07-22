import type { Metadata } from "next";
import type { CSSProperties } from "react";
import archive from "@/data/archive-index.json";
import latest from "@/data/latest.json";
import { EarthloomExperience } from "./EarthloomExperience";
import { EarthloomShare } from "./EarthloomShare";
import { EarthloomSoundscape } from "./EarthloomSoundscape";
import { deriveSnapshotComparison, findPreviousSnapshot } from "./snapshot-comparison";
import type { EarthloomSnapshot } from "./types";

const snapshot = latest as EarthloomSnapshot;
const previousSnapshot = findPreviousSnapshot(snapshot, archive) as (typeof archive)[number] | null;
const comparison = deriveSnapshotComparison(snapshot, previousSnapshot);

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

const threadCount = 24 + Math.round(snapshot.metrics.kpIndex * 3.5);
const lunarPosition = Math.round(snapshot.metrics.moonPhase * 100);

const mappings = [
  {
    index: "01",
    signal: "地震 / USGS",
    reading: `${snapshot.metrics.earthquakeCount} 次`,
    context: `最强 M${snapshot.metrics.maxMagnitude} · 平均深度 ${snapshot.metrics.averageDepth} km`,
    form: `${snapshot.metrics.earthquakeCount} 个定位脉冲`,
    detail: "经纬度决定脉冲位置，震级放大圆环，震源越深则痕迹越淡。",
    rule: "位置 → 坐标 · 半径 → 震级 · 透明度 → 深度",
    level: Math.min(100, snapshot.metrics.earthquakeCount),
    color: snapshot.palette.ember,
  },
  {
    index: "02",
    signal: "太空天气 / NOAA",
    reading: `Kp ${snapshot.metrics.kpIndex}`,
    context: `太阳风 ${snapshot.metrics.solarWind} km/s`,
    form: `${threadCount} 条极光织线`,
    detail: "Kp 改变织线密度与亮度，太阳风把当前速度换算成地球旋转节奏。",
    rule: "密度 → Kp · 转速 → 太阳风",
    level: Math.round((snapshot.metrics.kpIndex / 9) * 100),
    color: snapshot.palette.aurora,
  },
  {
    index: "03",
    signal: "全球天气 / OPEN-METEO",
    reading: `${snapshot.metrics.meanTemperature}°C`,
    context: `12 点均值 · 平均风速 ${snapshot.metrics.meanWind} km/h`,
    form: "色温与流速",
    detail: "十二个全球采样点的均温调节暖色，平均风速放大织线的摆幅与漂移。",
    rule: "暖色 → 均温 · 摆幅 → 平均风速",
    level: Math.round(Math.min(1, Math.max(0, (snapshot.metrics.meanTemperature + 10) / 45)) * 100),
    color: snapshot.palette.tide,
  },
  {
    index: "04",
    signal: "月相 / LOCAL EPHEMERIS",
    reading: `${lunarPosition}%`,
    context: lunarPosition < 10 || lunarPosition > 90 ? "月相周期 · 新月附近" : "月相周期位置",
    form: "偏移的明暗边界",
    detail: "月相周期移动球面遮罩的中心；它描述周期位置，不冒充月面照明度。",
    rule: "暗面边界 → 月相周期",
    level: lunarPosition,
    color: snapshot.palette.mist,
  },
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
            <span className="hero-title-line">地球，今天</span>
            <span className="hero-title-line hero-title-accent">织成这样。</span>
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
            <EarthloomShare date={snapshot.date} />
          </div>
          <EarthloomSoundscape snapshot={snapshot} />
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
        <section className="difference-panel" aria-labelledby="difference-title">
          <header className="difference-header">
            <div>
              <p className="eyebrow">WHY TODAY LOOKS DIFFERENT / 今日为何不同</p>
              <h3 id="difference-title">与上一幅相比，<br />变化落在这些地方。</h3>
            </div>
            {comparison ? (
              <p>
                只比较 <strong>{comparison.currentDate}</strong> 与紧邻的 <strong>{comparison.previousDate}</strong>，
                按指标在现有绘制规则中的变化幅度排序，不推断原因或趋势。
              </p>
            ) : (
              <p>还没有更早的快照可供比较；下一幅作品归档后，这里会出现可验证的差异。</p>
            )}
          </header>
          {comparison && comparison.changes.length > 0 ? (
            <ol className="difference-list">
              {comparison.changes.map((change) => (
                <li className="difference-card" key={change.key}>
                  <span>{change.label}</span>
                  <strong>{change.change}</strong>
                  <p>{change.effect}</p>
                </li>
              ))}
            </ol>
          ) : comparison ? (
            <p className="difference-empty">两份快照记录的绘制指标相同，今日变化仅来自新的日期与确定性种子。</p>
          ) : null}
          <div className="difference-links">
            <a href={`data/archive/${snapshot.date}.json`}>今日原始快照 ↗</a>
            {comparison ? <a href={`data/archive/${comparison.previousDate}.json`}>上一幅原始快照 ↗</a> : null}
          </div>
        </section>
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
          <h2 id="method-title">
            <span className="method-title-line">今天的数据，</span>
            <span className="method-title-line">怎样落到画面。</span>
          </h2>
          <p>每一行都从今日快照出发：先读输入，再看它变成什么视觉痕迹。数值更新，规则不变。</p>
        </div>
        <div className="mapping-list">
          {mappings.map((mapping) => (
            <article
              className="mapping-row"
              key={mapping.index}
              style={{
                "--mapping-level": `${mapping.level}%`,
                "--mapping-color": mapping.color,
              } as CSSProperties}
            >
              <header className="mapping-signal">
                <span>{mapping.index}</span>
                <strong>{mapping.signal}</strong>
              </header>
              <div className="mapping-reading">
                <span>TODAY&apos;S INPUT / 今日读数</span>
                <b>{mapping.reading}</b>
                <small>{mapping.context}</small>
              </div>
              <div className="mapping-output">
                <span>VISIBLE MARK / 画面结果</span>
                <h3>{mapping.form}</h3>
                <p>{mapping.detail}</p>
              </div>
              <div className="mapping-rule">
                <span>DRAWING RULE / 绘制规则</span>
                <div aria-hidden="true"><i /></div>
                <p>{mapping.rule}</p>
              </div>
            </article>
          ))}
        </div>
        <a className="method-data-link" href="data/latest.json">
          打开今日完整快照 <span aria-hidden="true">↗</span>
        </a>
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
