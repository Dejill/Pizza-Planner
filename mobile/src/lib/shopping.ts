import { computeDough, glutenFreeXanthanG, type DoughInput } from '@/lib/dough';
import { dictFor } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

export interface ShoppingLine {
  label: string;
  amount: string;
}

function doughLines(input: DoughInput, gLabel: (g: number) => string, t: ReturnType<typeof dictFor>['shopping']): ShoppingLine[] {
  const recipe = computeDough(input);
  const lines: ShoppingLine[] = [
    { label: t.flour, amount: gLabel(recipe.flourG) },
    { label: t.water, amount: gLabel(recipe.waterG) },
    { label: t.salt, amount: gLabel(recipe.saltG) },
  ];
  if (input.glutenFree) {
    lines.push({ label: t.xanthan, amount: gLabel(glutenFreeXanthanG(recipe.flourG)) });
  }
  if (recipe.starterG > 0) {
    lines.push({ label: t.starter, amount: gLabel(recipe.starterG) });
  } else if (recipe.yeastG > 0) {
    lines.push({
      label:
        input.yeastKind === 'active-dry'
          ? t.activeDryYeast
          : input.yeastKind === 'fresh'
            ? t.freshYeast
            : t.instantYeast,
      amount: gLabel(recipe.yeastG),
    });
  }
  return lines;
}

export function buildShoppingList(
  input: DoughInput,
  toppingTotals: { label: string; gramsTotal: number }[],
  lang: Lang = 'en',
): ShoppingLine[] {
  const t = dictFor(lang).shopping;
  return [
    ...doughLines(input, (g) => `${g} g`, t),
    ...toppingTotals.map((topping) => ({
      label: topping.label,
      amount: `${topping.gramsTotal} g`,
    })),
  ];
}

export function shoppingListText(lines: ShoppingLine[], lang: Lang = 'en'): string {
  const header = dictFor(lang).shopping.header;
  const body = lines.map((line) => `• ${line.label}: ${line.amount}`).join('\n');
  return `${header}\n${body}`;
}
