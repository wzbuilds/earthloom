# Autonomous iteration policy

Earthloom has two independent heartbeats:

1. GitHub Actions collects Earth data and publishes deterministic artifacts on its existing daily, weekly, and monthly schedules.
2. Codex periodically proposes and implements one product improvement in an isolated Git worktree.

Keeping them separate means a data-source outage cannot rewrite product code, and a product iteration cannot fabricate a daily portrait.

## One autonomous run

1. Synchronize with `origin/main` and read `AGENTS.md`, `ROADMAP.md`, recent commits, and open GitHub issues.
2. Check whether another open pull request with the `codex/earthloom-` branch prefix already exists. If it does, inspect it instead of starting competing work.
3. Select exactly one small requirement. Prefer an unchecked `Now` item; when none fits, add up to three candidates and select one.
4. Write acceptance criteria before editing code.
5. Implement the smallest coherent version, update tests, and append a short entry to `EVOLUTION.md`.
6. Run the full local verification listed in `AGENTS.md`.
7. Commit and push a `codex/earthloom-<date>-<slug>` branch.
8. Open a pull request describing the requirement, product reasoning, test evidence, and rollback.
9. If the autonomy guard says `AUTO-MERGE`, wait for GitHub CI. Merge only when every check succeeds.
10. If the guard says `REVIEW`, CI fails, requirements are ambiguous, or no meaningful improvement exists, leave a draft pull request or a report and stop. Never force a merge.

Merging to `main` triggers the existing GitHub Pages workflow, so deployment stays observable and reversible through ordinary GitHub history.

## Automatic merge boundary

Auto-merge is limited to focused changes in the experience, tests, docs, and roadmap. The deterministic guard also limits changed-file count and total diff size.

The following always require review:

- GitHub Actions, deployment, hosting, or permission changes
- dependency or lockfile changes
- collectors, data schemas, archived observations, generated cards, or source licensing
- build configuration, server/worker code, authentication, or secrets
- file deletion/renaming, broad refactors, or a large diff

## Failure and rollback

- No meaningful change: report the reason and create no commit.
- Local verification failure: keep the diagnostic in the scheduled run; do not push a broken branch.
- CI failure: leave the pull request open and unmerged.
- Deployment failure after merge: do not stack another feature on top; open a rollback/fix pull request first.
- Product regression: revert the squash commit. Daily data history remains independent.

## Cadence

The initial cadence is twice a week. This is frequent enough for visible evolution and slow enough for the first runs to be reviewed and tuned. Increase frequency only after several clean iterations.
