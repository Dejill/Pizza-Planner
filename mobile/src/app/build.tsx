import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { DoughInput } from '@/lib/dough';
import {
  defaultSelection,
  toppingTotals,
  TOPPING_OPTIONS,
  type ToppingSelection,
} from '@/lib/toppings';
import { buildShoppingList, shoppingListText } from '@/lib/shopping';
import { buildCookSchedule, formatDuration } from '@/lib/schedule';
import { useThemeColors, type ThemeColors } from '@/lib/theme';
import {
  defaultRecipeStore,
  saveRecipe,
} from '@/lib/recipes';

function parseInput(params: Record<string, string | string[] | undefined>): DoughInput | null {
  const num = (key: string): number => {
    const raw = Array.isArray(params[key]) ? params[key][0] : params[key];
    return Number.parseFloat(raw ?? '');
  };
  if (!Number.isFinite(num('pizzas')) || !Number.isFinite(num('ballWeightG'))) return null;
  const flag = (key: string): boolean =>
    ((Array.isArray(params[key]) ? params[key][0] : params[key]) ?? 'false') === 'true';
  const prefKindRaw = Array.isArray(params.prefermentKind)
    ? params.prefermentKind[0]
    : params.prefermentKind;
  const prefKind = prefKindRaw === 'poolish' || prefKindRaw === 'biga' ? prefKindRaw : undefined;
  return {
    pizzas: num('pizzas'),
    ballWeightG: num('ballWeightG'),
    hydrationPct: num('hydrationPct'),
    saltPct: num('saltPct'),
    yeastKind: (Array.isArray(params.yeastKind) ? params.yeastKind[0] : params.yeastKind) ?? 'instant',
    fermentationHours: Number.isFinite(num('fermentationHours')) ? num('fermentationHours') : 24,
    coldRetard: ((Array.isArray(params.coldRetard) ? params.coldRetard[0] : params.coldRetard) ?? 'true') === 'true',
    ...(prefKind
      ? {
          prefermentKind: prefKind,
          prefermentSharePct: Number.isFinite(num('prefermentSharePct'))
            ? num('prefermentSharePct')
            : 25,
        }
      : {}),
    ...(flag('wholeGrain') ? { wholeGrain: true } : {}),
  } as DoughInput;
}

export default function BuildScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const params = useLocalSearchParams();
  const router = useRouter();
  const input = useMemo(() => parseInput(params), [params]);
  const [selection, setSelection] = useState<ToppingSelection>(() => {
    const raw = Array.isArray(params.toppings) ? params.toppings[0] : params.toppings;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as ToppingSelection;
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
    }
    return defaultSelection();
  });
  const [showList, setShowList] = useState(false);
  const [recipeNameText, setRecipeNameText] = useState('');

  const totals = useMemo(
    () => (input ? toppingTotals(selection, input.pizzas) : []),
    [selection, input],
  );

  const shoppingLines = useMemo(
    () => (input ? buildShoppingList(input, totals) : []),
    [input, totals],
  );

  if (!input) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.hintText}>Open the dough calculator first, then build the pizzas.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Go to calculator</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const toggleTopping = (id: string) => {
    setSelection((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        const option = TOPPING_OPTIONS.find((o) => o.id === id);
        next[id] = { gramsPerPizza: option?.defaultGramsPerPizza ?? 30 };
      }
      return next;
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Pizza Builder</Text>

      {(['sauce', 'cheese', 'topping'] as const).map((category) => (
        <View key={category} style={styles.card}>
          <Text style={styles.sectionLabel}>
            {category === 'sauce' ? 'Sauce' : category === 'cheese' ? 'Cheese' : 'Toppings'}
          </Text>
          <View style={styles.toppingGrid}>
            {TOPPING_OPTIONS.filter((option) => option.category === category).map((option) => {
              const active = Boolean(selection[option.id]);
              return (
                <View key={option.id} style={styles.toppingItem}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    onPress={() => toggleTopping(option.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={active ? styles.chipTextActive : styles.chipText}>{option.label}</Text>
                  </Pressable>
                  {active && (
                    <TextInput
                      style={styles.gramInput}
                      keyboardType="decimal-pad"
                      value={String(selection[option.id].gramsPerPizza)}
                      onChangeText={(text) => {
                        const grams = Number.parseFloat(text);
                        setSelection((prev) => ({
                          ...prev,
                          [option.id]: { gramsPerPizza: Number.isFinite(grams) ? grams : 0 },
                        }));
                      }}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>
          For {input.pizzas} pizza{input.pizzas > 1 ? 's' : ''} — plan takes{' '}
          {formatDuration(buildCookSchedule(input).reduce((sum, s) => sum + s.minutes, 0))}
        </Text>
        {totals.map((total) => (
          <View key={total.id} style={styles.row}>
            <Text style={styles.rowLabel}>{total.label}</Text>
            <Text style={styles.rowValue}>{total.gramsTotal} g</Text>
          </View>
        ))}
        {totals.length === 0 && <Text style={styles.hintText}>Pick at least one item above.</Text>}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Toggle shopping list"
        onPress={() => setShowList((prev) => !prev)}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>{showList ? 'Hide shopping list' : 'Shopping list'}</Text>
      </Pressable>

      {showList && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Shopping list</Text>
          {shoppingLines.map((line) => (
            <View key={line.label} style={styles.row}>
              <Text style={styles.rowLabel}>{line.label}</Text>
              <Text style={styles.rowValue}>{line.amount}</Text>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share shopping list"
            onPress={() => Share.share({ message: shoppingListText(shoppingLines) })}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Share</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Save recipe with toppings</Text>
        <View style={styles.saveRow}>
          <TextInput
            style={[styles.gramInput, { flex: 1, width: undefined }]}
            placeholder="Recipe name"
            placeholderTextColor={c.muted}
            value={recipeNameText}
            onChangeText={setRecipeNameText}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save recipe"
            onPress={() => {
              const name = recipeNameText.trim() || 'My pizza';
              void saveRecipe(defaultRecipeStore(), {
                name,
                input,
                toppings: selection,
              }).then(() => {
                setRecipeNameText('');
              });
            }}
            style={styles.saveButton}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
        </View>
        <Text style={styles.hintText}>
          Saved recipes appear in the dough calculator.
        </Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: c.text,
  },
  card: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text,
  },
  toppingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toppingItem: {
    gap: 6,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.accent,
    backgroundColor: c.background,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: {
    backgroundColor: c.accent,
  },
  chipText: {
    color: c.accent,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  gramInput: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 14,
    color: c.text,
    width: 80,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 15,
    color: c.muted,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text,
  },
  hintText: {
    fontSize: 14,
    color: c.muted,
  },
  primaryButton: {
    backgroundColor: c.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: c.accentSoft,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: c.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  saveRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: c.accentSoft,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  saveButtonText: {
    color: c.accent,
    fontWeight: '700',
    fontSize: 14,
  },
});
}
