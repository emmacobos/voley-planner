import { useState } from 'react';
import { daysUntil } from '../domain/calendar';
import { useAuth } from '../cloud/state';
import { blockDuration, formatMinutes, sessionDuration, sessionIntensity, todayISO, weekSummary } from '../domain/sessions';
import { BLOCK_KINDS, INTENSITIES } from '../domain/types';
import type { BlockKind, Exercise, TrainingSession } from '../domain/types';
import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';
import { NewSessionButton } from './NewSessionButton';
import { backupIsDue } from '../utils/backupReminder';

/** Colores de cada tipo de bloque (los mismos que en el editor de sesiones). */
const BLOCK_COLORS: Record<BlockKind, string> = {
  calentamiento: '#b07a3c',
  tecnica: '#3e4a5a',
  tactica: '#7a2232',
  juego: '#6d7b4e',
  'vuelta-calma': '#8f8676',
  otro: '#b5ab9b',
};

const TIPS = [
  'colocá K1 recepción y K1 ataque en dos pasos y tocá Reproducir para ver la transición.',
  'con la herramienta Sombra de bloqueo marcás la zona que tapa el bloqueo; en la animación lo acompaña.',
  'tocá un jugador y usá el globito para dejarle un comentario, como "Se desplaza a 1".',
  'duplicá una sesión que te gustó para usarla de base la semana siguiente.',
  'en el editor de ejercicios podés cambiar el sistema de juego a 4-2 o 6-0 para tus categorías formativas.',
  'Exportar PDF arma la hoja de la sesión con las pizarras, lista para imprimir o mandar.',
];

const parseDate = (date: string) => new Date(`${date}T00:00:00`);

/** "Hola, Emma 👋" con la fecha de hoy y cuántas sesiones hay en la semana. */
export function HomeGreeting({ sessions, exercisesById }: { sessions: TrainingSession[]; exercisesById: Map<string, Exercise> }) {
  const user = useAuth((s) => s.user);
  const matches = useAppStore((s) => s.matches);
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const [now] = useState(() => new Date());
  const today = now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const week = weekSummary(sessions, exercisesById).sessions.length;
  const nextMatch = matches
    .filter((m) => m.date >= todayISO(now))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const inDays = nextMatch ? daysUntil(nextMatch.date, now) : null;

  return (
    <div className="hello">
      <div>
        <h1>{firstName ? `Hola, ${firstName} 👋` : 'Hola 👋'}</h1>
        <p>
          {today.charAt(0).toUpperCase() + today.slice(1)} ·{' '}
          {week === 0
            ? 'No tenés sesiones esta semana.'
            : `Esta semana tenés ${week} ${week === 1 ? 'sesión planificada' : 'sesiones planificadas'}.`}
        </p>
        {nextMatch && inDays !== null && inDays <= 14 && (
          <a className="next-match" href={`#/partidos/${nextMatch.id}`}>
            🏐 Próximo partido vs <b>{nextMatch.opponent || 'rival'}</b>{' '}
            {inDays === 0 ? 'hoy' : inDays === 1 ? 'mañana' : `en ${inDays} días`}
            {nextMatch.time && ` · ${nextMatch.time} h`} · {nextMatch.home ? 'Local' : 'Visitante'}
          </a>
        )}
      </div>
      <NewSessionButton />
    </div>
  );
}

