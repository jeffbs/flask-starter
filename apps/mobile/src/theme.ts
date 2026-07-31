import { useColorScheme } from 'react-native';
import type { TextStyle } from 'react-native';

/**
 * Design-Tokens gemäß docs/UI-BRIEF-MOBILE.md — Kleinanzeigen-Standard,
 * ehrlich ausgeführt: weiße Cards, moderate Radien, EIN Grün für Aktionen,
 * semantische Statusfarben, Dark Mode gleichwertig.
 */
export const palette = {
  light: {
    accent: '#1d7a4f', // Marken-Grün (Token, bewusst nicht Kleinanzeigen-Grün 1:1)
    onAccent: '#ffffff',
    accentSoft: '#e3f3ea',
    background: '#f4f5f7',
    card: '#ffffff',
    text: '#1a1d21',
    muted: '#68727d',
    border: '#e4e7ec',
    inputBackground: '#ffffff',
    success: '#1d7a4f',
    warning: '#b45309',
    warningSoft: '#fdf1e0',
    danger: '#b91c1c',
    dangerSoft: '#fdeaea',
    info: '#3730a3',
    infoSoft: '#e8e9fb',
    bubbleMine: '#dcf1e6',
    bubbleTheirs: '#ffffff',
    skeleton: '#e8eaee',
  },
  dark: {
    accent: '#4fc98a',
    onAccent: '#06281a',
    accentSoft: '#123527',
    background: '#131518',
    card: '#1d2025',
    text: '#f1f3f5',
    muted: '#9aa4af',
    border: '#2b2f36',
    inputBackground: '#25292f',
    success: '#4fc98a',
    warning: '#e5a04b',
    warningSoft: '#3a2c17',
    danger: '#ef6b6b',
    dangerSoft: '#3b1f1f',
    info: '#a5a9f0',
    infoSoft: '#26284a',
    bubbleMine: '#1e3a2c',
    bubbleTheirs: '#1d2025',
    skeleton: '#2a2e34',
  },
};

export type Colors = typeof palette.light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}

export const spacing = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
export const radius = { s: 8, m: 12, l: 16, full: 999 } as const;

/** Typo-Rollen; Größen skalieren via allowFontScaling (Standard an). */
export const type: Record<'title' | 'heading' | 'body' | 'label' | 'caption' | 'price', TextStyle> = {
  title: { fontSize: 22, fontWeight: '700' },
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  label: { fontSize: 13, fontWeight: '500' },
  caption: { fontSize: 12, fontWeight: '400' },
  price: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
};

export const touch = { minSize: 48 } as const;
