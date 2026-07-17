# Earthloom evolution log

This file records product evolution, not daily data generation. Each autonomous product pull request adds one concise entry with the requirement, visible outcome, and verification performed.

## 2026-07-17 — Let today's portrait travel with its identity

- Requirement: a visitor can share today's portrait without losing its date or official Earthloom address.
- Outcome: added a compact share action that opens the native share sheet when available, copies the same dated payload otherwise, and exposes the canonical link when browser permissions block both paths.
- Acceptance: every path uses the current snapshot date and `https://wzbuilds.github.io/earthloom/`; cancellation and failure remain visible, accessible, and non-blocking.
- Verification: share-policy tests, server-render checks, type-check, lint, hosted build, tests, and GitHub Pages export.

## 2026-07-17 — Let today’s Earth be heard

- Requirement: a visitor can explicitly start, pause, resume, and set the volume of an original score composed from today’s Earth signals.
- Outcome: added a deterministic Web Audio soundscape with no external tracks or requests; earthquake, Kp, solar wind, weather, and lunar-cycle inputs each have a disclosed artistic role.
- Acceptance: playback never autostarts; the same snapshot yields the same score plan; keyboard and screen-reader controls remain available; the compact player follows the visitor after activation.
- Verification: deterministic score tests, server-render checks, type-check, lint, hosted build, tests, and GitHub Pages export.

## 2026-07-16 — Make today’s planet legible

- Requirement: a visitor should immediately recognize the hero as Earth and understand how today’s readings become visible marks.
- Outcome: stabilized the Chinese headline, added rotating geography and a data-driven globe grid, and rebuilt the method section around today’s actual inputs, drawing rules, and outputs.
- Acceptance: the headline remains two deliberate lines; the globe is recognizable while paused; every method row contains a current value and an accurate mapping; the complete snapshot stays one click away.
- Verification: type-check, lint, hosted build, tests, GitHub Pages export, and desktop/mobile visual review.

## 2026-07-16 — The living loop begins

- Requirement: give Earthloom a safe way to invent, implement, verify, and deploy small product improvements over time.
- Outcome: added a living roadmap, agent constraints, deterministic change classification, pull-request CI, and a documented autonomous delivery loop.
- Verification: type-check, lint, hosted build, tests, and GitHub Pages export.
