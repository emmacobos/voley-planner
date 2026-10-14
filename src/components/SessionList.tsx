import { navigate } from '../hooks/useHashRoute';
import { hasData, useAppStore } from '../store';
import { formatDate, formatMinutes, minutesByType, sessionDuration, todayISO, weekSummary } from '../domain/sessions';
import { EXERCISE_TYPES } from '../domain/types';
import type { Exercise, ExerciseType, TrainingSession } from '../domain/types';
import { GettingStarted } from './GettingStarted';
import { HomeGreeting, HomeOverview } from './Home';
import { TemplateList } from './TemplateList';
import { Welcome } from './Welcome';

const parseDate = (date: string) => new Date(`${date}T00:00:00`);

/** Partes del "almanaque" de cada sesión: día de la semana, número, mes y año. */
function dateTile(date: string) {
  const d = parseDate(date);
  if (!date || Number.isNaN(d.getTime())) return null;
  const part = (opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('es-AR', opts).replace('.', '');
  return {
    weekday: part({ weekday: 'short' }),
    day: d.getDate(),
    month: part({ month: 'short' }),
    year: d.getFullYear(),
  };
}

function TypeBar({ byType, label }: { byType: Record<ExerciseType, number>; label: string }) {
  const total = EXERCISE_TYPES.reduce((s, t) => s + byType[t.value], 0);
  if (total === 0) return null;
  return (
    <div className="type-bar" role="img" aria-label={label}>
      {EXERCISE_TYPES.map((t) =>
        byType[t.value] ? <span key={t.value} className={`type-${t.value}`} style={{ flexGrow: byType[t.value] }} /> : null,
      )}
    </div>
  );
}

function WeekPanel({ sessions, exercisesById }: { sessions: TrainingSession[]; exercisesById: Map<string, Exercise> }) {
  const week = weekSummary(sessions, exercisesById);
  const today = todayISO();
  const next = [...sessions]
    .filter((s) => s.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const typed = EXERCISE_TYPES.reduce((s, t) => s + week.byType[t.value], 0);
  const range = `${parseDate(week.start).getDate()} al ${formatDate(week.end).replace(/^[^,]*, /, '')}`;

  return (
    <section className="week" aria-label="Resumen de la semana">
      <div className="stat-card">
        <span className="stat-label">Esta semana</span>
        <span className="stat-value">
          {week.sessions.length} {week.sessions.length === 1 ? 'sesión' : 'sesiones'}
        </span>
        <span className="stat-sub">Del {range}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Minutos planificados</span>
        <span className="stat-value">{formatMinutes(week.minutes)}</span>
        <span className="stat-sub">
          {week.sessions.length ? `Promedio ${formatMinutes(Math.round(week.minutes / week.sessions.length))} por sesión` : 'Sin sesiones esta semana'}
        </span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Reparto de la semana</span>
        {typed === 0 ? (
          <span className="stat-sub">Agregá ejercicios a las sesiones de esta semana para ver el reparto.</span>
        ) : (
          <>
            <TypeBar byType={week.byType} label="Minutos de la semana por tipo de ejercicio" />
            <ul className="legend">
              {EXERCISE_TYPES.map((t) => (
                <li key={t.value}>
                  <span className={`swatch type-${t.value}`} /> {t.label} {Math.round((week.byType[t.value] / typed) * 100)}%
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="stat-card">
        <span className="stat-label">Próxima sesión</span>
        {next ? (
          <>
            <a className="stat-link" href={`#/sesiones/${next.id}`}>
              {next.name}
            </a>
            <span className="stat-sub">
              {formatDate(next.date)}
              {next.time && ` · ${next.time} h`}
            </span>
          </>
        ) : (
          <span className="stat-sub">No hay sesiones próximas.</span>
        )}
      </div>
    </section>
  );
}

export function SessionList() {
  const sessions = useAppStore((s) => s.sessions);
  const squads = useAppStore((s) => s.squads);
  const exercises = useAppStore((s) => s.exercises);
  const duplicateSession = useAppStore((s) => s.duplicateSession);
  const removeSession = useAppStore((s) => s.removeSession);
  const anyData = useAppStore(hasData);

  const exercisesById = new Map(exercises.map((e) => [e.id, e]));
  const today = todayISO();
  const byDate = (a: TrainingSession, b: TrainingSession) => (a.date + a.time).localeCompare(b.date + b.time);
  const upcoming = sessions.filter((s) => s.date >= today).sort(byDate);
  const past = sessions.filter((s) => s.date < today).sort((a, b) => byDate(b, a));

  const card = (s: TrainingSession) => {
    const tile = dateTile(s.date);
    return (
      <article key={s.id} className="session-card" onClick={() => navigate(`/sesiones/${s.id}`)}>
        <div className="date-tile" title={formatDate(s.date)}>
          {tile ? (
            <>
              <span className="date-weekday">{tile.weekday}</span>
              <span className="date-day">{tile.day}</span>
              <span className="date-month">
                {tile.month} {tile.year}
              </span>
            </>
          ) : (
            <span className="date-month">Sin fecha</span>
          )}
        </div>
        <div className="session-card-body">
          <div className="session-card-top">
            <h2>{s.name}</h2>
            <span className="session-duration">{formatMinutes(sessionDuration(s))}</span>
          </div>
          {s.objective && <p className="objective">{s.objective}</p>}
          <div className="session-card-meta">
            {[
              squads.find((q) => q.id === s.squadId)?.name,
              s.time && `${s.time} h`,
              `${s.blocks.length} bloques`,
              `${s.playerIds.length} convocados`,
            ]
              .filter(Boolean)
              .map((text) => (
                <span key={text as string} className="meta-pill">
                  {text}
                </span>
              ))}
            <TypeBar byType={minutesByType(s, exercisesById)} label="Minutos por tipo de ejercicio" />
          </div>
        </div>
        <div className="session-card-actions" onClick={(ev) => ev.stopPropagation()}>
          <button onClick={() => navigate(`/sesiones/${duplicateSession(s.id)}`)}>Duplicar</button>
          <button onClick={() => navigate(`/sesiones/${s.id}/imprimir`)}>PDF</button>
          <button
            className="danger"
            onClick={() => {
              if (confirm(`¿Eliminar la sesión "${s.name}"?`)) removeSession(s.id);
            }}
          >
            Eliminar
          </button>
        </div>
      </article>
    );
  };

  // Sin nada cargado: portada de bienvenida y primeros pasos.
  if (!anyData) {
    return (
      <div className="page">
        <Welcome />
        <GettingStarted />
      </div>
    );
  }

  return (
    <div className="page">
      {sessions.length === 0 ? (
        <>
          <div className="page-header">
            <h1>Sesiones de entrenamiento</h1>
          </div>
          {/* Sin sesiones, la guía de primeros pasos indica qué hacer primero. */}
          <GettingStarted />
        </>
      ) : (
        <>
          <HomeGreeting sessions={sessions} exercisesById={exercisesById} />
          <HomeOverview sessions={sessions} exercisesById={exercisesById} />
          <WeekPanel sessions={sessions} exercisesById={exercisesById} />
          <h3 className="list-title">Próximas</h3>
          {upcoming.length ? (
            <div className="session-list">{upcoming.map(card)}</div>
          ) : (
            <p className="muted">No hay sesiones próximas.</p>
          )}
          {past.length > 0 && (
            <>
              <h3 className="list-title">Anteriores</h3>
              <div className="session-list">{past.map(card)}</div>
            </>
          )}
          <TemplateList />
        </>
      )}
    </div>
  );
}
