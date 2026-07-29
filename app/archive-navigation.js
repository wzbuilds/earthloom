const NAVIGATION_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]);

/**
 * Resolve a gallery key press without depending on layout or browser state.
 * Returning null leaves unrelated keyboard behavior untouched.
 *
 * @param {string} key
 * @param {number} currentIndex
 * @param {number} itemCount
 * @returns {number | null}
 */
export function getArchiveNavigationTarget(key, currentIndex, itemCount) {
  if (!NAVIGATION_KEYS.has(key) || itemCount <= 0 || currentIndex < 0 || currentIndex >= itemCount) {
    return null;
  }

  if (key === "Home") return 0;
  if (key === "End") return itemCount - 1;

  const direction = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
  return Math.min(itemCount - 1, Math.max(0, currentIndex + direction));
}
