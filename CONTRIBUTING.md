# Contributing to Earthloom

Thanks for helping the loom grow. Small, focused pull requests are easiest to review.

1. Run `npm install` with Node.js 22 or newer.
2. Run `npm run weave` once to confirm that public data is reachable.
3. Develop with `npm run dev`.
4. Before opening a pull request, run `npm run check`, `npm run build`, and `npm run test`.

Please do not commit invented historical snapshots. New data sources must be publicly documented, stable enough for unattended use, and represented in `DATA_SOURCES.md`. Visual mappings should remain deterministic for the same snapshot and seed.

