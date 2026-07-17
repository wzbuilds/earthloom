"use client";

import { useState } from "react";
import {
  buildPortraitShareDetails,
  performPortraitShare,
} from "./share-details";

type ShareState = "idle" | "working" | "shared" | "copied" | "cancelled" | "fallback";

interface EarthloomShareProps {
  date: string;
}

export function EarthloomShare({ date }: EarthloomShareProps) {
  const [shareState, setShareState] = useState<ShareState>("idle");
  const details = buildPortraitShareDetails(date);

  async function sharePortrait() {
    setShareState("working");
    try {
      setShareState(await performPortraitShare(details, navigator));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareState("cancelled");
        return;
      }
      setShareState("fallback");
    }
  }

  const status: Record<ShareState, string> = {
    idle: `将分享 ${date} 与官方链接`,
    working: "正在准备分享",
    shared: "系统分享面板已打开",
    copied: "日期与官方链接已复制",
    cancelled: "已取消分享",
    fallback: "无法自动复制，请打开官方链接",
  };

  return (
    <div className="share-control">
      <button
        className="text-action share-action"
        type="button"
        onClick={sharePortrait}
        disabled={shareState === "working"}
        aria-describedby="share-status"
      >
        {shareState === "working" ? "PREPARING…" : "SHARE TODAY / 分享"}
      </button>
      <p className="share-status" id="share-status" aria-live="polite">
        {status[shareState]}
        {shareState === "fallback" && (
          <> · <a href={details.url}>EARTHLOOM</a></>
        )}
      </p>
    </div>
  );
}
