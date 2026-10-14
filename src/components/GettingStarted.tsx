import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';

/**
 * Guía de primeros pasos: muestra qué falta (plantel → ejercicio → sesión)
 * según lo que ya cargó el usuario, y resalta el próximo paso.
 */
export function GettingStarted() {
  const players = useAppStore((s) => s.players.length);
  const squads = useAppStore((s) => s.squads.length);
  const exercises = useAppStore((s) => s.exercises.length);
  const sessions = useAppStore((s) => s.sessions.length);
  const createExercise = useAppStore((s) => s.createExercise);
  const createSession = useAppStore((s) => s.createSession);

  const steps = [
    {
      done: players > 0,
      title: 'Cargá tu plantel',
      detail:
        squads > 0 && players === 0
          ? 'Ya creaste un plantel: falta cargar a los jugadores.'
          : 'Creá un plantel por equipo o categoría y cargá a los jugadores con su número y posición.',
      action: { label: 'Ir a planteles', run: () => navigate('/plantel') },
    },
    {
      done: exercises > 0,
      title: 'Creá tu primer ejercicio',
      detail: 'Dibujalo en la pizarra, usá las formaciones del 5-1, 4-2 o 6-0 y animalo paso a paso.',
      action: { label: '+ Nuevo ejercicio', run: () => navigate(`/ejercicios/${createExercise()}`) },
    },
    {
      done: sessions > 0,
      title: 'Planificá una sesión',
      detail: 'Armá el entrenamiento por bloques con tus ejercicios y exportalo a PDF.',
      action: { label: '+ Nueva sesión', run: () => navigate(`/sesiones/${createSession()}`) },
    },
  ];
  const next = steps.findIndex((s) => !s.done);
  if (next === -1) return null;

  return (
    <section className="getting-started">
      <h2>Primeros pasos</h2>
      <ol>
        {steps.map((s, i) => (
          <li key={s.title} className={s.done ? 'done' : i === next ? 'next' : ''}>
            <span className="step-mark">{s.done ? '✓' : i + 1}</span>
            <div>
              <strong>{s.title}</strong>
              {!s.done && <p className="muted">{s.detail}</p>}
            </div>
            {i === next && (
              <button className="primary" onClick={s.action.run}>
                {s.action.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
