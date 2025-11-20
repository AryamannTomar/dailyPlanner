// Theme definitions for multiple color themes
// Each theme defines colors in OKLCH format for both light and dark variants

export type ColorTheme =
  | 'default'
  | 'ocean-blue'
  | 'forest-green'
  | 'sunset-orange'
  | 'royal-purple'
  | 'rose-pink';

export interface ThemeColors {
  // Core colors
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  // Ring/focus
  ring: string;
  // Sidebar
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  // Chart colors
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
}

export interface ThemeDefinition {
  name: string;
  id: ColorTheme;
  description: string;
  light: ThemeColors;
  dark: ThemeColors;
  // Preview colors for swatch display
  previewColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const colorThemes: Record<ColorTheme, ThemeDefinition> = {
  default: {
    name: 'Default',
    id: 'default',
    description: 'Clean neutral tones',
    previewColors: {
      primary: '#1a1a1a',
      secondary: '#f5f5f5',
      accent: '#737373',
    },
    light: {
      primary: 'oklch(0.205 0 0)',
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.97 0 0)',
      secondaryForeground: 'oklch(0.205 0 0)',
      accent: 'oklch(0.97 0 0)',
      accentForeground: 'oklch(0.205 0 0)',
      ring: 'oklch(0.708 0 0)',
      sidebarPrimary: 'oklch(0.205 0 0)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      chart1: 'oklch(0.646 0.222 41.116)',
      chart2: 'oklch(0.6 0.118 184.704)',
      chart3: 'oklch(0.398 0.07 227.392)',
      chart4: 'oklch(0.828 0.189 84.429)',
      chart5: 'oklch(0.769 0.188 70.08)',
    },
    dark: {
      primary: 'oklch(0.95 0 0)',
      primaryForeground: 'oklch(0.08 0 0)',
      secondary: 'oklch(0.18 0 0)',
      secondaryForeground: 'oklch(0.95 0 0)',
      accent: 'oklch(0.18 0 0)',
      accentForeground: 'oklch(0.95 0 0)',
      ring: 'oklch(0.5 0 0)',
      sidebarPrimary: 'oklch(0.6 0.25 200)',
      sidebarPrimaryForeground: 'oklch(0.95 0 0)',
      chart1: 'oklch(0.6 0.25 200)',
      chart2: 'oklch(0.7 0.2 160)',
      chart3: 'oklch(0.8 0.2 70)',
      chart4: 'oklch(0.65 0.25 300)',
      chart5: 'oklch(0.7 0.25 20)',
    },
  },
  'ocean-blue': {
    name: 'Ocean Blue',
    id: 'ocean-blue',
    description: 'Calm and professional',
    previewColors: {
      primary: '#0369a1',
      secondary: '#e0f2fe',
      accent: '#38bdf8',
    },
    light: {
      primary: 'oklch(0.55 0.18 230)',
      primaryForeground: 'oklch(0.99 0.005 230)',
      secondary: 'oklch(0.96 0.02 230)',
      secondaryForeground: 'oklch(0.35 0.1 230)',
      accent: 'oklch(0.75 0.15 230)',
      accentForeground: 'oklch(0.25 0.1 230)',
      ring: 'oklch(0.55 0.18 230)',
      sidebarPrimary: 'oklch(0.55 0.18 230)',
      sidebarPrimaryForeground: 'oklch(0.99 0.005 230)',
      chart1: 'oklch(0.55 0.18 230)',
      chart2: 'oklch(0.65 0.15 200)',
      chart3: 'oklch(0.75 0.12 180)',
      chart4: 'oklch(0.6 0.2 250)',
      chart5: 'oklch(0.7 0.18 210)',
    },
    dark: {
      primary: 'oklch(0.7 0.15 230)',
      primaryForeground: 'oklch(0.1 0.02 230)',
      secondary: 'oklch(0.22 0.04 230)',
      secondaryForeground: 'oklch(0.9 0.02 230)',
      accent: 'oklch(0.5 0.12 230)',
      accentForeground: 'oklch(0.95 0.01 230)',
      ring: 'oklch(0.6 0.15 230)',
      sidebarPrimary: 'oklch(0.65 0.15 230)',
      sidebarPrimaryForeground: 'oklch(0.98 0.005 230)',
      chart1: 'oklch(0.65 0.18 230)',
      chart2: 'oklch(0.7 0.15 200)',
      chart3: 'oklch(0.75 0.12 180)',
      chart4: 'oklch(0.6 0.2 250)',
      chart5: 'oklch(0.7 0.18 210)',
    },
  },
  'forest-green': {
    name: 'Forest Green',
    id: 'forest-green',
    description: 'Natural and refreshing',
    previewColors: {
      primary: '#15803d',
      secondary: '#dcfce7',
      accent: '#4ade80',
    },
    light: {
      primary: 'oklch(0.52 0.16 145)',
      primaryForeground: 'oklch(0.99 0.01 145)',
      secondary: 'oklch(0.96 0.03 145)',
      secondaryForeground: 'oklch(0.3 0.1 145)',
      accent: 'oklch(0.75 0.18 145)',
      accentForeground: 'oklch(0.25 0.08 145)',
      ring: 'oklch(0.52 0.16 145)',
      sidebarPrimary: 'oklch(0.52 0.16 145)',
      sidebarPrimaryForeground: 'oklch(0.99 0.01 145)',
      chart1: 'oklch(0.52 0.16 145)',
      chart2: 'oklch(0.6 0.14 160)',
      chart3: 'oklch(0.7 0.12 130)',
      chart4: 'oklch(0.55 0.18 170)',
      chart5: 'oklch(0.65 0.15 140)',
    },
    dark: {
      primary: 'oklch(0.7 0.16 145)',
      primaryForeground: 'oklch(0.1 0.02 145)',
      secondary: 'oklch(0.2 0.04 145)',
      secondaryForeground: 'oklch(0.9 0.02 145)',
      accent: 'oklch(0.55 0.14 145)',
      accentForeground: 'oklch(0.95 0.01 145)',
      ring: 'oklch(0.6 0.14 145)',
      sidebarPrimary: 'oklch(0.65 0.15 145)',
      sidebarPrimaryForeground: 'oklch(0.98 0.01 145)',
      chart1: 'oklch(0.65 0.16 145)',
      chart2: 'oklch(0.7 0.14 160)',
      chart3: 'oklch(0.75 0.12 130)',
      chart4: 'oklch(0.6 0.18 170)',
      chart5: 'oklch(0.7 0.15 140)',
    },
  },
  'sunset-orange': {
    name: 'Sunset Orange',
    id: 'sunset-orange',
    description: 'Warm and energetic',
    previewColors: {
      primary: '#c2410c',
      secondary: '#ffedd5',
      accent: '#fb923c',
    },
    light: {
      primary: 'oklch(0.55 0.2 45)',
      primaryForeground: 'oklch(0.99 0.01 45)',
      secondary: 'oklch(0.96 0.03 60)',
      secondaryForeground: 'oklch(0.35 0.12 45)',
      accent: 'oklch(0.75 0.18 55)',
      accentForeground: 'oklch(0.25 0.1 45)',
      ring: 'oklch(0.55 0.2 45)',
      sidebarPrimary: 'oklch(0.55 0.2 45)',
      sidebarPrimaryForeground: 'oklch(0.99 0.01 45)',
      chart1: 'oklch(0.55 0.2 45)',
      chart2: 'oklch(0.65 0.18 30)',
      chart3: 'oklch(0.75 0.15 60)',
      chart4: 'oklch(0.6 0.22 20)',
      chart5: 'oklch(0.7 0.19 50)',
    },
    dark: {
      primary: 'oklch(0.72 0.18 45)',
      primaryForeground: 'oklch(0.1 0.02 45)',
      secondary: 'oklch(0.22 0.05 45)',
      secondaryForeground: 'oklch(0.9 0.02 45)',
      accent: 'oklch(0.55 0.15 55)',
      accentForeground: 'oklch(0.95 0.01 45)',
      ring: 'oklch(0.62 0.16 45)',
      sidebarPrimary: 'oklch(0.68 0.17 45)',
      sidebarPrimaryForeground: 'oklch(0.98 0.01 45)',
      chart1: 'oklch(0.68 0.2 45)',
      chart2: 'oklch(0.72 0.18 30)',
      chart3: 'oklch(0.78 0.15 60)',
      chart4: 'oklch(0.65 0.22 20)',
      chart5: 'oklch(0.73 0.19 50)',
    },
  },
  'royal-purple': {
    name: 'Royal Purple',
    id: 'royal-purple',
    description: 'Elegant and creative',
    previewColors: {
      primary: '#7c3aed',
      secondary: '#f3e8ff',
      accent: '#a78bfa',
    },
    light: {
      primary: 'oklch(0.55 0.22 290)',
      primaryForeground: 'oklch(0.99 0.01 290)',
      secondary: 'oklch(0.96 0.03 290)',
      secondaryForeground: 'oklch(0.35 0.12 290)',
      accent: 'oklch(0.72 0.16 290)',
      accentForeground: 'oklch(0.25 0.1 290)',
      ring: 'oklch(0.55 0.22 290)',
      sidebarPrimary: 'oklch(0.55 0.22 290)',
      sidebarPrimaryForeground: 'oklch(0.99 0.01 290)',
      chart1: 'oklch(0.55 0.22 290)',
      chart2: 'oklch(0.65 0.18 270)',
      chart3: 'oklch(0.7 0.15 310)',
      chart4: 'oklch(0.6 0.2 250)',
      chart5: 'oklch(0.68 0.19 280)',
    },
    dark: {
      primary: 'oklch(0.72 0.18 290)',
      primaryForeground: 'oklch(0.1 0.02 290)',
      secondary: 'oklch(0.2 0.05 290)',
      secondaryForeground: 'oklch(0.9 0.02 290)',
      accent: 'oklch(0.5 0.14 290)',
      accentForeground: 'oklch(0.95 0.01 290)',
      ring: 'oklch(0.6 0.16 290)',
      sidebarPrimary: 'oklch(0.68 0.17 290)',
      sidebarPrimaryForeground: 'oklch(0.98 0.01 290)',
      chart1: 'oklch(0.68 0.2 290)',
      chart2: 'oklch(0.72 0.18 270)',
      chart3: 'oklch(0.75 0.15 310)',
      chart4: 'oklch(0.65 0.2 250)',
      chart5: 'oklch(0.7 0.19 280)',
    },
  },
  'rose-pink': {
    name: 'Rose Pink',
    id: 'rose-pink',
    description: 'Soft and modern',
    previewColors: {
      primary: '#db2777',
      secondary: '#fce7f3',
      accent: '#f472b6',
    },
    light: {
      primary: 'oklch(0.55 0.22 350)',
      primaryForeground: 'oklch(0.99 0.01 350)',
      secondary: 'oklch(0.96 0.03 350)',
      secondaryForeground: 'oklch(0.35 0.12 350)',
      accent: 'oklch(0.75 0.18 350)',
      accentForeground: 'oklch(0.25 0.1 350)',
      ring: 'oklch(0.55 0.22 350)',
      sidebarPrimary: 'oklch(0.55 0.22 350)',
      sidebarPrimaryForeground: 'oklch(0.99 0.01 350)',
      chart1: 'oklch(0.55 0.22 350)',
      chart2: 'oklch(0.65 0.18 330)',
      chart3: 'oklch(0.7 0.15 10)',
      chart4: 'oklch(0.6 0.2 320)',
      chart5: 'oklch(0.68 0.19 340)',
    },
    dark: {
      primary: 'oklch(0.72 0.18 350)',
      primaryForeground: 'oklch(0.1 0.02 350)',
      secondary: 'oklch(0.2 0.05 350)',
      secondaryForeground: 'oklch(0.9 0.02 350)',
      accent: 'oklch(0.52 0.15 350)',
      accentForeground: 'oklch(0.95 0.01 350)',
      ring: 'oklch(0.6 0.16 350)',
      sidebarPrimary: 'oklch(0.68 0.17 350)',
      sidebarPrimaryForeground: 'oklch(0.98 0.01 350)',
      chart1: 'oklch(0.68 0.2 350)',
      chart2: 'oklch(0.72 0.18 330)',
      chart3: 'oklch(0.75 0.15 10)',
      chart4: 'oklch(0.65 0.2 320)',
      chart5: 'oklch(0.7 0.19 340)',
    },
  },
};

