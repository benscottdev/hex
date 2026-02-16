/**
 * hexInspo design tokens — warm pastel palette
 * Soft cream background, rounded corners, clean typography
 */

export const colors = {
  // Text
  darkGrey: '#3A3A3C',
  systemGray: '#8E8E93',
  systemGray2: '#AEAEB2',
  systemGray3: '#C7C7CC',
  systemGray4: '#D1D1D6',
  systemGray5: '#E5E5EA',
  systemGray6: '#F2F2F7',
  white: '#FFFFFF',
  black: '#000000',
  separator: 'rgba(58, 58, 60, 0.12)',
  destructive: '#E9A5A5',

  // Background (hexInspo warm cream)
  background: '#FDFBF7',
  backgroundMuted: '#FAF7F2',

  // Pastel palette from hexInspo
  yellow: '#F5E6D3',
  yellowLight: '#FBF4EA',
  yellowDark: '#E8D4B8',
  coral: '#F4C4C4',
  coralLight: '#F9E0E0',
  coralDark: '#E9A5A5',
  turquoise: '#C3E4E3',
  turquoiseLight: '#E0F2F1',
  turquoiseDark: '#A8CFC9',
  cream: '#FAF7F2',
  warmGray: '#E5E1DC',
  muted: '#F0EDE8',

  // Legacy aliases (keep for compatibility)
  pastelLavender: '#C3E4E3',
  pastelOrange: '#F5E6D3',
  pastelBlue: '#C3E4E3',
  pastelPink: '#F4C4C4',
};

export const spacing = {
  screenPadding: 20,
  listInset: 20,
  sectionPadding: 20,
  cardPadding: 16,
  cellPaddingVertical: 12,
  cellPaddingHorizontal: 16,
  gap: 12,
  gapLarge: 20,
};

export const typography = {
  largeTitle: {
    fontSize: 34,
    fontWeight: '600',
  },
  title1: {
    fontSize: 28,
    fontWeight: '600',
  },
  title2: {
    fontSize: 22,
    fontWeight: '600',
  },
  title3: {
    fontSize: 20,
    fontWeight: '600',
  },
  body: {
    fontSize: 17,
    fontWeight: '400',
  },
  callout: {
    fontSize: 16,
    fontWeight: '400',
  },
  subheadline: {
    fontSize: 15,
    fontWeight: '400',
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400',
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400',
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400',
  },
};

export const radius = {
  small: 12,
  medium: 16,
  large: 20,
  sheet: 24,
  pill: 9999,
};
