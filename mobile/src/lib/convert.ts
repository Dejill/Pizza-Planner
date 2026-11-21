export interface UnitConversion {
  label: string;
  amount: number;
}

const GRAMS_PER_CUP: Record<string, number> = {
  flour: 120,
  water: 240,
  starter: 240,
};

const GRAMS_PER_TSP: Record<string, number> = {
  'Instant yeast': 3.1,
  'Active dry yeast': 2.8,
  'Fresh yeast': 3.2,
  salt: 5.7,
};

function findIngredientKey(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes('flour')) return 'flour';
  if (lower.includes('water')) return 'water';
  if (lower.includes('starter')) return 'starter';
  if (lower.includes('instant yeast')) return 'Instant yeast';
  if (lower.includes('active dry')) return 'Active dry yeast';
  if (lower.includes('fresh yeast')) return 'Fresh yeast';
  if (lower.includes('salt')) return 'salt';
  return '';
}

function gramsToCups(grams: number, gramsPerCup: number): number {
  return Math.round((grams / gramsPerCup) * 4) / 4;
}

function gramsToTsp(grams: number, gramsPerTsp: number): number {
  const tsp = grams / gramsPerTsp;
  if (tsp >= 0.5) return Math.round(tsp * 2) / 2;
  return Math.round(tsp * 10) / 10;
}

export function convertLine(label: string, grams: number): UnitConversion | null {
  const key = findIngredientKey(label);
  if (GRAMS_PER_CUP[key]) {
    return { label: 'cups (approx)', amount: gramsToCups(grams, GRAMS_PER_CUP[key]) };
  }
  if (GRAMS_PER_TSP[key]) {
    return { label: 'tsp (approx)', amount: gramsToTsp(grams, GRAMS_PER_TSP[key]) };
  }
  return null;
}

export function formatConversion(conversion: UnitConversion): string {
  if (conversion.label === 'cups (approx)' && conversion.amount === 0) return 'less than ¼ cup (approx)';
  return `${conversion.amount} ${conversion.label}`;
}
