import { useColorScheme } from 'react-native';

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  border: string;
  done: string;
  errorBg: string;
  errorText: string;
}

export const LIGHT_COLORS: ThemeColors = {
  background: '#fff7f0',
  card: '#ffffff',
  text: '#2d2016',
  muted: '#8a7663',
  accent: '#d9541e',
  accentSoft: '#fbe4d5',
  border: '#eadcd2',
  done: '#c9ecd0',
  errorBg: '#fdecea',
  errorText: '#b3261e',
};

export const DARK_COLORS: ThemeColors = {
  background: '#1a1410',
  card: '#28201a',
  text: '#f5ece3',
  muted: '#a8927d',
  accent: '#ff7034',
  accentSoft: '#4a2c1c',
  border: '#40342b',
  done: '#22402a',
  errorBg: '#43221f',
  errorText: '#ffb4ab',
};

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
}

export function themeColorForScheme(scheme: string | null | undefined): 'light' | 'dark' {
  return scheme === 'dark' ? 'dark' : 'light';
}
