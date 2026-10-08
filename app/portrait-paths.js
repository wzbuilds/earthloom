export function portraitPath(date) {
  return `portraits/${date}/`;
}

export function archiveNeighbors(items, date) {
  const ordered = [...items].sort((a, b) => a.date.localeCompare(b.date));
  const index = ordered.findIndex((item) => item.date === date);
  return index < 0 ? { previous: null, next: null } : {
    previous: ordered[index - 1]?.date ?? null,
    next: ordered[index + 1]?.date ?? null,
  };
}
