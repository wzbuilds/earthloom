# Earthloom agent guide

Earthloom is a living generative-art project, not a generic dashboard. Preserve its core idea: public Earth signals become a deterministic, inspectable portrait whose data and visual result stay connected.

## Product priorities

1. Make each visit reveal something new about today's Earth.
2. Turn the archive into memory, comparison, and story—not a pile of JSON files.
3. Keep every visual claim traceable to the snapshot and documented sources.
4. Improve accessibility, mobile behavior, performance, and sharing as first-class features.
5. Prefer one coherent improvement over several unfinished ideas.

Read `ROADMAP.md` and `docs/AUTONOMOUS_ITERATION.md` before making autonomous changes. On each autonomous run, choose exactly one small requirement. If the roadmap has no suitable item, add up to three concise candidates based on the current product, select one, and explain why it is useful.

## Engineering invariants

- The same snapshot and seed must produce the same portrait.
- Do not invent observations or historical data.
- Do not remove source attribution, reduced-motion support, or responsive behavior.
- Do not add secrets, paid services, analytics, trackers, or new network dependencies.
- Do not change deployment permissions, workflows, dependencies, data collectors, or source licensing during an auto-merge run.
- Keep generated snapshots and cards out of feature commits.
- Reuse the existing visual language before adding a new design system or library.
- Update or add tests when behavior changes.

## Required verification

Run these commands before proposing a change:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run lint
npm run build
npm run test
$env:GITHUB_PAGES='true'
$env:NEXT_PUBLIC_SITE_URL='https://wzbuilds.github.io/earthloom'
npm run build:pages
node scripts/autonomy-guard.mjs origin/main
```

The guard's `AUTO-MERGE` result is necessary but not sufficient: merge only after GitHub CI succeeds. A `REVIEW` result must become a draft pull request and must never be merged unattended.
