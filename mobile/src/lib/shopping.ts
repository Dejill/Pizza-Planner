import { computeDough, type DoughInput } from '@/lib/dough';

export interface ShoppingLine {
  label: string;
  amount: string;
}

function doughLines(input: DoughInput, gLabel: (g: number) => string): ShoppingLine[] {
  const recipe = computeDough(input);
  const lines: ShoppingLine[] = [
    { label: 'Flour', amount: gLabel(recipe.flourG) },
    { label: 'Water', amount: gLabel(recipe.waterG) },
    { label: 'Salt', amount: gLabel(recipe.saltG) },
  ];
  if (recipe.starterG > 0) {
    lines.push({ label: 'Sourdough starter', amount: gLabel(recipe.starterG) });
  } else if (recipe.yeastG > 0) {
    lines.push({
      label:
        input.yeastKind === 'active-dry'
          ? 'Active dry yeast'
          : input.yeastKind === 'fresh'
            ? 'Fresh yeast'
            : 'Instant yeast',
      amount: gLabel(recipe.yeastG),
    });
  }
  return lines;
}

export function buildShoppingList(
  input: DoughInput,
  toppingTotals: { label: string; gramsTotal: number }[],
): ShoppingLine[] {
  return [
    ...doughLines(input, (g) => `${g} g`),
    ...toppingTotals.map((topping) => ({
      label: topping.label,
      amount: `${topping.gramsTotal} g`,
    })),
  ];
}

export function shoppingListText(lines: ShoppingLine[]): string {
  const header = 'Pizza Planner — shopping list';
  const body = lines.map((line) => `• ${line.label}: ${line.amount}`).join('\n');
  return `${header}\n${body}`;
}
