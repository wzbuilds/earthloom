export const CANONICAL_SITE_URL = "https://wzbuilds.github.io/earthloom/";

export function buildPortraitShareDetails(date) {
  return {
    title: `Earthloom · 今日地球 · ${date}`,
    text: `看看 Earthloom 用公开地球信号织出的 ${date} 每日肖像。`,
    url: CANONICAL_SITE_URL,
  };
}

export function formatPortraitShareText(details) {
  return `${details.title}\n${details.text}\n${details.url}`;
}

export async function performPortraitShare(details, platform) {
  if (typeof platform.share === "function") {
    await platform.share(details);
    return "shared";
  }

  if (typeof platform.clipboard?.writeText === "function") {
    await platform.clipboard.writeText(formatPortraitShareText(details));
    return "copied";
  }

  return "fallback";
}