function ActionIcon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Próxima sesión con sus bloques, accesos rápidos y lo que hay en la biblioteca. */
export function HomeOverview({ sessions, exercisesById }: { sessions: TrainingSession[]; exercisesById: Map<string, Exercise> }) {
  const squads = useAppStore((s) => s.squads);
  const players = useAppStore((s) => s.players.length);
  const exercises = useAppStore((s) => s.exercises.length);
  const createExercise = useAppStore((s) => s.createExercise);
  const createSession = useAppStore((s) => s.createSession);

  const today = todayISO();
  const next = sessions
    .filter((s) => s.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const [tip] = useState(() => TIPS[new Date().getDate() % TIPS.length]);
  const user = useAuth((s) => s.user);
  const [remindBackup] = useState(backupIsDue);

  return (
    <div className="home-grid">
      <section className="home-card">
        <h2>Próxima sesión</h2>
        {next ? (
          <>
            <div className="next-session" onClick={() => navigate(`/sesiones/${next.id}`)}>
              <NextDate date={next.date} />
              <div>
                <h3>{next.name}</h3>
                <div className="muted">
                  {[
                    squads.find((q) => q.id === next.squadId)?.name,
                    next.time && `${next.time} h`,
                    formatMinutes(sessionDuration(next)),
                    `${next.playerIds.length} convocados`,
                    intensityLabel(next, exercisesById),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            </div>
            <BlockBar session={next} />
          </>
        ) : (
          <p className="muted">No tenés sesiones próximas. Armá la siguiente con "+ Nueva sesión".</p>
        )}
        <div className="quick-actions">
          {next ? (
            <button onClick={() => navigate(`/sesiones/${next.id}`)}>
              <ActionIcon d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 2v4M16 2v4M3 10h18" />
              Abrir sesión
            </button>
          ) : (
            <button onClick={() => navigate(`/sesiones/${createSession()}`)}>
              <ActionIcon d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 2v4M16 2v4M3 10h18" />
              + Nueva sesión
            </button>
          )}
          <button onClick={() => navigate(`/ejercicios/${createExercise()}`)}>
            <ActionIcon d="M3 5h18v14H3zM12 5v14" />+ Nuevo ejercicio
          </button>
          <button onClick={() => navigate('/plantel')}>
            <ActionIcon d="M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M17.5 11.5a2.5 2.5 0 1 0 0-5M17 14.6c2.3.3 3.9 2 4.5 4.9" />
            Ver planteles
          </button>
        </div>
      </section>

      <section className="home-card">
        <h2>Tu biblioteca</h2>
        <div className="home-stats">
          <div className="home-stat">
            <b>{sessions.length}</b>
            <span>{sessions.length === 1 ? 'sesión' : 'sesiones'}</span>
          </div>
          <div className="home-stat">
            <b>{exercises}</b>
            <span>{exercises === 1 ? 'ejercicio' : 'ejercicios'}</span>
          </div>
          <div className="home-stat">
            <b>{squads.length}</b>
            <span>{squads.length === 1 ? 'plantel' : 'planteles'}</span>
          </div>
          <div className="home-stat">
            <b>{players}</b>
            <span>jugadores</span>
          </div>
        </div>
        {!user && remindBackup ? (
          <p className="home-tip">
            💾 <b>Tus datos están solo en este navegador.</b> <a href="#/datos">Descargá una copia de seguridad</a> o entrá
            con tu cuenta para guardarlos en la nube.
          </p>
        ) : (
          <p className="home-tip">
            💡 <b>Tip:</b> {tip}
          </p>
        )}
      </section>
    </div>
  );
}

function NextDate({ date }: { date: string }) {
  const d = parseDate(date);
  if (Number.isNaN(d.getTime())) return <div className="date-tile"><span className="date-month">Sin fecha</span></div>;
  const part = (opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('es-AR', opts).replace('.', '');
  return (
    <div className="date-tile">
      <span className="date-weekday">{part({ weekday: 'short' })}</span>
      <span className="date-day">{d.getDate()}</span>
      <span className="date-month">{part({ month: 'short' })}</span>
    </div>
  );
}

function intensityLabel(session: TrainingSession, exercisesById: Map<string, Exercise>): string | undefined {
  const value = sessionIntensity(session, exercisesById);
  const label = INTENSITIES.find((i) => i.value === value)?.label;
  return label ? `Intensidad ${label.toLowerCase()}` : undefined;
}

/** Barra con los bloques de la sesión, proporcional a sus minutos. */
function BlockBar({ session }: { session: TrainingSession }) {
  const blocks = session.blocks.filter((b) => blockDuration(b) > 0);
  if (!blocks.length) return null;
  return (
    <>
      <div className="block-bar" role="img" aria-label="Bloques de la sesión">
        {blocks.map((b) => (
          <i key={b.id} style={{ flex: blockDuration(b), background: BLOCK_COLORS[b.kind] }} title={`${b.title}: ${blockDuration(b)} min`} />
        ))}
      </div>
      <ul className="block-legend">
        {blocks.map((b) => (
          <li key={b.id}>
            <i style={{ background: BLOCK_COLORS[b.kind] }} />
            {b.title || BLOCK_KINDS.find((k) => k.value === b.kind)?.label} {blockDuration(b)}'
          </li>
        ))}
      </ul>
    </>
  );
}
