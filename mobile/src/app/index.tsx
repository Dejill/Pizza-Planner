import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import {
  computeDough,
  validateDoughInput,
  type DoughInput,
  type YeastKind,
} from '@/lib/dough';
import { DOUGH_PRESETS } from '@/lib/presets';
import {
  defaultRecipeStore,
  deleteRecipe,
  listRecipes,
  saveRecipe,
  type SavedRecipe,
} from '@/lib/recipes';
import { convertLine, formatConversion } from '@/lib/convert';
import { formatClock, formatDayLabel, latestStartForReadyBy } from '@/lib/readyTime';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

const YEAST_KINDS: { value: YeastKind; label: string }[] = [
  { value: 'instant', label: 'Instant' },
  { value: 'active-dry', label: 'Active dry' },
  { value: 'fresh', label: 'Fresh' },
  { value: 'sourdough', label: 'Sourdough' },
];

function serializeInput(input: DoughInput): string {
  return JSON.stringify(input);
}

function parseSharedRecipe(shared: Record<string, string | string[] | undefined>): DoughInput | null {
  const raw = Array.isArray(shared.recipe) ? shared.recipe[0] : shared.recipe;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DoughInput;
    if (!parsed || typeof parsed.hydrationPct !== 'number' || typeof parsed.ballWeightG !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export default function DoughCalculatorScreen() {
  const shared = useLocalSearchParams();
  const sharedInput = parseSharedRecipe(shared);
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [pizzas, setPizzas] = useState(() => sharedInput?.pizzas ?? 4);
  const [ballWeightText, setBallWeightText] = useState(() =>
    sharedInput ? String(sharedInput.ballWeightG) : '250',
  );
  const [hydrationPct, setHydrationPct] = useState(() => sharedInput?.hydrationPct ?? 65);
  const [saltPct, setSaltPct] = useState(() => sharedInput?.saltPct ?? 2.5);
  const [yeastKind, setYeastKind] = useState<YeastKind>(() => sharedInput?.yeastKind ?? 'instant');
  const [fermentationHours, setFermentationHours] = useState(
    () => sharedInput?.fermentationHours ?? 24,
  );
  const [coldRetard, setColdRetard] = useState(() => sharedInput?.coldRetard ?? true);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [recipeNameText, setRecipeNameText] = useState('');
  const [showUnits, setShowUnits] = useState(false);
  const [readyByHoursText, setReadyByHoursText] = useState('');
  const [nowMs] = useState(() => Date.now());

  const ballWeightG = Number.parseFloat(ballWeightText) || 0;

  const input: DoughInput = useMemo(
    () => ({
      pizzas,
      ballWeightG,
      hydrationPct,
      saltPct,
      yeastKind,
      fermentationHours,
      coldRetard,
    }),
    [pizzas, ballWeightG, hydrationPct, saltPct, yeastKind, fermentationHours, coldRetard],
  );

  useEffect(() => {
    void listRecipes(defaultRecipeStore()).then(setRecipes);
  }, []);

  const readyByHours = Number.parseFloat(readyByHoursText);
  const readyByPlan = useMemo(() => {
    if (!Number.isFinite(readyByHours) || readyByHours <= 0) return null;
    return latestStartForReadyBy(input, nowMs + readyByHours * 3600 * 1000, nowMs);
  }, [readyByHours, input, nowMs]);

  const applyPreset = (id: string) => {
    setPresetId(id);
    const preset = DOUGH_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setHydrationPct(preset.patch.hydrationPct);
    setSaltPct(preset.patch.saltPct);
    setFermentationHours(preset.patch.fermentationHours);
    setColdRetard(preset.patch.coldRetard);
    setBallWeightText(String(preset.patch.ballWeightG));
  };

  const applyRecipe = (recipe: SavedRecipe) => {
    setPresetId(null);
    setPizzas(recipe.input.pizzas);
    setBallWeightText(String(recipe.input.ballWeightG));
    setHydrationPct(recipe.input.hydrationPct);
    setSaltPct(recipe.input.saltPct);
    setYeastKind(recipe.input.yeastKind);
    setFermentationHours(recipe.input.fermentationHours);
    setColdRetard(recipe.input.coldRetard);
  };

  const removeRecipe = async (id: string) => {
    await deleteRecipe(defaultRecipeStore(), id);
    setRecipes(await listRecipes(defaultRecipeStore()));
  };

  const handleSaveRecipe = async () => {
    const name = recipeNameText.trim() || `My ${coldRetard ? 'cold' : 'same-day'} dough`;
    const saved = await saveRecipe(defaultRecipeStore(), {
      name,
      input,
    });
    setRecipes(await listRecipes(defaultRecipeStore()));
    setRecipeNameText('');
    return saved;
  };

  const errors = useMemo(() => validateDoughInput(input), [input]);
  const recipe = useMemo(() => computeDough(input), [input]);

  const rows = [
    { key: 'flour', label: 'Flour', grams: recipe.flourG },
    { key: 'water', label: 'Water', grams: recipe.waterG },
    { key: 'salt', label: 'Salt', grams: recipe.saltG },
    ...(yeastKind === 'sourdough'
      ? [{ key: 'starter', label: 'Mature starter', grams: recipe.starterG }]
      : [
          {
            key: 'yeast',
            label: YEAST_KINDS.find((k) => k.value === yeastKind)?.label ?? 'Yeast',
            grams: recipe.yeastG,
          },
        ]),
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Dough Calculator</Text>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Style</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {DOUGH_PRESETS.map((preset) => {
              const active = preset.id === presetId;
              return (
                <Pressable
                  key={preset.id}
                  accessibilityRole="button"
                  accessibilityLabel={preset.label}
                  onPress={() => applyPreset(preset.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={active ? styles.chipTextActive : styles.chipText}>{preset.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        {presetId && (
          <Text style={styles.hintText}>{DOUGH_PRESETS.find((p) => p.id === presetId)?.description}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Stepper
          label="Pizzas"
          value={pizzas}
          onChange={(next) => setPizzas(Math.min(Math.max(1, next), 24))}
        />
        <Field label="Ball weight (g)">
          <TextInput
            style={styles.textInput}
            keyboardType="decimal-pad"
            value={ballWeightText}
            onChangeText={setBallWeightText}
          />
        </Field>
      </View>

      <View style={styles.card}>
        <Field label={`Hydration — ${hydrationPct}%`}>
          <Slider
            minimumValue={50}
            maximumValue={90}
            step={1}
            value={hydrationPct}
            onValueChange={setHydrationPct}
            minimumTrackTintColor={c.accent}
            maximumTrackTintColor={c.border}
          />
        </Field>
        <Field label={`Salt — ${saltPct.toFixed(1)}% of flour`}>
          <Slider
            minimumValue={0}
            maximumValue={5}
            step={0.1}
            value={saltPct}
            onValueChange={setSaltPct}
            minimumTrackTintColor={c.accent}
            maximumTrackTintColor={c.border}
          />
        </Field>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Fermentation</Text>
        <SegmentedControl
          options={[
            { value: 'room', label: 'Room temp' },
            { value: 'fridge', label: 'Cold retard' },
          ]}
          selected={coldRetard ? 'fridge' : 'room'}
          onSelect={(value) => setColdRetard(value === 'fridge')}
        />
        <Field label={`Bulk time — ${fermentationHours} h`}>
          <Slider
            minimumValue={2}
            maximumValue={96}
            step={1}
            value={fermentationHours}
            onValueChange={setFermentationHours}
            minimumTrackTintColor={c.accent}
            maximumTrackTintColor={c.border}
          />
        </Field>
        <Field label="Ready by (hours from now, optional)">
          <TextInput
            style={styles.textInput}
            keyboardType="number-pad"
            placeholder="e.g. 30"
            placeholderTextColor={c.muted}
            value={readyByHoursText}
            onChangeText={setReadyByHoursText}
          />
        </Field>
        {readyByPlan && (
          <Text style={styles.hintText}>
            Start mixing {formatDayLabel(readyByPlan.startAtMs, nowMs)} by{' '}
            {formatClock(readyByPlan.startAtMs)} — ready {formatDayLabel(readyByPlan.readyAtMs, nowMs)}{' '}
            {formatClock(readyByPlan.readyAtMs)}.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Yeast</Text>
        <SegmentedControl
          options={YEAST_KINDS}
          selected={yeastKind}
          onSelect={(value) => setYeastKind(value as YeastKind)}
        />
      </View>

      {recipes.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Saved recipes</Text>
          {recipes.map((item) => (
            <View key={item.id} style={styles.recipeRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Use recipe ${item.name}`}
                onPress={() => applyRecipe(item)}
                style={styles.recipeInfo}
              >
                <Text style={styles.recipeName}>{item.name}</Text>
                <Text style={styles.recipeMeta}>
                  {item.input.pizzas} × {item.input.ballWeightG} g · {item.input.hydrationPct}% ·{' '}
                  {item.input.fermentationHours} h
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open toppings for ${item.name}`}
                onPress={() =>
                  router.push({
                    pathname: '/build',
                    params: {
                      ...item.input,
                      coldRetard: String(item.input.coldRetard),
                      ...(item.toppings ? { toppings: JSON.stringify(item.toppings) } : {}),
                    },
                  })
                }
                style={styles.recipeDelete}
              >
                <Text style={styles.openRecipeText}>{item.toppings ? 'Toppings' : 'Build'}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete recipe ${item.name}`}
                onPress={() => void removeRecipe(item.id)}
                style={styles.recipeDelete}
              >
                <Text style={styles.recipeDeleteText}>Delete</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Save this setup</Text>
        <View style={styles.saveRow}>
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            placeholder="Recipe name"
            placeholderTextColor={c.muted}
            value={recipeNameText}
            onChangeText={setRecipeNameText}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save recipe"
            onPress={() => void handleSaveRecipe()}
            style={styles.saveButton}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
        </View>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share recipe link"
            onPress={() => {
              const url = `${typeof window !== 'undefined' ? window.location.origin : ''}${
                typeof window !== 'undefined' ? window.location.pathname : ''
              }?recipe=${encodeURIComponent(serializeInput(input))}`;
              navigator.share({ title: 'Pizza Planner recipe', url }).catch(() => undefined);
            }}
            style={styles.saveButton}
          >
            <Text style={styles.saveButtonText}>Share link</Text>
          </Pressable>
        )}
      </View>

      {errors.length > 0 ? (
        <View style={styles.errorCard}>
          {errors.map((error) => (
            <Text key={error.field} style={styles.errorText}>
              {error.message}
            </Text>
          ))}
        </View>
      ) : (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.sectionLabel}>For {recipe.totalDoughG} g of dough</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle unit conversions"
              onPress={() => setShowUnits((prev) => !prev)}
            >
              <Text style={styles.toggleText}>{showUnits ? 'Hide cups/tsp' : 'cups / tsp'}</Text>
            </Pressable>
          </View>
          {rows.map((row) => (
            <View key={row.key}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.grams} g</Text>
              </View>
              {showUnits && row.grams > 0 && (
                <Text style={styles.conversionText}>
                  {(() => {
                    const conversion = convertLine(row.label, row.grams);
                    return conversion ? `≈ ${formatConversion(conversion)}` : '';
                  })()}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start cooking plan"
          onPress={() =>
            router.push({
              pathname: '/cook',
              params: {
                pizzas,
                ballWeightG,
                hydrationPct,
                saltPct,
                yeastKind,
                fermentationHours,
                coldRetard: String(coldRetard),
              },
            })
          }
          style={[styles.primaryButton, { flex: 1 }]}
        >
          <Text style={styles.primaryButtonText}>Start cooking plan</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Build pizzas"
          onPress={() =>
            router.push({
              pathname: '/build',
              params: {
                pizzas,
                ballWeightG,
                hydrationPct,
                saltPct,
                yeastKind,
                fermentationHours,
                coldRetard: String(coldRetard),
              },
            })
          }
          style={[styles.secondaryButton, { flex: 1 }]}
        >
          <Text style={styles.secondaryButtonText}>Build pizzas</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => onChange(value - 1)}
          style={styles.stepperButton}
        >
          <Text style={styles.stepperButtonText}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={() => onChange(value + 1)}
          style={styles.stepperButton}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SegmentedControl({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === selected;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            onPress={() => onSelect(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={active ? styles.segmentTextActive : styles.segmentText}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function makeStyles(c: ThemeColors) {
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
      gap: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: c.text,
    },
    resultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    toggleText: {
      color: c.accent,
      fontWeight: '600',
      fontSize: 13,
    },
    conversionText: {
      fontSize: 13,
      color: c.muted,
      marginTop: 2,
    },
    field: {
      gap: 8,
    },
    fieldLabel: {
      fontSize: 14,
      color: c.muted,
      fontWeight: '600',
    },
    textInput: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.card,
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    stepperButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperButtonText: {
      fontSize: 20,
      color: c.accent,
      fontWeight: '700',
    },
    stepperValue: {
      fontSize: 18,
      fontWeight: '700',
      color: c.text,
      minWidth: 24,
      textAlign: 'center',
    },
    segmented: {
      flexDirection: 'row',
      backgroundColor: c.background,
      borderRadius: 10,
      padding: 3,
      gap: 3,
    },
    segment: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
    },
    segmentActive: {
      backgroundColor: c.accent,
    },
    segmentText: {
      color: c.muted,
      fontWeight: '600',
    },
    segmentTextActive: {
      color: '#ffffff',
      fontWeight: '600',
    },
    errorCard: {
      backgroundColor: c.errorBg,
      borderRadius: 16,
      padding: 16,
      gap: 6,
    },
    errorText: {
      color: c.errorText,
      fontSize: 14,
    },
    resultCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      gap: 10,
      borderWidth: 2,
      borderColor: c.accent,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    rowLabel: {
      fontSize: 16,
      color: c.muted,
    },
    rowValue: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
    },
    primaryButton: {
      backgroundColor: c.accent,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#ffffff',
      fontSize: 17,
      fontWeight: '700',
      textAlign: 'center',
    },
    secondaryButton: {
      backgroundColor: c.accentSoft,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      color: c.accent,
      fontSize: 17,
      fontWeight: '700',
      textAlign: 'center',
    },
    chipRow: {
      flexDirection: 'row',
      gap: 8,
    },
    chip: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.accent,
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
    hintText: {
      fontSize: 13,
      color: c.muted,
    },
    recipeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    recipeInfo: {
      flex: 1,
    },
    recipeName: {
      fontSize: 15,
      fontWeight: '600',
      color: c.text,
    },
    recipeMeta: {
      fontSize: 12,
      color: c.muted,
    },
    recipeDelete: {
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    recipeDeleteText: {
      color: c.errorText,
      fontWeight: '600',
      fontSize: 13,
    },
    openRecipeText: {
      color: c.accent,
      fontWeight: '600',
      fontSize: 13,
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
