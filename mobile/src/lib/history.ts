import type { DoughInput } from '@/lib/dough';
import type { RecipeStore } from '@/lib/recipes';

export interface CookHistoryEntry {
  id: string;
  completedAt: number;
  input: DoughInput;
  note: string;
}

const HISTORY_KEY = 'pizza-planner/cook-history';
const HISTORY_CAP = 30;

export function newHistoryId(): string {
  return `bake-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function isValidEntry(entry: unknown): entry is CookHistoryEntry {
  if (!entry || typeof entry !== 'object') return false;
  const candidate = entry as Partial<CookHistoryEntry>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.completedAt === 'number' &&
    candidate.input != null &&
    typeof candidate.note === 'string'
  );
}

export async function listCookHistory(store: RecipeStore): Promise<CookHistoryEntry[]> {
  const raw = await store.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidEntry)
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, HISTORY_CAP);
  } catch {
    return [];
  }
}

export async function addCookHistoryEntry(
  store: RecipeStore,
  input: DoughInput,
  completedAt = Date.now(),
): Promise<CookHistoryEntry> {
  const history = await listCookHistory(store);
  const entry: CookHistoryEntry = {
    id: newHistoryId(),
    completedAt,
    input,
    note: '',
  };
  await store.setItem(HISTORY_KEY, JSON.stringify([entry, ...history].slice(0, HISTORY_CAP)));
  return entry;
}

export async function updateCookHistoryNote(
  store: RecipeStore,
  id: string,
  note: string,
): Promise<void> {
  const history = await listCookHistory(store);
  await store.setItem(
    HISTORY_KEY,
    JSON.stringify(history.map((entry) => (entry.id === id ? { ...entry, note } : entry))),
  );
}

export async function deleteCookHistoryEntry(store: RecipeStore, id: string): Promise<void> {
  const history = await listCookHistory(store);
  await store.setItem(HISTORY_KEY, JSON.stringify(history.filter((entry) => entry.id !== id)));
}
