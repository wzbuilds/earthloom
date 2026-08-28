# Earthloom living roadmap

This roadmap is a seed, not a fixed specification. Codex may refine it as the product evolves, but every automated run should deliver no more than one small, testable requirement.

## Product thesis

Earthloom should feel alive in three ways:

- **The planet changes:** fresh public signals shape a new portrait every day.
- **The experience remembers:** visitors can compare days and notice patterns across time.
- **The project evolves:** small, visible product improvements arrive regularly and remain explainable in Git history.

## Now — suitable for autonomous iteration

- [x] Make the hero unmistakably planetary and explain today’s live input → drawing rule → visible mark. Completed 2026-07-16.
- [x] Let visitors opt into an original soundscape deterministically composed from today’s traceable signals. Completed 2026-07-17.
- [x] Add a compact “why today looks different” explanation derived only from the current and previous snapshots. Completed 2026-07-22.
  - Acceptance: name both snapshot dates; show the three largest normalized metric changes with signed values and their existing visual effects; link to both raw snapshots; if no previous snapshot exists, say comparison is not yet available. Auto-merge eligible.
- [x] Let visitors compare two archived portraits without losing the gallery context. Completed 2026-07-31.
  - Acceptance: every archived portrait keeps its raw snapshot link and has an independent compare toggle; selecting a second portrait reveals both dates, the three strongest recorded metric changes, and both raw snapshot links inside the gallery; removing a selection or choosing a third portrait updates the pair predictably; selection state is conveyed visually and to assistive technology. Auto-merge eligible.
- [x] Add keyboard navigation and visible focus states to every interactive gallery control. Completed 2026-07-29.
  - Acceptance: Tab reaches every archived portrait; arrow keys move to the adjacent portrait; Home and End move to the first and last portrait; keyboard focus remains clearly visible without relying on motion. Auto-merge eligible.
- [x] Create a share action that includes the portrait date and canonical GitHub Pages URL. Completed 2026-07-17.
  - Acceptance: the action shares the current snapshot date and `https://wzbuilds.github.io/earthloom/`; browsers without Web Share copy the same payload; cancellation and failure receive accessible, non-blocking feedback. Auto-merge eligible.
- [x] Add a source-inspector panel connecting each visual layer to its exact metric and provider. Completed 2026-08-04.
  - Acceptance: the panel names the four existing portrait layers, their exact `metrics.*` fields and current values, the drawing effect already in use, and the snapshot provider with its current `live` / `cached` / `fallback` status; external providers remain directly linked, the lunar layer is identified as a local calculation, and the native disclosure works by keyboard and on small screens. Auto-merge eligible.
- [x] Make unusual signal values discoverable with calm, non-alarmist annotations. Completed 2026-08-14.
  - Acceptance: compare the four headline readings only with recorded snapshots through today; after at least 14 observations, label a reading only when it falls in the highest or lowest recorded decile, and state its rank plus the sample count; when none qualify, say so calmly; explain that this is collection-relative context, not a hazard or safety level, without inferring causes. Auto-merge eligible.
- [x] Add a lightweight first-visit guide that disappears after interaction and respects reduced motion. Completed 2026-08-28.
  - Acceptance: show a non-modal three-step orientation only until the visitor uses or dismisses it; keep every underlying control available; persist completion locally when possible and fail closed for the current visit when storage is unavailable; keep the guide keyboard- and small-screen-friendly; animate only when reduced motion is not requested. Auto-merge eligible.
- [ ] Improve small-screen archive exploration without hiding dates or provenance.

## Next — requires a draft PR and human review

- [ ] Introduce a seasonal visual chapter while preserving deterministic rendering.
- [ ] Add a new public signal only after reliability, licensing, fallbacks, and attribution are documented.
- [ ] Produce a monthly “Earth changed like this” narrative generated from archived measurements.
- [ ] Add installable PWA behavior and an offline view of the most recent successful portrait.

## Never optimize for

- Empty commits or cosmetic churn whose only purpose is contribution activity.
- Invented data, fake scientific certainty, or emergency-style alerts.
- Engagement tracking, dark patterns, or dependencies without clear product value.
- Large rewrites when a focused change can advance the product.

## Requirement template

When Codex adds an idea, phrase it as:

> As a visitor, I can **do or understand one thing**, so that **the Earthloom experience becomes more alive or legible**.

Include a measurable acceptance check and classify it as either `auto-merge eligible` or `review required`.