// Get all available themes as an array
export const getThemeList = (): ThemeDefinition[] => {
  return Object.values(colorThemes);
};

// Get a specific theme by ID
export const getTheme = (id: ColorTheme): ThemeDefinition => {
  return colorThemes[id] || colorThemes.default;
};

// LocalStorage key for color theme
export const COLOR_THEME_STORAGE_KEY = 'dailyplanner-color-theme';

// Get saved color theme from localStorage
export const getSavedColorTheme = (): ColorTheme => {
  if (typeof window === 'undefined') return 'default';
  const saved = localStorage.getItem(COLOR_THEME_STORAGE_KEY);
  if (saved && saved in colorThemes) {
    return saved as ColorTheme;
  }
  return 'default';
};

// Save color theme to localStorage
export const saveColorTheme = (theme: ColorTheme): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(COLOR_THEME_STORAGE_KEY, theme);
};

// Apply color theme to document
export const applyColorTheme = (themeId: ColorTheme): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Remove all theme classes
  Object.keys(colorThemes).forEach((id) => {
    root.classList.remove(`theme-${id}`);
  });

  // Add new theme class (default doesn't need a class as it uses base styles)
  if (themeId !== 'default') {
    root.classList.add(`theme-${themeId}`);
  }

  // Save to localStorage
  saveColorTheme(themeId);
};

// Initialize color theme on page load
export const initializeColorTheme = (): ColorTheme => {
  const savedTheme = getSavedColorTheme();
  applyColorTheme(savedTheme);
  return savedTheme;
};
