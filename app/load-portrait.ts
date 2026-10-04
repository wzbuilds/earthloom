import type { EarthloomSnapshot } from "./types";

export async function loadPortrait(date: string): Promise<EarthloomSnapshot> {
  // Bundlers include the archive JSON context; newly collected dates need no manual registry.
  const recorded = await import(`../data/archive/${date}.json`);
  return recorded.default as EarthloomSnapshot;
}
