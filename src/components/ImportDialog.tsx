import { resolveImport, useAuth } from '../cloud/auth';

/**
 * Al entrar por primera vez en un navegador que ya tiene datos sin cuenta,
 * pregunta si se suman a la cuenta o se descartan.
 */
export function ImportDialog() {
  const counts = useAuth((s) => s.importCounts);
  const busy = useAuth((s) => s.busy);
  if (!counts) return null;

  const parts = [
    [counts.squads, 'plantel', 'planteles'],
    [counts.players, 'jugador', 'jugadores'],
    [counts.exercises, 'ejercicio', 'ejercicios'],
    [counts.sessions, 'sesión', 'sesiones'],
  ]
    .filter(([n]) => (n as number) > 0)
    .map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <h2 id="import-title">¿Sumamos estos datos a tu cuenta?</h2>
        <p>
          En este navegador tenés guardados <b>{parts.join(', ')}</b> que todavía no están en tu cuenta.
        </p>
        <p className="muted small">
          Si los sumás, se suben a la nube junto con lo que ya tengas en la cuenta. Si los descartás, se borran de este
          navegador y ves solo lo de tu cuenta.
        </p>
        <div className="modal-actions">
          <button
            className="danger"
            disabled={busy}
            onClick={() => {
              if (confirm('Los datos de este navegador se van a borrar. ¿Seguir?')) void resolveImport(false);
            }}
          >
            Descartarlos
          </button>
          <button className="primary" disabled={busy} onClick={() => void resolveImport(true)}>
            {busy ? 'Subiendo…' : 'Sumarlos a mi cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
}
