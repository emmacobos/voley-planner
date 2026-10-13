import { blockDuration, formatMinutes, minutesByType, sessionDuration, sessionIntensity } from '../domain/sessions';
import { EXERCISE_TYPES, INTENSITIES } from '../domain/types';
import type { Exercise, TrainingSession } from '../domain/types';

/** Resumen de la sesión: duración, intensidad, minutos por tipo y por bloque. */
export function SessionSummary({
  session,
  exercisesById,
}: {
  session: TrainingSession;
  exercisesById: Map<string, Exercise>;
}) {
  const total = sessionDuration(session);
  const intensity = sessionIntensity(session, exercisesById);
  const byType = minutesByType(session, exercisesById);
  const typed = EXERCISE_TYPES.reduce((sum, t) => sum + byType[t.value], 0);

  return (
    <section className="panel summary">
      <h3>Resumen</h3>
      <div className="stats">
        <div>
          <span className="stat-value">{formatMinutes(total)}</span>
          <span className="stat-label">duración total</span>
        </div>
        <div>
          <span className="stat-value">{intensity ? INTENSITIES.find((i) => i.value === intensity)?.label : '—'}</span>
          <span className="stat-label">intensidad promedio</span>
        </div>
        <div>
          <span className="stat-value">{session.playerIds.length}</span>
          <span className="stat-label">convocados</span>
        </div>
      </div>

      <h4>Minutos por tipo de ejercicio</h4>
      {typed === 0 ? (
        <p className="hint">Agregá ejercicios de la biblioteca a los bloques para ver el reparto.</p>
      ) : (
        <>
          <div className="type-bar" role="img" aria-label="Minutos por tipo de ejercicio">
            {EXERCISE_TYPES.map((t) =>
              byType[t.value] ? (
                <span key={t.value} className={`type-${t.value}`} style={{ flexGrow: byType[t.value] }} />
              ) : null,
            )}
          </div>
          <ul className="legend">
            {EXERCISE_TYPES.map((t) => (
              <li key={t.value}>
                <span className={`swatch type-${t.value}`} /> {t.label}: <b>{byType[t.value]} min</b>
              </li>
            ))}
          </ul>
        </>
      )}

      <h4>Bloques</h4>
      <ol className="summary-blocks">
        {session.blocks.map((b) => (
          <li key={b.id}>
            <span>{b.title}</span>
            <span className="muted">{formatMinutes(blockDuration(b))}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
