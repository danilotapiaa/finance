export type ThemeId = 'forest' | 'blue' | 'night';

export interface ThemeOption {
  id: ThemeId;
  label: string;
  description: string;
  metaColor: string;
  preview: {
    canvas: string;
    surface: string;
    accent: string;
    ink: string;
  };
}

export const THEMES: ThemeOption[] = [
  {
    id: 'forest',
    label: 'Bosque',
    description: 'Verde sereno sobre neutros claros.',
    metaColor: '#F8F9FA',
    preview: {
      canvas: '#F8F9FA',
      surface: '#FFFFFF',
      accent: '#2E7D56',
      ink: '#111827',
    },
  },
  {
    id: 'blue',
    label: 'Azul pastel',
    description: 'Azul suave con luz fría.',
    metaColor: '#F4F8FC',
    preview: {
      canvas: '#F4F8FC',
      surface: '#FFFFFF',
      accent: '#2F6F98',
      ink: '#18344C',
    },
  },
  {
    id: 'night',
    label: 'Noche',
    description: 'Fondo profundo con acentos claros.',
    metaColor: '#0D131A',
    preview: {
      canvas: '#0D131A',
      surface: '#151E27',
      accent: '#8FC3E8',
      ink: '#F2F6FA',
    },
  },
];

export const DEFAULT_THEME: ThemeId = 'forest';
export const THEME_STORAGE_KEY = 'serene-theme';

export const isThemeId = (value: string | null): value is ThemeId =>
  THEMES.some((theme) => theme.id === value);
