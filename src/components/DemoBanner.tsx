import { hasDemo, useAppStore } from '../store';

/** Aviso mientras están cargados los datos de ejemplo, con el botón para borrarlos. */
export function DemoBanner() {
  const demo = useAppStore(hasDemo);
  const removeDemo = useAppStore((s) => s.removeDemo);
  if (!demo) return null;
  return (
    <div className="demo-banner no-print" role="status">
      <p>
        <b>Estás viendo datos de ejemplo:</b> un plantel, tres ejercicios y cuatro sesiones (tres ya hechas, con asistencia). Tocá y cambiá lo que quieras.
      </p>
      <button
        onClick={() => {
          if (confirm('¿Borrar el plantel, los ejercicios y las sesiones de ejemplo? Lo que cargaste vos no se toca.')) removeDemo();
        }}
      >
        Borrar el ejemplo
      </button>
    </div>
  );
}
