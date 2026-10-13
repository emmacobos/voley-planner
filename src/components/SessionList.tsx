import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';
import { formatDate, formatMinutes, sessionDuration, todayISO } from '../domain/sessions';
import type { TrainingSession } from '../domain/types';
import { GettingStarted } from './GettingStarted';

export function SessionList() {
  const sessions = useAppStore((s) => s.sessions);
  const squads = useAppStore((s) => s.squads);
  const createSession = useAppStore((s) => s.createSession);
  const duplicateSession = useAppStore((s) => s.duplicateSession);
  const removeSession = useAppStore((s) => s.removeSession);

  const today = todayISO();
  const byDate = (a: TrainingSession, b: TrainingSession) => (a.date + a.time).localeCompare(b.date + b.time);
  const upcoming = sessions.filter((s) => s.date >= today).sort(byDate);
  const past = sessions.filter((s) => s.date < today).sort((a, b) => byDate(b, a));

  const card = (s: TrainingSession) => (
    <article key={s.id} className="card" onClick={() => navigate(`/sesiones/${s.id}`)}>
      <div className="card-top">
        <span className="badge session-date">{formatDate(s.date)}</span>
        <span className="muted">{formatMinutes(sessionDuration(s))}</span>
      </div>
      <h2>{s.name}</h2>
      {s.objective && <p className="objective">{s.objective}</p>}
      <p className="muted small">
        {[
          squads.find((q) => q.id === s.squadId)?.name,
          s.time && `${s.time} h`,
          `${s.blocks.length} bloques`,
          `${s.playerIds.length} convocados`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <div className="card-actions" onClick={(ev) => ev.stopPropagation()}>
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

  return (
    <div className="page">
      <div className="page-header">
        <h1>Sesiones de entrenamiento</h1>
        <button className="primary" onClick={() => navigate(`/sesiones/${createSession()}`)}>
          + Nueva sesión
        </button>
      </div>

      {sessions.length === 0 ? (
        <GettingStarted />
      ) : (
        <>
          <h3 className="list-title">Próximas</h3>
          {upcoming.length ? <div className="cards">{upcoming.map(card)}</div> : <p className="muted">No hay sesiones próximas.</p>}
          {past.length > 0 && (
            <>
              <h3 className="list-title">Anteriores</h3>
              <div className="cards">{past.map(card)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}
