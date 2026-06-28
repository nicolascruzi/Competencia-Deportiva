import { createContext, useContext, useEffect, useState } from 'react';

// Cada paleta define los tokens que se inyectan en :root como CSS vars
// Los nombres coinciden con lo que usan los JSX de contenido (hardcoded hex)
// La estrategia: reemplazamos el valor de cada variable, no el nombre
export const PALETTES = {
  noche: {
    id: 'noche',
    nombre: 'Modo noche',
    descripcion: 'Carbón oscuro · acento dorado',
    preview: ['#0E0F11', '#161719', '#2E3138', '#5A5E65', '#E8E2D4', '#D4A853'],
    vars: {
      '--t-ground':   '#0E0F11',
      '--t-surface':  '#161719',
      '--t-surface2': '#1E2025',
      '--t-dim':      '#2E3138',
      '--t-dim2':     '#3A3F4A',
      '--t-text':     '#E8E2D4',
      '--t-muted':    '#5A5E65',
      '--t-muted2':   '#4A4E58',
      '--t-accent':   '#D4A853',
      '--t-accent-r': '212,168,83',
      '--t-brand':    '#E8E2D4',
      '--t-danger':   '#F87171',
      '--t-nav-bg':   '#161719',
      '--t-nav-border':'#252729',
      '--t-tab-bg':   '#161719',
    },
  },
  indigo: {
    id: 'indigo',
    nombre: 'Blanco frío',
    descripcion: 'Fondo claro · acento índigo',
    preview: ['#F7F8FA', '#FFFFFF', '#E8ECF2', '#8891A8', '#1A1F36', '#4F6AFF'],
    vars: {
      '--t-ground':   '#F7F8FA',
      '--t-surface':  '#FFFFFF',
      '--t-surface2': '#F0F2F8',
      '--t-dim':      '#E8ECF2',
      '--t-dim2':     '#D0D6E8',
      '--t-text':     '#1A1F36',
      '--t-muted':    '#8891A8',
      '--t-muted2':   '#6A75A0',
      '--t-accent':   '#4F6AFF',
      '--t-accent-r': '79,106,255',
      '--t-brand':    '#2D3A8C',
      '--t-danger':   '#DC2626',
      '--t-nav-bg':   '#FFFFFF',
      '--t-nav-border':'#E8ECF2',
      '--t-tab-bg':   '#FFFFFF',
    },
  },
  tierra: {
    id: 'tierra',
    nombre: 'Crema cálida',
    descripcion: 'Fondo marfil · acento tierra',
    preview: ['#F5F2ED', '#FAFAF8', '#E5DFD5', '#9E8E7A', '#2C1F14', '#C4703A'],
    vars: {
      '--t-ground':   '#F5F2ED',
      '--t-surface':  '#FAFAF8',
      '--t-surface2': '#EDE8E1',
      '--t-dim':      '#E5DFD5',
      '--t-dim2':     '#D4C2AB',
      '--t-text':     '#2C1F14',
      '--t-muted':    '#9E8E7A',
      '--t-muted2':   '#7A6A58',
      '--t-accent':   '#C4703A',
      '--t-accent-r': '196,112,58',
      '--t-brand':    '#2C1F14',
      '--t-danger':   '#B91C1C',
      '--t-nav-bg':   '#FAFAF8',
      '--t-nav-border':'#E5DFD5',
      '--t-tab-bg':   '#FAFAF8',
    },
  },
  salvia: {
    id: 'salvia',
    nombre: 'Gris luz',
    descripcion: 'Fondo gris · acento verde salvia',
    preview: ['#F2F3F2', '#FFFFFF', '#E2E4E2', '#7A8C82', '#1C2320', '#3D7A5A'],
    vars: {
      '--t-ground':   '#F2F3F2',
      '--t-surface':  '#FFFFFF',
      '--t-surface2': '#EAECEB',
      '--t-dim':      '#E2E4E2',
      '--t-dim2':     '#C8CEC9',
      '--t-text':     '#1C2320',
      '--t-muted':    '#7A8C82',
      '--t-muted2':   '#5E7268',
      '--t-accent':   '#3D7A5A',
      '--t-accent-r': '61,122,90',
      '--t-brand':    '#1C2320',
      '--t-danger':   '#B91C1C',
      '--t-nav-bg':   '#FFFFFF',
      '--t-nav-border':'#E2E4E2',
      '--t-tab-bg':   '#FFFFFF',
    },
  },
  ciruela: {
    id: 'ciruela',
    nombre: 'Rosa arena',
    descripcion: 'Fondo rosado · acento ciruela',
    preview: ['#F6F1F4', '#FDF9FB', '#EAE0E6', '#A08898', '#2A1525', '#8B3A6B'],
    vars: {
      '--t-ground':   '#F6F1F4',
      '--t-surface':  '#FDF9FB',
      '--t-surface2': '#EDE6EA',
      '--t-dim':      '#EAE0E6',
      '--t-dim2':     '#D8C8D2',
      '--t-text':     '#2A1525',
      '--t-muted':    '#A08898',
      '--t-muted2':   '#7A6070',
      '--t-accent':   '#8B3A6B',
      '--t-accent-r': '139,58,107',
      '--t-brand':    '#2A1525',
      '--t-danger':   '#B91C1C',
      '--t-nav-bg':   '#FDF9FB',
      '--t-nav-border':'#EAE0E6',
      '--t-tab-bg':   '#FDF9FB',
    },
  },
};

const DEFAULT = 'noche';
const LS_KEY  = 'nanao_theme';

const ThemeContext = createContext(null);

function applyPalette(palette) {
  const root = document.documentElement;
  Object.entries(palette.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  // Ajusta también el bg del html/body para que el safe-area-inset coincida
  root.style.background = palette.vars['--t-ground'];
  document.body.style.background = palette.vars['--t-ground'];
  document.body.style.color = palette.vars['--t-text'];
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem(LS_KEY) || DEFAULT;
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
