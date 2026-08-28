# Earthloom evolution log

This file records product evolution, not daily data generation. Each autonomous product pull request adds one concise entry with the requirement, visible outcome, and verification performed.

## 2026-08-28 — Give first-time visitors a quiet map

- Requirement: a first-time visitor can understand where to find today’s portrait, the living archive, and the traceable generation method without being blocked by onboarding.
- Outcome: added a non-modal three-step guide that leaves the page usable, closes when the visitor follows a guide action or skips it, and remembers completion locally when available.
- Acceptance: the guide is keyboard- and small-screen-friendly; storage failure still closes it for the current visit; its only entrance motion is excluded when reduced motion is requested.
- Verification: completion-policy tests, component-source checks, type-check, lint, hosted build, tests, and GitHub Pages export.

## 2026-08-14 — Put today's signals in archive context

- Requirement: a visitor can notice when a headline reading sits near the edge of Earthloom's recorded collection without seeing an alarm claim.
- Outcome: the four signal cards now derive high and low annotations from snapshots through today, show a tied-aware rank when one qualifies, and otherwise say calmly that today's readings remain inside the collection's middle range.
- Acceptance: annotations require at least 14 observations and the highest or lowest recorded decile; the sample count stays visible; copy explicitly limits the comparison to Earthloom's archive and does not infer danger, safety, or cause.
- Verification: deterministic archive-position tests, server-render checks, type-check, lint, hosted build, tests, and GitHub Pages export.

## 2026-08-04 — Trace every portrait layer to its source

- Requirement: a visitor can inspect which recorded values and providers produced each existing layer of today’s portrait.
- Outcome: added a native disclosure that keeps four visual layers, eight exact snapshot fields, current readings, drawing effects, provider links, and recorded source status in one inspectable chain.
- Acceptance: external sources use the snapshot’s `live`, `cached`, or `fallback` state; the lunar layer is clearly local; the disclosure is keyboard-native and responsive; portrait rendering remains unchanged.
- Verification: source-inspector policy tests, server-render checks, type-check, lint, hosted build, tests, and GitHub Pages export.

## 2026-07-31 — Compare two days without leaving the archive

- Requirement: a visitor can compare any two archived portraits while keeping the surrounding collection in view.
- Outcome: gave every archive card a separate comparison toggle and added an in-gallery panel that keeps the selected dates, strongest recorded drawing changes, and both raw snapshots together.
- Acceptance: raw snapshot links remain available; selection is visible and announced; a third selection predictably replaces the oldest; comparison claims use only archived metrics and existing drawing rules.
- Verification: bounded selection-policy tests, server-render checks, type-check, lint, hosted build, tests, and GitHub Pages export.

## 2026-07-29 — Make the living archive keyboard-readable

- Requirement: a keyboard visitor can move through every archived portrait and always see which portrait has focus.
- Outcome: kept every dated portrait in the Tab order, added adjacent and first/last keyboard movement, and gave archive focus a high-contrast treatment plus concise on-page instructions.
- Acceptance: arrow keys move one portrait at a time; Home and End reach the archive boundaries; unsupported keys retain their native behavior; focus visibility does not depend on animation.
- Verification: deterministic navigation-policy tests, server-render checks, type-check, lint, hosted build, tests, and GitHub Pages export.

## 2026-07-22 — Make daily change legible

- Requirement: a visitor can understand why today’s portrait differs from the immediately previous archived portrait.
- Outcome: added a compact comparison of the three strongest normalized metric changes, their signed values, and the visual marks they affect, with direct links to both source snapshots.
- Acceptance: both dates and raw snapshots remain explicit; explanations use only recorded metrics and existing drawing rules; a missing previous day receives an honest empty state.
- Verification: comparison-policy tests, server-render checks, type-check, lint, hosted build, tests, and GitHub Pages export.

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
