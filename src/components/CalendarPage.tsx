import { useState } from 'react';
import { isoWeek, monthWeeks } from '../domain/calendar';
import { formatMinutes, sessionDuration, todayISO } from '../domain/sessions';
import type { Match, TrainingSession } from '../domain/types';
import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';
import { MatchDialog } from './MatchDialog';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Calendario del mes: sesiones, partidos y el objetivo de cada semana (microciclo). */
export function CalendarPage() {
  const squads = useAppStore((s) => s.squads);
  const allSessions = useAppStore((s) => s.sessions);
  const allMatches = useAppStore((s) => s.matches);
  const weeks = useAppStore((s) => s.weeks);
  const createSession = useAppStore((s) => s.createSession);
  const updateSession = useAppStore((s) => s.updateSession);
  const createMatch = useAppStore((s) => s.createMatch);
  const updateMatch = useAppStore((s) => s.updateMatch);
  const removeMatch = useAppStore((s) => s.removeMatch);
  const setWeekObjective = useAppStore((s) => s.setWeekObjective);

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [squadFilter, setSquadFilter] = useState<string | null>(null);
  // Con un solo plantel, todo es de ese plantel.
  const squadId = squadFilter ?? (squads.length === 1 ? squads[0].id : null);
  const [openMatch, setOpenMatch] = useState<string | null>(null);
  const [addingOn, setAddingOn] = useState<string | null>(null);

  const today = todayISO();
  const inSquad = (x: { squadId: string | null }) => squadId === null || x.squadId === squadId;
  const sessions = allSessions.filter(inSquad);
  const matches = allMatches.filter(inSquad);
  const grid = monthWeeks(cursor.year, cursor.month);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const match = allMatches.find((m) => m.id === openMatch);

  const moveMonth = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const addSession = (date: string) => {
    const id = createSession();
    updateSession(id, { date, ...(squadId ? { squadId } : {}) });
    navigate(`/sesiones/${id}`);
  };
  const addMatch = (date: string) => {
    setAddingOn(null);
    setOpenMatch(createMatch(date, squadId ?? squads[0]?.id ?? null));
  };
  const closeMatch = () => {
    // Un partido nuevo sin rival se descarta al cerrar.
    if (match && !match.opponent.trim() && !match.notes.trim()) removeMatch(match.id);
    setOpenMatch(null);
  };

  const byTime = (a: { date: string; time: string }, b: { date: string; time: string }) =>
    (a.date + a.time).localeCompare(b.date + b.time);

  return (
    <div className="page calendar-page">
      <div className="page-header">
        <h1>Calendario</h1>
        <div className="calendar-actions">
          {squads.length > 1 && (
            <select value={squadFilter ?? ''} onChange={(e) => setSquadFilter(e.target.value || null)} aria-label="Plantel">
              <option value="">Todos los planteles</option>
              {squads.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          )}
          <button onClick={() => addMatch(today)}>+ Partido</button>
          <button className="primary" onClick={() => addSession(today)}>
            + Sesión
          </button>
        </div>
      </div>

      <div className="calendar-nav">
        <button className="icon-button" onClick={() => moveMonth(-1)} aria-label="Mes anterior">
          ‹
        </button>
        <h2>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</h2>
        <button className="icon-button" onClick={() => moveMonth(1)} aria-label="Mes siguiente">
          ›
        </button>
        <button
          onClick={() => {
            const d = new Date();
            setCursor({ year: d.getFullYear(), month: d.getMonth() });
          }}
        >
          Hoy
        </button>
        <span className="calendar-legend">
          <span className="chip-sample session-chip">Sesión</span>
          <span className="chip-sample match-chip">Partido</span>
        </span>
      </div>

      <div className="table-scroll">
        <div className="calendar-grid" role="grid" aria-label={monthLabel}>
          <div className="calendar-head week-col">Semana</div>
          {WEEKDAYS.map((d) => (
            <div key={d} className="calendar-head">
              {d}
            </div>
          ))}
          {grid.map((week) => {
            const start = week[0];
            const end = week[6];
            const weekSessions = sessions.filter((s) => s.date >= start && s.date <= end);
            const minutes = weekSessions.reduce((sum, s) => sum + sessionDuration(s), 0);
            const plan = weeks.find((w) => w.weekStart === start && w.squadId === squadId);
            return [
              <div key={`w-${start}`} className={`week-cell${today >= start && today <= end ? ' current' : ''}`}>
                <span className="week-number">Sem. {isoWeek(start)}</span>
                <span className="week-stats">
                  {weekSessions.length ? `${weekSessions.length} ses. · ${formatMinutes(minutes)}` : 'Sin sesiones'}
                </span>
                <textarea
                  className="week-objective"
                  rows={2}
                  placeholder="Objetivo de la semana…"
                  value={plan?.objective ?? ''}
                  onChange={(e) => setWeekObjective(start, squadId, e.target.value)}
                  aria-label={`Objetivo de la semana ${isoWeek(start)}`}
                />
              </div>,
              ...week.map((day) => {
                const date = new Date(`${day}T00:00:00`);
                const daySessions = sessions.filter((s) => s.date === day).sort(byTime);
                const dayMatches = matches.filter((m) => m.date === day).sort(byTime);
                const outside = date.getMonth() !== cursor.month;
                return (
                  <div
                    key={day}
                    className={`day-cell${outside ? ' outside' : ''}${day === today ? ' today' : ''}${day < today ? ' past' : ''}`}
                  >
                    <div className="day-top">
                      <span className="day-number">{date.getDate()}</span>
                      <button
                        className="day-add"
                        onClick={() => setAddingOn(addingOn === day ? null : day)}
                        aria-label={`Agregar el ${date.getDate()}`}
                        aria-expanded={addingOn === day}
                      >
                        +
                      </button>
                    </div>
                    {addingOn === day && (
                      <div className="day-menu">
                        <button onClick={() => addSession(day)}>+ Sesión</button>
                        <button onClick={() => addMatch(day)}>+ Partido</button>
                      </div>
                    )}
                    {dayMatches.map((m) => (
                      <MatchChip key={m.id} match={m} onOpen={() => setOpenMatch(m.id)} />
                    ))}
                    {daySessions.map((s) => (
                      <SessionChip key={s.id} session={s} />
                    ))}
                  </div>
                );
              }),
            ];
          })}
        </div>
      </div>
      <p className="hint">
        Tocá el + de un día para agregar una sesión o un partido. Escribí el objetivo de cada semana (por ejemplo "Semana
        de recepción" o "Descarga antes del partido") en la columna de la izquierda.
      </p>

      {match && (
        <MatchDialog
          match={match}
          squads={squads}
          onChange={(patch) => updateMatch(match.id, patch)}
          onRemove={() => {
            removeMatch(match.id);
            setOpenMatch(null);
          }}
          onClose={closeMatch}
        />
      )}
    </div>
  );
}

function SessionChip({ session }: { session: TrainingSession }) {
  return (
    <button className="cal-chip session-chip" onClick={() => navigate(`/sesiones/${session.id}`)} title={session.name}>
      {session.time && <b>{session.time}</b>} {session.name}
    </button>
  );
}

function MatchChip({ match, onOpen }: { match: Match; onOpen: () => void }) {
  return (
    <button className="cal-chip match-chip" onClick={onOpen} title={`Partido vs ${match.opponent}`}>
      🏐 {match.time && <b>{match.time}</b>} vs {match.opponent || 'rival'}
      {match.result && <span className="chip-result"> · {match.result}</span>}
    </button>
  );
}
