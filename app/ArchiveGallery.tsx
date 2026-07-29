"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { getArchiveNavigationTarget } from "./archive-navigation";

type ArchiveItem = {
  date: string;
  metrics: {
    kpIndex: number;
    maxMagnitude: number;
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

export function ArchiveGallery({ items }: ArchiveGalleryProps) {
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

  return (
    <div
      aria-describedby="archive-keyboard-help"
      aria-labelledby="archive-title"
      className="archive-list"
      onKeyDown={handleKeyDown}
      role="group"
    >
      {items.map((item, index) => (
        <a
          aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"
          aria-label={`打开 ${item.date} 的原始快照`}
          className="archive-card"
          data-archive-card
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
            <span>NO. {String(items.length - index).padStart(3, "0")}</span>
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
  );
}
