import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Slider from '@react-native-community/slider';
import {
  computeDough,
  validateDoughInput,
  type DoughInput,
  type YeastKind,
} from '@/lib/dough';

const YEAST_KINDS: { value: YeastKind; label: string }[] = [
  { value: 'instant', label: 'Instant' },
  { value: 'active-dry', label: 'Active dry' },
  { value: 'fresh', label: 'Fresh' },
  { value: 'sourdough', label: 'Sourdough' },
];

const COLORS = {
  background: '#fff7f0',
  card: '#ffffff',
  text: '#2d2016',
  muted: '#8a7663',
  accent: '#d9541e',
  accentSoft: '#fbe4d5',
  border: '#eadcd2',
};

export default function DoughCalculatorScreen() {
  const [pizzas, setPizzas] = useState(4);
  const [ballWeightText, setBallWeightText] = useState('250');
  const [hydrationPct, setHydrationPct] = useState(65);
  const [saltPct, setSaltPct] = useState(2.5);
  const [yeastKind, setYeastKind] = useState<YeastKind>('instant');
  const [fermentationHours, setFermentationHours] = useState(24);
  const [coldRetard, setColdRetard] = useState(true);

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

  const errors = useMemo(() => validateDoughInput(input), [input]);
  const recipe = useMemo(() => computeDough(input), [input]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Dough Calculator</Text>

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
            minimumTrackTintColor={COLORS.accent}
            maximumTrackTintColor={COLORS.border}
          />
        </Field>
        <Field label={`Salt — ${saltPct.toFixed(1)}% of flour`}>
          <Slider
            minimumValue={0}
            maximumValue={5}
            step={0.1}
            value={saltPct}
            onValueChange={setSaltPct}
            minimumTrackTintColor={COLORS.accent}
            maximumTrackTintColor={COLORS.border}
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
            minimumTrackTintColor={COLORS.accent}
            maximumTrackTintColor={COLORS.border}
          />
        </Field>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Yeast</Text>
        <SegmentedControl
          options={YEAST_KINDS}
          selected={yeastKind}
          onSelect={(value) => setYeastKind(value as YeastKind)}
        />
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
          <Text style={styles.sectionLabel}>For {recipe.totalDoughG} g of dough</Text>
          <Row label="Flour" value={`${recipe.flourG} g`} />
          <Row label="Water" value={`${recipe.waterG} g`} />
          <Row label="Salt" value={`${recipe.saltG} g`} />
          {yeastKind === 'sourdough' ? (
            <Row label="Mature starter" value={`${recipe.starterG} g`} />
          ) : (
            <Row label={YEAST_KINDS.find((k) => k.value === yeastKind)?.label ?? 'Yeast'} value={`${recipe.yeastG} g`} />
          )}
        </View>
      )}

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
        style={styles.cookButton}
      >
        <Text style={styles.cookButtonText}>Start cooking plan</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: COLORS.text,
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
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 20,
    color: COLORS.accent,
    fontWeight: '700',
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 24,
    textAlign: 'center',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.accent,
  },
  segmentText: {
    color: COLORS.muted,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#fdecea',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  errorText: {
    color: '#b3261e',
    fontSize: 14,
  },
  resultCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 16,
    color: COLORS.muted,
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  cookButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cookButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
});
