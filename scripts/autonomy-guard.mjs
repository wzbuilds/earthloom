import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const base = process.argv[2] || "origin/main";
const maxFiles = 10;
const maxChangedLines = 600;

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function matchesAny(path, patterns) {
  return patterns.some((pattern) =>
    pattern.endsWith("/**")
      ? path.startsWith(pattern.slice(0, -3))
      : path === pattern,
  );
}

const reviewOnly = [
  ".github/**",
  ".openai/**",
  "data/**",
  "public/data/**",
  "public/cards/**",
  "build/**",
  "worker/**",
  "scripts/**",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "vite.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "DATA_SOURCES.md",
];

const allowed = [
  "app/**",
  "tests/**",
  "docs/**",
  "public/favicon.svg",
  "public/manifest.webmanifest",
  "public/og.png",
  "public/robots.txt",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "EVOLUTION.md",
  "README.md",
  "ROADMAP.md",
];

let nameStatus;
let numstat;
let untracked;

try {
  nameStatus = git(["diff", "--name-status", base, "--"]);
  numstat = git(["diff", "--numstat", base, "--"]);
  untracked = git(["ls-files", "--others", "--exclude-standard"]);
} catch (error) {
  console.error(`REVIEW: could not compare the change with ${base}.`);
  console.error(error.message);
  process.exit(2);
}

const entries = nameStatus
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const [status, ...paths] = line.split("\t");
    return { status, paths };
  });

const comparedPaths = new Set(entries.flatMap(({ paths }) => paths));
for (const path of untracked.split(/\r?\n/).filter(Boolean)) {
  if (!comparedPaths.has(path)) entries.push({ status: "A", paths: [path], untracked: true });
}

const files = entries.flatMap(({ paths }) => paths);
const reasons = [];

if (files.length === 0) reasons.push("the diff is empty");
if (files.length > maxFiles) reasons.push(`${files.length} files exceed the ${maxFiles}-file limit`);

for (const entry of entries) {
  if (!entry.status.startsWith("A") && !entry.status.startsWith("M")) {
    reasons.push(`${entry.status} changes require review: ${entry.paths.join(" -> ")}`);
  }
}

for (const file of files) {
  if (matchesAny(file, reviewOnly)) reasons.push(`review-only path changed: ${file}`);
  else if (!matchesAny(file, allowed)) reasons.push(`path is outside the auto-merge allowlist: ${file}`);
}

let changedLines = 0;
for (const line of numstat.split(/\r?\n/).filter(Boolean)) {
  const [added, deleted, file] = line.split("\t");
  if (added === "-" || deleted === "-") reasons.push(`binary change requires review: ${file}`);
  else changedLines += Number(added) + Number(deleted);
}
for (const entry of entries.filter(({ untracked }) => untracked)) {
  const file = entry.paths[0];
  const contents = readFileSync(file);
  if (contents.includes(0)) reasons.push(`binary change requires review: ${file}`);
  else changedLines += contents.toString("utf8").split(/\r?\n/).length;
}
if (changedLines > maxChangedLines) {
  reasons.push(`${changedLines} changed lines exceed the ${maxChangedLines}-line limit`);
}

if (reasons.length) {
  console.error("REVIEW: this change must not be merged unattended.");
  for (const reason of [...new Set(reasons)]) console.error(`- ${reason}`);
  process.exit(2);
}

console.log(`AUTO-MERGE: ${files.length} allowed files and ${changedLines} changed lines.`);
