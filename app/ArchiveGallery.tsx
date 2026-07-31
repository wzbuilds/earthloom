"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { getArchiveNavigationTarget } from "./archive-navigation";
import { toggleArchiveSelection } from "./archive-selection";
import { deriveSnapshotComparison } from "./snapshot-comparison";

type ArchiveItem = {
  date: string;
  metrics: {
    earthquakeCount: number;
    kpIndex: number;
    maxMagnitude: number;
    averageDepth: number;
    solarWind: number;
    meanTemperature: number;
    meanWind: number;
    moonPhase: number;
  };
  palette: {
    aurora: string;
    ember: string;
    ink: string;
  };
};

type ArchiveGalleryProps = {
  items: ArchiveItem[];
};

type ArchiveComparison = {
  currentDate: string;
  previousDate: string;
  changes: Array<{
    key: string;
    label: string;
    change: string;
    effect: string;
  }>;
};

export function ArchiveGallery({ items }: ArchiveGalleryProps) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const selectedItems = useMemo(
    () => selectedDates
      .map((date) => items.find((item) => item.date === date))
      .filter((item): item is ArchiveItem => Boolean(item)),
    [items, selectedDates],
  );
  const comparison = selectedItems.length === 2
    ? deriveSnapshotComparison(selectedItems[1], selectedItems[0]) as ArchiveComparison
    : null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.target instanceof Element)) return;

    const activeCard = event.target.closest<HTMLAnchorElement>("[data-archive-card]");
    if (!activeCard) return;

    const cards = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>("[data-archive-card]"));
    const targetIndex = getArchiveNavigationTarget(event.key, cards.indexOf(activeCard), cards.length);
    if (targetIndex === null) return;

    event.preventDefault();
    cards[targetIndex]?.focus();
  }

  function handleCompare(date: string) {
    setSelectedDates((current) => toggleArchiveSelection(current, date));
  }

  return (
    <div className="archive-gallery-shell">
      <aside
        aria-atomic="true"
        aria-live="polite"
        className={`archive-compare-panel${comparison ? " is-ready" : ""}`}
        id="archive-compare-status"
      >
        <header>
          <p className="eyebrow">ARCHIVE COMPARE / 双日对照</p>
          {comparison ? (
            <>
              <h3>{comparison.previousDate} <span aria-hidden="true">↔</span> {comparison.currentDate}</h3>
              <p>后一幅相较前一幅，变化最大的三项已记录绘制指标如下；这里只描述差异，不推断原因。</p>
            </>
          ) : selectedItems.length === 1 ? (
            <>
              <h3>已选 {selectedItems[0].date}</h3>
              <p>再选择一幅归档作品，即可留在画廊中查看两日差异。</p>
            </>
          ) : (
            <>
              <h3>选择两幅，阅读地球的变化。</h3>
              <p>使用每张作品右上角的“比较”开关；原始快照入口始终保留。</p>
            </>
          )}
        </header>
        {comparison ? (
          <>
            <ol className="archive-compare-list">
              {comparison.changes.map((change) => (
                <li key={change.key}>
                  <span>{change.label}</span>
                  <strong>{change.change}</strong>
                  <p>{change.effect}</p>
                </li>
              ))}
            </ol>
            <div className="archive-compare-links">
              <a href={`data/archive/${comparison.previousDate}.json`}>{comparison.previousDate} 原始快照 ↗</a>
              <a href={`data/archive/${comparison.currentDate}.json`}>{comparison.currentDate} 原始快照 ↗</a>
            </div>
          </>
        ) : null}
      </aside>

      <div
        aria-describedby="archive-keyboard-help archive-compare-status"
        aria-labelledby="archive-title"
        className="archive-list"
        onKeyDown={handleKeyDown}
        role="group"
      >
        {items.map((item, index) => {
          const selectionIndex = selectedDates.indexOf(item.date);
          const isSelected = selectionIndex >= 0;

          return (
            <article
              className={`archive-card${isSelected ? " is-compare-selected" : ""}`}
              key={item.date}
              style={{
                "--archive-ink": item.palette.ink,
                "--archive-aurora": item.palette.aurora,
                "--archive-ember": item.palette.ember,
              } as CSSProperties}
            >
              <a
                aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"
                aria-label={`打开 ${item.date} 的原始快照`}
                className="archive-card-link"
                data-archive-card
                href={`data/archive/${item.date}.json`}
              >
                <div className="archive-art" aria-hidden="true">
                  <span className="archive-orbit orbit-one" />
                  <span className="archive-orbit orbit-two" />
                  <span className="archive-moon" />
                </div>
                <div className="archive-meta">
                  <span>NO. {String(items.length - index).padStart(3, "0")}</span>
                  <strong>{item.date}</strong>
                  <small>M{item.metrics.maxMagnitude} · KP {item.metrics.kpIndex}</small>
                </div>
              </a>
              <button
                aria-label={`${isSelected ? "移出" : "加入"}比较：${item.date}`}
                aria-pressed={isSelected}
                className="archive-compare-toggle"
                onClick={() => handleCompare(item.date)}
                type="button"
              >
                <span>{isSelected ? "已选" : "比较"}</span>
                <strong>{isSelected ? `0${selectionIndex + 1}` : "+"}</strong>
              </button>
            </article>
          );
        })}
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
    </div>
  );
}
