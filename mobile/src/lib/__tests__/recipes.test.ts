import {
  deleteRecipe,
  duplicateRecipe,
  listRecipes,
  newRecipeId,
  saveRecipe,
  type RecipeStore,
} from '@/lib/recipes';
import type { DoughInput } from '@/lib/dough';

const input: DoughInput = {
  pizzas: 4,
  ballWeightG: 250,
  hydrationPct: 65,
  saltPct: 2.5,
  yeastKind: 'sourdough',
  fermentationHours: 48,
  coldRetard: true,
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

describe('recipes', () => {
  it('saves and lists recipes with newest first', async () => {
    const store = memoryStore();
    await saveRecipe(store, { name: 'Friday night', input });
    await saveRecipe(store, { name: 'Party 12x', input: { ...input, pizzas: 12 } });

    const recipes = await listRecipes(store);
    expect(recipes.map((r) => r.name)).toEqual(['Party 12x', 'Friday night']);
    expect(recipes[0].input.pizzas).toBe(12);
    expect(recipes[0].id).toMatch(/^recipe-/);
  });

  it('keeps toppings with the recipe when provided', async () => {
    const store = memoryStore();
    const saved = await saveRecipe(store, {
      name: 'Margherita',
      input,
      toppings: { mozzarella: { gramsPerPizza: 110 } },
    });
    const recipes = await listRecipes(store);
    expect(recipes[0].toppings?.mozzarella.gramsPerPizza).toBe(110);
    expect(saved.createdAt).toBeGreaterThan(0);
  });

  it('deletes only the targeted recipe', async () => {
    const store = memoryStore();
    const first = await saveRecipe(store, { name: 'A', input });
    await saveRecipe(store, { name: 'B', input });
    await deleteRecipe(store, first.id);
    const recipes = await listRecipes(store);
    expect(recipes.map((r) => r.name)).toEqual(['B']);
  });

  it('duplicates a recipe under a new name and id', async () => {
    const store = memoryStore();
    const original = await saveRecipe(store, { name: 'House dough', input });
    const copy = await duplicateRecipe(store, original.id, 'House dough copy');
    expect(copy).not.toBeNull();
    expect(copy!.name).toBe('House dough copy');
    expect(copy!.id).not.toBe(original.id);
    const recipes = await listRecipes(store);
    expect(recipes).toHaveLength(2);
  });

  it('returns null when duplicating a missing recipe', async () => {
    expect(await duplicateRecipe(memoryStore(), 'ghost', 'x')).toBeNull();
  });

  it('caps the saved list and recovers from corrupt storage', async () => {
    const store = memoryStore();
    for (let i = 0; i < 60; i++) {
      await saveRecipe(store, { name: `R${i}`, input });
    }
    expect(await listRecipes(store)).toHaveLength(50);

    store.data.set('pizza-planner/saved-recipes', '{not json');
    expect(await listRecipes(store)).toEqual([]);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 20 }, () => newRecipeId()));
    expect(ids.size).toBe(20);
  });
});
