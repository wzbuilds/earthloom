# Contributing to Earthloom

Thanks for helping the loom grow. Small, focused pull requests are easiest to review.

1. Run `npm install` with Node.js 22 or newer.
2. Run `npm run weave` once to confirm that public data is reachable.
3. Develop with `npm run dev`.
4. Before opening a pull request, run `npm run check`, `npm run lint`, `npm run build`, `npm run test`, and the GitHub Pages export.

Please do not commit invented historical snapshots. New data sources must be publicly documented, stable enough for unattended use, and represented in `DATA_SOURCES.md`. Visual mappings should remain deterministic for the same snapshot and seed.

Autonomous changes also follow [`AGENTS.md`](./AGENTS.md) and [`docs/AUTONOMOUS_ITERATION.md`](./docs/AUTONOMOUS_ITERATION.md). A change that crosses the auto-merge boundary must remain a draft pull request for human review.
