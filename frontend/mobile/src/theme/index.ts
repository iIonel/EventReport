import { MD3LightTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  fontFamily: 'System',
};

export const theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200EE',
    primaryContainer: '#E8DEF8',
    secondary: '#03DAC6',
    secondaryContainer: '#C8FFF4',
    tertiary: '#FF5722',
    tertiaryContainer: '#FFE0B2',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    background: '#FAFAFA',
    error: '#B00020',
    errorContainer: '#FDECEA',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#21005D',
    onSecondary: '#000000',
    onSecondaryContainer: '#002020',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#331200',
    onSurface: '#1C1B1F',
    onSurfaceVariant: '#49454F',
    onBackground: '#1C1B1F',
    onError: '#FFFFFF',
    outline: '#79747E',
    outlineVariant: '#CAC4D0',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#313033',
    inverseOnSurface: '#F4EFF4',
    inversePrimary: '#D0BCFF',
    elevation: {
      level0: 'transparent',
      level1: '#F7F2FA',
      level2: '#F3EDF7',
      level3: '#EFE9F4',
      level4: '#EDE7F2',
      level5: '#EBE4F0',
    },
  },
  roundness: 12,
};

export const ALERT_COLORS = {
  GREEN: '#4CAF50',
  YELLOW: '#FFC107',
  ORANGE: '#FF9800',
  RED: '#F44336',
};

export const ALERT_LABELS = {
  GREEN: 'Green - Info',
  YELLOW: 'Yellow - Caution',
  ORANGE: 'Orange - Danger',
  RED: 'Red - Urgent',
};

export type AlertCode = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
