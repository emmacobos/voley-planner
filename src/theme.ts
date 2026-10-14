import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'voley-planner-theme';

/** Tema guardado en este navegador o, si no hay, el del sistema. */
export function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Sin acceso a localStorage (modo privado, etc.): usar el del sistema.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#070f1b' : '#0e1a2b');
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme as Theme) || initialTheme());
  useEffect(() => apply(theme), [theme]);
  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Se aplica igual, solo que no se recuerda.
    }
    setTheme(next);
  };
  return { theme, toggle };
}
