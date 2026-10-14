import { useState } from 'react';
import { playerLoadReports } from '../domain/load';
import { ageOn } from '../domain/players';
import { keyNumbers, playerMatches, sumStats, totalAttendance, weeklyLoads } from '../domain/playerProfile';
import { formatDate } from '../domain/sessions';
import { newId } from '../domain/ids';
import { POSITIONS } from '../domain/types';
import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';

const show = (n: number | null | undefined, suffix = '') => (n === null || n === undefined ? '—' : `${n}${suffix}`);
const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${Number(d)}/${Number(m)}`;
};

/** Ficha de una jugadora: asistencia, carga, estadísticas, objetivos y notas. */
export function PlayerPage({ id }: { id: string }) {
  const player = useAppStore((s) => s.players.find((p) => p.id === id));
  const squads = useAppStore((s) => s.squads);
  const sessions = useAppStore((s) => s.sessions);
  const matches = useAppStore((s) => s.matches);
  const updatePlayer = useAppStore((s) => s.updatePlayer);
  const [goal, setGoal] = useState('');
  const [today] = useState(() => new Date());

  if (!player) {
    return (
      <div className="empty">
        <p>No se encontró la jugadora.</p>
        <button onClick={() => navigate('/plantel')}>Volver a planteles</button>
      </div>
    );
  }

  const squad = squads.find((s) => s.id === player.squadId);
  const position = POSITIONS.find((p) => p.value === player.position)?.label ?? player.position;
  const age = ageOn(player.birthDate);
  const report = playerLoadReports([player], sessions, today)[0];
  const weeks = weeklyLoads(player.id, sessions, today, 8);
  const maxLoad = Math.max(1, ...weeks.map((w) => w.load));
  const season = totalAttendance(player.id, sessions, today);
  const lines = playerMatches(player.id, matches);
  const total = lines.length ? keyNumbers(sumStats(player.id, lines.map((l) => l.stats))) : null;
  const goals = player.goals ?? [];
  const setGoals = (next: typeof goals) => updatePlayer(player.id, { goals: next });

  const addGoal = () => {
    const text = goal.trim();
    if (!text) return;
    setGoals([...goals, { id: newId(), text, done: false }]);
    setGoal('');
  };

  return (
    <div className="page player-page">
      <div className="exercise-header">
        <button className="link" onClick={() => navigate('/plantel')}>
          ← Planteles
        </button>
      </div>

      <section className="player-hero">
        <span className="player-number">{player.number}</span>
        <div>
          <h1>{player.name}</h1>
          <p className="muted">
            {position}
            {squad && ` · ${squad.name}`}
            {age !== null && ` · ${age} años`}
            {player.phone && ` · ${player.phone}`}
          </p>
        </div>
      </section>

      {report.alerts.length > 0 && (
        <ul className="player-alerts">
          {report.alerts.map((a) => (
            <li key={a}>⚠ {a}</li>
          ))}
        </ul>
      )}

      <div className="stats-cards">
        <article>
          <span>Asistencia (4 semanas)</span>
          <b>{show(report.attendanceRate, ' %')}</b>
          <small>
            {report.attended} de {report.called} sesiones
          </small>
        </article>
        <article>
          <span>Asistencia (temporada)</span>
          <b>{show(season.rate, ' %')}</b>
          <small>
            {season.attended} de {season.called} sesiones
          </small>
        </article>
        <article>
          <span>Carga de esta semana</span>
          <b>{report.weekLoad} UA</b>
          <small>Promedio anterior: {report.prevAvgLoad} UA</small>
        </article>
        {total && (
          <article>
            <span>Puntos por partido</span>
            <b>{(total.points / lines.length).toFixed(1)}</b>
            <small>
              {total.points} puntos en {lines.length} {lines.length === 1 ? 'partido' : 'partidos'}
            </small>
          </article>
        )}
      </div>

      <div className="player-grid">
        <section className="panel">
          <h2>Carga semanal</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            Esfuerzo × minutos de cada semana (UA). Las semanas sin registro quedan vacías.
          </p>
          <div className="load-chart" role="img" aria-label="Carga de las últimas 8 semanas">
            {weeks.map((w, i) => (
              <div key={w.weekStart} className={`load-col${i === weeks.length - 1 ? ' current' : ''}`}>
                <em>{w.load || ''}</em>
                <i style={{ height: `${(w.load / maxLoad) * 100}%` }} />
                <span>{shortDate(w.weekStart)}</span>
                <small>{w.called ? `${w.attended}/${w.called}` : '—'}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Objetivos personales</h2>
          <ul className="goal-list">
            {goals.map((g) => (
              <li key={g.id} className={g.done ? 'done' : ''}>
                <label>
                  <input
                    type="checkbox"
                    checked={g.done}
                    onChange={() => setGoals(goals.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)))}
                  />
                  <span>{g.text}</span>
                </label>
                <button
                  className="icon-button"
                  aria-label="Quitar objetivo"
                  title="Quitar"
                  onClick={() => setGoals(goals.filter((x) => x.id !== g.id))}
                >
                  ×
                </button>
              </li>
            ))}
            {!goals.length && <li className="muted">Todavía no hay objetivos.</li>}
          </ul>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              addGoal();
            }}
          >
            <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ej.: recepción en zona 1 con el antebrazo" />
            <button type="submit" disabled={!goal.trim()}>
              + Agregar
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Notas del cuerpo técnico</h2>
          <textarea
            rows={5}
            value={player.notes ?? ''}
            onChange={(e) => updatePlayer(player.id, { notes: e.target.value || undefined })}
            placeholder="Lesiones, disponibilidad, cómo viene, charlas pendientes…"
            aria-label="Notas del cuerpo técnico"
          />
        </section>
      </div>

      <section className="panel">
        <h2>Estadísticas en partidos</h2>
        {lines.length ? (
          <div className="table-scroll">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Partido</th>
                  <th title="Puntos ganados (ataque, saque y bloqueo)">Pts</th>
                  <th title="Errores que dieron punto al rival">Err</th>
                  <th title="Saques: total / aces / errores">Saque</th>
                  <th title="Recepción positiva (perfectas + buenas)">Recep. +</th>
                  <th title="Ataques: total / puntos">Ataque</th>
                  <th title="Eficacia de ataque">Ef. ataque</th>
                  <th title="Puntos de bloqueo">Bloq.</th>
                </tr>
              </thead>
              <tbody>
                {lines.map(({ match, stats }) => {
                  const k = keyNumbers(stats);
                  return (
                    <tr key={match.id}>
                      <th scope="row">
                        <a href={`#/partidos/${match.id}/estadisticas`}>
                          {formatDate(match.date)} · vs {match.opponent || 'rival'}
                        </a>
                      </th>
                      <td className="strong">{k.points}</td>
                      <td>{k.errors}</td>
                      <td>{k.serve.total ? `${k.serve.total} / ${k.serve.main} / ${k.serve.errors}` : '—'}</td>
                      <td>{show(k.reception.positive, '%')}</td>
                      <td>{k.attack.total ? `${k.attack.total} / ${k.attack.main}` : '—'}</td>
                      <td>{show(k.attack.efficiency, '%')}</td>
                      <td>{k.block.main || '—'}</td>
                    </tr>
                  );
                })}
                {total && lines.length > 1 && (
                  <tr className="total-row">
                    <th scope="row">Total</th>
                    <td className="strong">{total.points}</td>
                    <td>{total.errors}</td>
                    <td>{total.serve.total ? `${total.serve.total} / ${total.serve.main} / ${total.serve.errors}` : '—'}</td>
                    <td>{show(total.reception.positive, '%')}</td>
                    <td>{total.attack.total ? `${total.attack.total} / ${total.attack.main}` : '—'}</td>
                    <td>{show(total.attack.efficiency, '%')}</td>
                    <td>{total.block.main || '—'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Todavía no tiene estadísticas. Se cargan desde cada partido, con <b>Anotar estadísticas</b>.
          </p>
        )}
      </section>
    </div>
  );
}
