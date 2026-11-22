import type { DoughInput } from '@/lib/dough';
import type { RecipeStore } from '@/lib/recipes';
import {
  addCookHistoryEntry,
  deleteCookHistoryEntry,
  listCookHistory,
  newHistoryId,
  updateCookHistoryNote,
} from '@/lib/history';

const input: DoughInput = {
  pizzas: 2,
  ballWeightG: 260,
  hydrationPct: 63,
  saltPct: 2.5,
  yeastKind: 'instant',
  fermentationHours: 24,
  coldRetard: false,
};

function memoryStore(): RecipeStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    async getItem(key) {
      return data.get(key) ?? null;
    },
    async setItem(key, value) {
      data.set(key, value);
    },
    async removeItem(key) {
      data.delete(key);
    },
  };
}

describe('cook history', () => {
  it('starts empty and logs entries newest first', async () => {
    const store = memoryStore();
    expect(await listCookHistory(store)).toEqual([]);
    const first = await addCookHistoryEntry(store, input, 1000);
    const second = await addCookHistoryEntry(store, input, 2000);
    const history = await listCookHistory(store);
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe(second.id);
    expect(history[1].id).toBe(first.id);
    expect(history[0].note).toBe('');
  });

  it('updates notes without touching other entries', async () => {
    const store = memoryStore();
    const entry = await addCookHistoryEntry(store, input, 1000);
    const other = await addCookHistoryEntry(store, input, 2000);
    await updateCookHistoryNote(store, entry.id, 'Great blistering, add more salt next time.');
    const history = await listCookHistory(store);
    expect(history.find((e) => e.id === entry.id)?.note).toContain('blistering');
    expect(history.find((e) => e.id === other.id)?.note).toBe('');
  });

  it('deletes entries and recovers from corrupt storage', async () => {
    const store = memoryStore();
    const entry = await addCookHistoryEntry(store, input);
    await deleteCookHistoryEntry(store, entry.id);
    expect(await listCookHistory(store)).toEqual([]);

    store.data.set('pizza-planner/cook-history', '{not json');
    expect(await listCookHistory(store)).toEqual([]);
  });

  it('skips malformed entries and caps at 30', async () => {
    const store = memoryStore();
    for (let i = 0; i < 32; i++) {
      await addCookHistoryEntry(store, input, i + 1);
    }
    const history = await listCookHistory(store);
    expect(history).toHaveLength(30);
    expect(history[0].completedAt).toBe(32);

    store.data.set('pizza-planner/cook-history', JSON.stringify([{ nope: true }, null, 5]));
    expect(await listCookHistory(store)).toEqual([]);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 20 }, () => newHistoryId()));
    expect(ids.size).toBe(20);
  });
});
