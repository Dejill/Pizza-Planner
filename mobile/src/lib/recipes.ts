import type { DoughInput } from '@/lib/dough';
import type { ToppingSelection } from '@/lib/toppings';

export interface SavedRecipe {
  id: string;
  name: string;
  createdAt: number;
  input: DoughInput;
  toppings?: ToppingSelection;
}

export interface RecipeStore {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

const RECIPES_KEY = 'pizza-planner/saved-recipes';

export function defaultRecipeStore(): RecipeStore {
  // Lazy import so unit tests can avoid the native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return AsyncStorage;
}

export async function listRecipes(store: RecipeStore): Promise<SavedRecipe[]> {
  const raw = await store.getItem(RECIPES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SavedRecipe[];
    return Array.isArray(parsed) ? parsed.filter((r) => r && typeof r.id === 'string') : [];
  } catch {
    return [];
  }
}

export function newRecipeId(): string {
  return `recipe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function saveRecipe(
  store: RecipeStore,
  recipe: Omit<SavedRecipe, 'id' | 'createdAt'>,
): Promise<SavedRecipe> {
  const recipes = await listRecipes(store);
  const saved: SavedRecipe = {
    ...recipe,
    id: newRecipeId(),
    createdAt: Date.now(),
  };
  await store.setItem(RECIPES_KEY, JSON.stringify([saved, ...recipes].slice(0, 50)));
  return saved;
}

export async function deleteRecipe(store: RecipeStore, id: string): Promise<void> {
  const recipes = await listRecipes(store);
  await store.setItem(RECIPES_KEY, JSON.stringify(recipes.filter((r) => r.id !== id)));
}

export async function duplicateRecipe(
  store: RecipeStore,
  id: string,
  newName: string,
): Promise<SavedRecipe | null> {
  const recipes = await listRecipes(store);
  const source = recipes.find((r) => r.id === id);
  if (!source) return null;
  return saveRecipe(store, {
    name: newName,
    input: source.input,
    toppings: source.toppings,
  });
}

export interface RecipesBackup {
  version: 1;
  exportedAt: number;
  recipes: SavedRecipe[];
}

export function serializeBackup(recipes: SavedRecipe[], exportedAt = Date.now()): string {
  const backup: RecipesBackup = { version: 1, exportedAt, recipes };
  return JSON.stringify(backup, null, 2);
}

export async function exportRecipesBackup(store: RecipeStore): Promise<string> {
  return serializeBackup(await listRecipes(store));
}
