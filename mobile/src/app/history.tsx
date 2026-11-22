import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  deleteCookHistoryEntry,
  listCookHistory,
  type CookHistoryEntry,
} from '@/lib/history';
import { defaultRecipeStore } from '@/lib/recipes';
import { formatClock, formatDayLabel } from '@/lib/readyTime';
import { useLang } from '@/lib/useLang';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

export default function HistoryScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { lang, dict } = useLang();
  const [entries, setEntries] = useState<CookHistoryEntry[]>([]);
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    void listCookHistory(defaultRecipeStore()).then(setEntries);
  }, []);

  const removeEntry = async (id: string) => {
    await deleteCookHistoryEntry(defaultRecipeStore(), id);
    setEntries(await listCookHistory(defaultRecipeStore()));
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{dict.history.title}</Text>
      {entries.length === 0 && <Text style={styles.hintText}>{dict.history.empty}</Text>}
      {entries.map((entry) => (
        <View key={entry.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.entryTitle}>
              {formatDayLabel(entry.completedAt, nowMs, lang)} {formatClock(entry.completedAt, lang)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={dict.history.deleteA11y}
              onPress={() => void removeEntry(entry.id)}
            >
              <Text style={styles.deleteText}>{dict.common.delete}</Text>
            </Pressable>
          </View>
          <Text style={styles.entryMeta}>
            {entry.input.pizzas} × {entry.input.ballWeightG} g · {entry.input.hydrationPct}%
            {dict.history.hydrationShort} · {dict.common.yeastKinds[entry.input.yeastKind]}
            {entry.input.prefermentKind ? ` · ${entry.input.prefermentKind}` : ''}
            {entry.input.wholeGrain ? ` · ${dict.history.wholeGrain}` : ''}
          </Text>
          {entry.note ? <Text style={styles.entryNote}>{entry.note}</Text> : null}
        </View>
      ))}
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
      gap: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    entryTitle: {
      fontWeight: '700',
      color: c.text,
    },
    entryMeta: {
      fontSize: 13,
      color: c.muted,
    },
    entryNote: {
      fontSize: 14,
      color: c.text,
      lineHeight: 20,
    },
    deleteText: {
      color: c.accent,
      fontWeight: '600',
      fontSize: 14,
    },
    hintText: {
      fontSize: 13,
      color: c.muted,
      lineHeight: 20,
    },
  });
}
