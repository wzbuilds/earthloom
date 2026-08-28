export const FIRST_VISIT_GUIDE_KEY = "earthloom:first-visit-guide:v1";
export const FIRST_VISIT_GUIDE_VALUE = "complete";

export function readFirstVisitCompletion(getStorage) {
  try {
    return getStorage()?.getItem(FIRST_VISIT_GUIDE_KEY) === FIRST_VISIT_GUIDE_VALUE;
  } catch {
    return false;
  }
}

export function persistFirstVisitCompletion(getStorage) {
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(FIRST_VISIT_GUIDE_KEY, FIRST_VISIT_GUIDE_VALUE);
    return true;
  } catch {
    return false;
  }
}
