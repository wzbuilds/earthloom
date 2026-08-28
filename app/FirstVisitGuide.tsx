"use client";

import { useState, useSyncExternalStore } from "react";
import {
  persistFirstVisitCompletion,
  readFirstVisitCompletion,
} from "./first-visit-guide";

const guideEvent = "earthloom:first-visit-guide-complete";
let completedForThisVisit = false;

const steps = [
  {
    eyebrow: "01 / TODAY",
    title: "先看今天的地球",
    copy: "四种公开信号共同生成今日画像；同一份快照与种子会得到同一幅作品。",
    href: "#portrait",
    action: "进入今日作品",
  },
  {
    eyebrow: "02 / ARCHIVE",
    title: "再把今天放进时间里",
    copy: "档案保留日期与原始快照，也能任选两天，在画廊中直接比较。",
    href: "#archive",
    action: "浏览生长档案",
  },
  {
    eyebrow: "03 / METHOD",
    title: "最后核对每一道痕迹",
    copy: "生成方法把画面图层连回精确字段、今日读数与公开来源。",
    href: "#method",
    action: "检查生成方法",
  },
] as const;

function subscribeToCompletion(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(guideEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(guideEvent, onStoreChange);
  };
}

function readCompletion() {
  return completedForThisVisit || readFirstVisitCompletion(() => window.localStorage);
}

export function FirstVisitGuide() {
  const isComplete = useSyncExternalStore(subscribeToCompletion, readCompletion, () => true);
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];

  function completeGuide() {
    completedForThisVisit = true;
    persistFirstVisitCompletion(() => window.localStorage);
    window.dispatchEvent(new Event(guideEvent));
  }

  if (isComplete) return null;

  return (
    <aside className="first-visit-guide" aria-labelledby="first-visit-title">
      <header>
        <p>{step.eyebrow} · FIRST VISIT</p>
        <button type="button" onClick={completeGuide} aria-label="关闭首次访问引导">
          跳过
        </button>
      </header>
      <div className="first-visit-copy" aria-live="polite">
        <span>{stepIndex + 1} / {steps.length}</span>
        <h2 id="first-visit-title">{step.title}</h2>
        <p>{step.copy}</p>
      </div>
      <footer>
        <div className="first-visit-steps" aria-label={`引导第 ${stepIndex + 1} 步，共 ${steps.length} 步`}>
          {steps.map((item, index) => (
            <button
              type="button"
              className={index === stepIndex ? "is-current" : ""}
              key={item.eyebrow}
              onClick={() => setStepIndex(index)}
              aria-label={`查看第 ${index + 1} 步：${item.title}`}
              aria-current={index === stepIndex ? "step" : undefined}
            />
          ))}
        </div>
        <a href={step.href} onClick={completeGuide}>
          {step.action} <span aria-hidden="true">↘</span>
        </a>
      </footer>
    </aside>
  );
}
