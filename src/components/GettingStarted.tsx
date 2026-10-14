import type { ReactNode } from 'react';
import { navigate } from '../hooks/useHashRoute';
import { hasDemo, useAppStore } from '../store';

/** Dibujos de cada paso: camiseta, pizarra y calendario. */
const ART: ReactNode[] = [
  <svg key="plantel" width="120" height="110" viewBox="0 0 120 110" aria-hidden="true">
    <path d="M38 10 L20 22 L8 44 L24 52 L30 42 L30 100 L90 100 L90 42 L96 52 L112 44 L100 22 L82 10 Q60 26 38 10Z" fill="#F5B82E" />
    <text x="60" y="82" textAnchor="middle" fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif" fontWeight="800" fontSize="40" fill="#0E1A2B">
      7
    </text>
  </svg>,
  <svg key="ejercicio" width="200" height="110" viewBox="0 0 200 110" aria-hidden="true">
    <rect x="10" y="10" width="180" height="90" fill="#E8D3AE" stroke="#fff" strokeWidth="3" />
    <line x1="100" y1="6" x2="100" y2="104" stroke="#0E1A2B" strokeWidth="4" />
    <circle cx="50" cy="40" r="9" fill="#1F4FB8" />
    <circle cx="60" cy="75" r="9" fill="#1F4FB8" />
    <circle cx="150" cy="55" r="9" fill="#C0262D" />
    <path d="M58 40 Q80 20 92 48" fill="none" stroke="#C0262D" strokeWidth="3" />
    <path d="M68 75 L92 62" stroke="#1F4FB8" strokeWidth="3" strokeDasharray="5 4" />
  </svg>,
  <svg key="sesion" width="120" height="110" viewBox="0 0 120 110" aria-hidden="true">
    <rect x="14" y="18" width="92" height="82" rx="12" fill="#fff" />
    <rect x="14" y="18" width="92" height="22" rx="10" fill="#F5B82E" />
    <rect x="28" y="52" width="64" height="9" rx="4" fill="#d97706" />
    <rect x="28" y="67" width="46" height="9" rx="4" fill="#7c3aed" />
    <rect x="28" y="82" width="56" height="9" rx="4" fill="#15935e" />
    <rect x="34" y="8" width="8" height="20" rx="4" fill="#0E1A2B" />
    <rect x="78" y="8" width="8" height="20" rx="4" fill="#0E1A2B" />
  </svg>,
];

const ART_BACKGROUND = [
  'linear-gradient(135deg, #1F4FB8, #0E1A2B)',
  'linear-gradient(135deg, #C99A68, #E8D3AE)',
  'linear-gradient(135deg, #15935E, #0f6b41)',
];

/**
 * Guía de primeros pasos: muestra qué falta (plantel → ejercicio → sesión)
 * según lo que ya cargó el usuario, y resalta el próximo paso.
 */
export function GettingStarted() {
  const players = useAppStore((s) => s.players.length);
  const squads = useAppStore((s) => s.squads.length);
  const exercises = useAppStore((s) => s.exercises.length);
  const sessions = useAppStore((s) => s.sessions.length);
  const demoLoaded = useAppStore(hasDemo);
  const createExercise = useAppStore((s) => s.createExercise);
  const createSession = useAppStore((s) => s.createSession);
  const loadDemo = useAppStore((s) => s.loadDemo);

  const steps = [
    {
      done: players > 0,
      title: 'Cargá tu plantel',
      detail:
        squads > 0 && players === 0
          ? 'Ya creaste un plantel: falta cargar a los jugadores.'
          : 'Creá un plantel por equipo o categoría (por ejemplo "Primera femenina" o "Sub 18") y cargá a los jugadores con su número y posición.',
      action: { label: 'Ir a planteles', run: () => navigate('/plantel') },
      waiting: 'Primero cargá el plantel',
    },
    {
      done: exercises > 0,
      title: 'Creá tu primer ejercicio',
      detail: 'Dibujalo en la pizarra, usá las formaciones del 5-1, 4-2 o 6-0 y animalo paso a paso.',
      action: { label: '+ Nuevo ejercicio', run: () => navigate(`/ejercicios/${createExercise()}`) },
      waiting: 'Después del plantel',
    },
    {
      done: sessions > 0,
      title: 'Planificá una sesión',
      detail: 'Armá el entrenamiento por bloques con tus ejercicios, elegí convocados y exportalo a PDF.',
      action: { label: '+ Nueva sesión', run: () => navigate(`/sesiones/${createSession()}`) },
      waiting: 'Después del ejercicio',
    },
  ];
  const next = steps.findIndex((s) => !s.done);
  if (next === -1) return null;
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section className="getting-started">
      <div className="getting-started-head">
        <div>
          <h2>Primeros pasos</h2>
          <p className="muted">Tu primer entrenamiento planificado en 3 pasos.</p>
        </div>
        <div className="getting-started-progress">
          <span>
            {doneCount} de {steps.length} completados
          </span>
          <div className="progress-track" aria-hidden="true">
            <i style={{ width: `${Math.max(4, (doneCount / steps.length) * 100)}%` }} />
          </div>
        </div>
      </div>
      <ol>
        {steps.map((s, i) => (
          <li key={s.title} className={s.done ? 'done' : i === next ? 'next' : 'locked'}>
            <div className="step-art" style={{ background: ART_BACKGROUND[i] }}>
              <span className="step-mark">{s.done ? '✓' : i + 1}</span>
              {ART[i]}
            </div>
            <div className="step-body">
              <strong>{s.title}</strong>
              <p className="muted">{s.done ? '¡Listo!' : s.detail}</p>
              {i === next ? (
                <button className="primary" onClick={s.action.run}>
                  {s.action.label}
                </button>
              ) : (
                !s.done && <button disabled>{s.waiting}</button>
              )}
            </div>
          </li>
        ))}
      </ol>
      {!demoLoaded && (
        <p className="muted getting-started-demo">
          ¿Querés ver cómo queda antes de cargar nada?{' '}
          <button className="link-button" onClick={loadDemo}>
            ▶ Ver un ejemplo
          </button>
        </p>
      )}
    </section>
  );
}
