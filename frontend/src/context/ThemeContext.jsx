import { createContext, useContext, useEffect, useState } from 'react';

export const PALETTES = {
  tierra: {
    id: 'tierra',
    nombre: 'Crema cálida',
    descripcion: 'Fondo marfil · acento tierra',
    preview: ['#F5F2ED', '#FAFAF8', '#E5DFD5', '#9E8E7A', '#2C1F14', '#C4703A'],
    vars: {
      '--t-ground':    '#F5F2ED',
      '--t-surface':   '#FAFAF8',
      '--t-surface2':  '#EDE8E1',
      '--t-dim':       '#E5DFD5',
      '--t-dim2':      '#D4C2AB',
      '--t-text':      '#2C1F14',
      '--t-muted':     '#9E8E7A',
      '--t-muted2':    '#7A6A58',
      '--t-accent':    '#C4703A',
      '--t-accent-r':  '196,112,58',
      '--t-brand':     '#2C1F14',
      '--t-danger':    '#B91C1C',
      '--t-nav-bg':    '#FAFAF8',
      '--t-nav-border':'#E5DFD5',
      '--t-tab-bg':    '#FAFAF8',
      '--t-overlay':   'rgba(44,31,20,0.55)',
      '--t-card-shadow':'rgba(44,31,20,0.08)',
    },
  },
  ciruela: {
    id: 'ciruela',
    nombre: 'Rosa arena',
    descripcion: 'Fondo rosado · acento ciruela',
    preview: ['#F6F1F4', '#FDF9FB', '#EAE0E6', '#A08898', '#2A1525', '#8B3A6B'],
    vars: {
      '--t-ground':    '#F6F1F4',
      '--t-surface':   '#FDF9FB',
      '--t-surface2':  '#EDE6EA',
      '--t-dim':       '#EAE0E6',
      '--t-dim2':      '#D8C8D2',
      '--t-text':      '#2A1525',
      '--t-muted':     '#A08898',
      '--t-muted2':    '#7A6070',
      '--t-accent':    '#8B3A6B',
      '--t-accent-r':  '139,58,107',
      '--t-brand':     '#2A1525',
      '--t-danger':    '#B91C1C',
      '--t-nav-bg':    '#FDF9FB',
      '--t-nav-border':'#EAE0E6',
      '--t-tab-bg':    '#FDF9FB',
      '--t-overlay':   'rgba(42,21,37,0.55)',
      '--t-card-shadow':'rgba(42,21,37,0.08)',
    },
  },
  noche: {
    id: 'noche',
    nombre: 'Modo noche',
    descripcion: 'Carbón oscuro · acento dorado',
    preview: ['#0E0F11', '#161719', '#2E3138', '#5A5E65', '#E8E2D4', '#D4A853'],
    vars: {
      '--t-ground':    '#0E0F11',
      '--t-surface':   '#161719',
      '--t-surface2':  '#1E2025',
      '--t-dim':       '#2E3138',
      '--t-dim2':      '#3A3F4A',
      '--t-text':      '#E8E2D4',
      '--t-muted':     '#5A5E65',
      '--t-muted2':    '#4A4E58',
      '--t-accent':    '#D4A853',
      '--t-accent-r':  '212,168,83',
      '--t-brand':     '#E8E2D4',
      '--t-danger':    '#F87171',
      '--t-nav-bg':    '#161719',
      '--t-nav-border':'#252729',
      '--t-tab-bg':    '#161719',
      '--t-overlay':   'rgba(5,5,7,0.65)',
      '--t-card-shadow':'rgba(0,0,0,0.4)',
    },
  },
};

const DEFAULT = 'tierra';
const LS_KEY  = 'nanao_theme';

const ThemeContext = createContext(null);

function applyPalette(palette) {
  const root = document.documentElement;
  Object.entries(palette.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.background       = palette.vars['--t-ground'];
  document.body.style.background = palette.vars['--t-ground'];
  document.body.style.color      = palette.vars['--t-text'];
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    // Si tenía guardada una paleta eliminada, volver al default
    return PALETTES[saved] ? saved : DEFAULT;
  });

  const palette = PALETTES[themeId] || PALETTES[DEFAULT];

  useEffect(() => {
    applyPalette(palette);
  }, [palette]);

  function setTheme(id) {
    if (!PALETTES[id]) return;
    setThemeId(id);
    localStorage.setItem(LS_KEY, id);
  }

  return (
    <ThemeContext.Provider value={{ themeId, palette, setTheme, palettes: PALETTES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
