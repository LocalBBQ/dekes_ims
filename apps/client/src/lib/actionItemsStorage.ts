const ACTION_ITEMS_STORAGE_KEY = "action-items-list";

export type ActionItemRecord = {
  id: string;
  itemId: string;
  itemName: string;
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  quantity: number;
};

export function getActionItemsStorageKey(): string {
  return ACTION_ITEMS_STORAGE_KEY;
}

export function loadSavedActionList(): ActionItemRecord[] {
  try {
    const raw = localStorage.getItem(ACTION_ITEMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActionItemRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveActionListToStorage(list: ActionItemRecord[]): void {
  try {
    localStorage.setItem(ACTION_ITEMS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}
