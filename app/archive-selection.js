const MAX_ARCHIVE_SELECTIONS = 2;

/**
 * Keep archive comparison selection bounded and predictable.
 * Selecting an active date removes it; selecting a third date replaces
 * the oldest selection while preserving the most recent one.
 *
 * @param {string[]} selectedDates
 * @param {string} nextDate
 * @returns {string[]}
 */
export function toggleArchiveSelection(selectedDates, nextDate) {
  const uniqueDates = selectedDates.filter((date, index) => selectedDates.indexOf(date) === index);

  if (uniqueDates.includes(nextDate)) {
    return uniqueDates.filter((date) => date !== nextDate);
  }

  return [...uniqueDates, nextDate].slice(-MAX_ARCHIVE_SELECTIONS);
}
