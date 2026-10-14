import { useTheme } from '../theme';

/** Botón del menú para pasar de modo claro a oscuro y viceversa. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button className="theme-toggle" onClick={toggle} aria-pressed={dark} title={dark ? 'Pasar a modo claro' : 'Pasar a modo oscuro'}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d={
            dark
              ? 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10'
              : 'M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11'
          }
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="theme-label">{dark ? 'Modo claro' : 'Modo oscuro'}</span>
    </button>
  );
}
