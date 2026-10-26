import { useState } from 'react';
import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';
import { blockDuration, formatDate, formatMinutes } from '../domain/sessions';
import { EXERCISE_TYPES, INTENSITIES, SITUATIONS, positionLabel } from '../domain/types';
import type { Exercise, Player } from '../domain/types';
import { courtLabel, exerciseCourts } from '../domain/courts';
import { Board } from './Board';
import { SessionSummary } from './SessionSummary';

const MAX_FRAMES = 4;
const noop = () => {};

/** Versión imprimible de la sesión: se guarda como PDF desde el diálogo de impresión. */
export function SessionPrint({ id }: { id: string }) {
  const session = useAppStore((s) => s.sessions.find((x) => x.id === id));
  const squads = useAppStore((s) => s.squads);
  const allPlayers = useAppStore((s) => s.players);
  const exercises = useAppStore((s) => s.exercises);
  const [withBoards, setWithBoards] = useState(true);

  if (!session) {
    return (
      <div className="empty">
        <p>No se encontró la sesión.</p>
        <button onClick={() => navigate('/sesiones')}>Volver a las sesiones</button>
      </div>
    );
  }

  const exercisesById = new Map(exercises.map((e) => [e.id, e]));
  const playersById = new Map(allPlayers.map((p) => [p.id, p]));
  const sortPlayers = (ids: string[]) =>
    ids
      .map((pid) => playersById.get(pid))
      .filter((p): p is Player => !!p)
      .sort((a, b) => a.number - b.number);
  const called = sortPlayers(session.playerIds);
  const squad = squads.find((q) => q.id === session.squadId);

  return (
    <div className="print-page">
      <div className="print-toolbar no-print">
        <button className="link" onClick={() => navigate(`/sesiones/${id}`)}>
          ← Volver a la sesión
        </button>
        <label className="check">
          <input type="checkbox" checked={withBoards} onChange={(e) => setWithBoards(e.target.checked)} /> Incluir pizarras
        </label>
        <button className="primary" onClick={() => window.print()}>
          Imprimir / Guardar PDF
        </button>
        <span className="hint">En el diálogo de impresión elegí "Guardar como PDF".</span>
      </div>

      <article className="print-sheet">
        <header className="print-header">
          <h1>{session.name}</h1>
          <p className="print-when">
            {formatDate(session.date)}
            {session.time && ` · ${session.time} h`}
            {squad && ` · ${squad.name}`}
          </p>
          {session.objective && (
            <p>
              <b>Objetivo:</b> {session.objective}
            </p>
          )}
          {session.notes && <p className="pre">{session.notes}</p>}
        </header>

        <div className="print-top">
          <SessionSummary session={session} exercisesById={exercisesById} />
          {called.length > 0 && (
            <section className="panel">
              <h3>Convocados ({called.length})</h3>
              <table className="roster print-roster">
                <tbody>
                  {called.map((p) => (
                    <tr key={p.id}>
                      <td>{p.number}</td>
                      <td>{p.name}</td>
                      <td className="muted">{positionLabel(p.position)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        {session.blocks.map((block, i) => {
          const players = sortPlayers(block.playerIds);
          return (
            <section key={block.id} className="print-block">
              <h2>
                {i + 1}. {block.title} <span className="muted">· {formatMinutes(blockDuration(block))}</span>
              </h2>
              {players.length > 0 && (
                <p className="print-players">
                  <b>Jugadores:</b>{' '}
                  {players.map((p) => `${p.number} ${p.name} (${positionLabel(p.position)})`).join(', ')}
                </p>
              )}
              {block.notes && <p className="pre">{block.notes}</p>}
              {block.items.map((item) => {
                const ex = exercisesById.get(item.exerciseId);
                return ex ? (
                  <PrintExercise
                    key={item.id}
                    exercise={ex}
                    durationMin={item.durationMin}
                    players={allPlayers}
                    withBoards={withBoards}
                  />
                ) : null;
              })}
            </section>
          );
        })}
      </article>
    </div>
  );
}

function PrintExercise({
  exercise,
  durationMin,
  players,
  withBoards,
}: {
  exercise: Exercise;
  durationMin: number;
  players: Player[];
  withBoards: boolean;
}) {
  const courts = exerciseCourts(exercise);
  return (
    <div className="print-exercise">
      <h3 className="print-exercise-title">
        {exercise.name}{' '}
        <span className="muted">
          · {EXERCISE_TYPES.find((t) => t.value === exercise.type)?.label} · {durationMin} min · intensidad{' '}
          {INTENSITIES.find((i) => i.value === exercise.intensity)?.label.toLowerCase()}
        </span>
      </h3>
      {exercise.objective && (
        <p>
          <b>Objetivo:</b> {exercise.objective}
        </p>
      )}
      {exercise.notes && <p className="pre">{exercise.notes}</p>}
      {withBoards &&
        courts.map((court, i) => {
          const frames = court.frames.filter((f) => f.elements.length > 0);
          const shown = frames.slice(0, MAX_FRAMES);
          if (!shown.length) return null;
          return (
            <div key={court.id}>
              {courts.length > 1 && (
                <h4 className="print-court-title">
                  {courtLabel(court, i)}
                  {court.objective && <span className="muted"> · {court.objective}</span>}
                </h4>
              )}
              <div className={`print-boards count-${shown.length}`}>
                {shown.map((f) => (
                  <figure key={f.id} className="print-board">
                    <Board
                      elements={f.elements}
                      players={players}
                      selectedId={null}
                      tool="select"
                      readOnly
                      showZones={false}
                      teamNames={court.teamNames}
                      half={court.half}
                      onSelect={noop}
                      onUpdate={noop}
                      onAddArrow={noop}
                    />
                    <figcaption>
                      Paso {court.frames.indexOf(f) + 1}
                      {f.situation && f.situation !== 'juego' && ` · ${SITUATIONS.find((x) => x.value === f.situation)?.label}`}
                      {f.note && ` · ${f.note}`}
                    </figcaption>
                  </figure>
                ))}
              </div>
              {frames.length > MAX_FRAMES && <p className="hint">Se muestran los primeros {MAX_FRAMES} de {frames.length} pasos.</p>}
            </div>
          );
        })}
    </div>
  );
}
