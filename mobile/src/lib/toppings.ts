export interface ToppingOption {
  id: string;
  label: string;
  defaultGramsPerPizza: number;
  category: 'sauce' | 'cheese' | 'topping';
}

export const TOPPING_OPTIONS: ToppingOption[] = [
  { id: 'tomato-sauce', label: 'Tomato sauce', defaultGramsPerPizza: 60, category: 'sauce' },
  { id: 'san-marzano', label: 'San Marzano (crushed)', defaultGramsPerPizza: 70, category: 'sauce' },
  { id: 'pesto', label: 'Pesto', defaultGramsPerPizza: 40, category: 'sauce' },
  { id: 'mozzarella', label: 'Mozzarella', defaultGramsPerPizza: 110, category: 'cheese' },
  { id: 'fior-di-latte', label: 'Fior di latte', defaultGramsPerPizza: 120, category: 'cheese' },
  { id: 'parmesan', label: 'Parmesan', defaultGramsPerPizza: 15, category: 'cheese' },
  { id: 'ricotta', label: 'Ricotta', defaultGramsPerPizza: 60, category: 'cheese' },
  { id: 'basil', label: 'Fresh basil', defaultGramsPerPizza: 3, category: 'topping' },
  { id: 'olive-oil', label: 'Olive oil drizzle', defaultGramsPerPizza: 8, category: 'topping' },
  { id: 'pepperoni', label: 'Pepperoni', defaultGramsPerPizza: 40, category: 'topping' },
  { id: 'mushrooms', label: 'Mushrooms', defaultGramsPerPizza: 45, category: 'topping' },
  { id: 'red-onion', label: 'Red onion', defaultGramsPerPizza: 30, category: 'topping' },
  { id: 'bell-peppers', label: 'Bell peppers', defaultGramsPerPizza: 40, category: 'topping' },
  { id: 'olives', label: 'Olives', defaultGramsPerPizza: 20, category: 'topping' },
  { id: 'prosciutto', label: 'Prosciutto (after bake)', defaultGramsPerPizza: 30, category: 'topping' },
  { id: 'hot-honey', label: 'Hot honey (after bake)', defaultGramsPerPizza: 10, category: 'topping' },
];

export interface ToppingSelection {
  [id: string]: { gramsPerPizza: number };
}

export function defaultSelection(): ToppingSelection {
  return {
    'tomato-sauce': { gramsPerPizza: 60 },
    mozzarella: { gramsPerPizza: 110 },
    'olive-oil': { gramsPerPizza: 8 },
  };
}

export function toppingTotals(selection: ToppingSelection, pizzas: number) {
  return TOPPING_OPTIONS.filter((option) => selection[option.id]).map((option) => ({
    id: option.id,
    label: option.label,
    category: option.category,
    gramsTotal: Math.round(selection[option.id].gramsPerPizza * pizzas * 10) / 10,
  }));
}
