import { useState } from 'react';
import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';
import { EXERCISE_TYPES, INTENSITIES, positionLabel } from '../domain/types';
import type { ExerciseType, Intensity } from '../domain/types';
import { CONTENTS, exerciseContents } from '../domain/season';
import { MAIN_COURT, MAX_COURTS, courtLabel, cutToHalfCourt, exerciseCourts, halfCourtLosses, updateCourt } from '../domain/courts';
import { newId } from '../domain/ids';
import { emptyFrame } from '../store';
import { groupAtCourt } from '../domain/stations';
import { BoardEditor } from './BoardEditor';
import { GroupBadge, GroupsPanel, RotationControls } from './GroupsPanel';

export function ExerciseEditor({ id }: { id: string }) {
  const exercise = useAppStore((s) => s.exercises.find((e) => e.id === id));
  const allPlayers = useAppStore((s) => s.players);
  const squads = useAppStore((s) => s.squads);
  const updateExercise = useAppStore((s) => s.updateExercise);
  /** Cancha que se está editando. */
  const [active, setActive] = useState<string>(MAIN_COURT);
  /** Todas las canchas a la vista, una al lado de la otra (se edita la que se toca). */
  const [together, setTogether] = useState(false);
  /** Vuelta del circuito (qué grupo está en cada cancha). */
  const [round, setRound] = useState(0);

  if (!exercise) {
    return (
      <div className="empty">
        <p>No se encontró el ejercicio.</p>
        <button onClick={() => navigate('/ejercicios')}>Volver a la biblioteca</button>
      </div>
    );
  }

  const update = (patch: Parameters<typeof updateExercise>[1]) => updateExercise(id, patch);
  const roster = allPlayers.filter((p) => p.squadId === exercise.squadId);
  const exercisePlayers = roster.filter((p) => exercise.playerIds.includes(p.id));
  const sortedRoster = [...roster].sort((a, b) => a.number - b.number);
  const contents = exerciseContents(exercise);
  const courts = exerciseCourts(exercise);
  const courtIndex = Math.max(0, courts.findIndex((c) => c.id === active));
  const court = courts[courtIndex];
  const showAll = together && courts.length > 1;
  const namesShown = courts.every((c) => !c.teamNames?.hidden);
  /** Mostrar u ocultar "Equipo A / B" en todas las canchas a la vez. */
  const setNamesShown = (show: boolean) => {
    const names = (t?: { A?: string; B?: string; hidden?: boolean }) => ({ ...t, hidden: show ? undefined : true });
    update({
      teamNames: names(exercise.teamNames),
      ...(exercise.extraCourts ? { extraCourts: exercise.extraCourts.map((c) => ({ ...c, teamNames: names(c.teamNames) })) } : {}),
    });
  };
  const setCourt = (patch: Parameters<typeof updateCourt>[2]) => update(updateCourt(exercise, court.id, patch));
  const addCourt = () => {
    const id = newId();
    update({ extraCourts: [...(exercise.extraCourts ?? []), { id, name: '', objective: '', frames: [emptyFrame()] }] });
    setActive(id);
    // Con dos o más canchas, se empieza viéndolas juntas.
    setTogether(true);
  };
  const groupPlayers = exercisePlayers;
  const rounds = courts.length;
  const currentRound = round % Math.max(1, rounds);
  const badges = exercise.groups?.length
    ? Object.fromEntries(
        courts.map((c, i) => [
          c.id,
          <GroupBadge key={c.id} group={groupAtCourt(exercise.groups!, courts.length, currentRound, i)} players={allPlayers} />,
        ]),
      )
    : undefined;
  /** Pasar a media cancha: si hay cosas del otro lado de la red, se avisa antes de borrarlas. */
  const toHalf = () => {
    if (court.half) return;
    const losses = halfCourtLosses(court.frames);
    if (losses > 0) {
      const side = court.teamNames?.B?.trim() || 'Equipo B';
      const ok = confirm(
        `¿Seguro que querés pasar ${courtLabel(court, courtIndex)} a media cancha?\n\n` +
          `Se va a borrar la mitad de "${side}" (el otro lado de la red): ` +
          `${losses} ${losses === 1 ? 'elemento' : 'elementos'} en todos los pasos.`,
      );
      if (!ok) return;
    }
    setCourt({ half: true, frames: cutToHalfCourt(court.frames).frames });
  };
  const removeCourt = () => {
    if (!confirm(`¿Borrar ${courtLabel(court, courtIndex)} con su jugada?`)) return;
    update({ extraCourts: (exercise.extraCourts ?? []).filter((c) => c.id !== court.id) });
    setActive(MAIN_COURT);
  };

  const togglePlayer = (pid: string) =>
    update({
      playerIds: exercise.playerIds.includes(pid)
        ? exercise.playerIds.filter((x) => x !== pid)
        : [...exercise.playerIds, pid],
    });

  return (
    <div className="exercise-editor">
      <div className="exercise-header">
        <button className="link" onClick={() => navigate('/ejercicios')}>
          ← Biblioteca
        </button>
        <input
          className="title-input"
          value={exercise.name}
          onChange={(e) => update({ name: e.target.value })}
          aria-label="Nombre del ejercicio"
        />
      </div>

      <details className="exercise-meta" open={exercise.frames.every((f) => f.elements.length === 0)}>
        <summary>Datos del ejercicio</summary>
        <div className="meta-grid">
          <label className="field">
            Tipo
            <select value={exercise.type} onChange={(e) => update({ type: e.target.value as ExerciseType })}>
              {EXERCISE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} — {t.description}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Duración (min)
            <input
              type="number"
              min={1}
              max={240}
              value={exercise.durationMin}
              onChange={(e) => update({ durationMin: Math.max(0, Number(e.target.value)) })}
            />
          </label>
          <label className="field">
            Intensidad
            <select value={exercise.intensity} onChange={(e) => update({ intensity: e.target.value as Intensity })}>
              {INTENSITIES.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field span-2">
            Objetivo
            <input
              value={exercise.objective}
              placeholder="Ej.: mejorar la recepción en zona 1 ante saque flotado"
              onChange={(e) => update({ objective: e.target.value })}
            />
          </label>
          <label className="field span-3">
            Notas / consignas
            <textarea
              rows={3}
              value={exercise.notes}
              placeholder="Reglas, variantes, puntuación, organización…"
              onChange={(e) => update({ notes: e.target.value })}
            />
          </label>
          <label className="field">
            Plantel
            <select
              value={exercise.squadId ?? ''}
              onChange={(e) => {
                const squadId = e.target.value || null;
                const inSquad = new Set(allPlayers.filter((p) => p.squadId === squadId).map((p) => p.id));
                update({ squadId, playerIds: exercise.playerIds.filter((pid) => inSquad.has(pid)) });
              }}
            >
              <option value="">— Sin plantel —</option>
              {squads.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          </label>
          <div className="field span-3">
            Qué se trabaja
            <div className="chips">
              {CONTENTS.map((c) => {
                const on = contents.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    className={`chip${on ? ' on' : ''}`}
                    aria-pressed={on}
                    onClick={() => update({ contents: on ? contents.filter((x) => x !== c.value) : [...contents, c.value] })}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            {!exercise.contents?.length && (
              <span className="hint">
                {contents.length ? 'Deducido del nombre y el objetivo; tocá para ajustarlo.' : 'Marcalo para medir cuánto se entrena cada cosa en la temporada.'}
              </span>
            )}
          </div>
          <div className="field span-3">
            Jugadores del ejercicio
            {squads.length === 0 ? (
              <p className="hint">
                Todavía no creaste planteles. <a href="#/plantel">Crear plantel</a>
              </p>
            ) : roster.length === 0 ? (
              <p className="hint">
                {exercise.squadId ? 'Este plantel no tiene jugadores todavía. ' : 'Elegí un plantel. '}
                <a href="#/plantel">Ir a planteles</a>
              </p>
            ) : (
              <div className="player-picker">
                {sortedRoster.map((p) => (
                  <label key={p.id} className={`chip${exercise.playerIds.includes(p.id) ? ' on' : ''}`}>
                    <input type="checkbox" checked={exercise.playerIds.includes(p.id)} onChange={() => togglePlayer(p.id)} />
                    <b>{p.number}</b> {p.name} <span className="muted">· {positionLabel(p.position)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </details>

      <div className="courts-bar">
        <div className="segmented" role="tablist" aria-label="Canchas">
          {courts.map((c, i) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={!showAll && c.id === court.id}
              className={!showAll && c.id === court.id ? 'active' : ''}
              onClick={() => {
                setActive(c.id);
                setTogether(false);
              }}
            >
              {courtLabel(c, i)}
            </button>
          ))}
          {courts.length > 1 && (
            <button role="tab" aria-selected={showAll} className={showAll ? 'active' : ''} onClick={() => setTogether(true)}>
              ▶ Todas juntas
            </button>
          )}
        </div>
        {showAll && (
          <label className="check">
            <input type="checkbox" checked={namesShown} onChange={(e) => setNamesShown(e.target.checked)} /> Nombres de los
            equipos en las canchas
          </label>
        )}
        {courts.length < MAX_COURTS && (
          <button onClick={addCourt} title="Otra cancha al lado, para trabajar en estaciones al mismo tiempo">
            + Agregar cancha
          </button>
        )}
      </div>

      {courts.length > 1 && (
        <details className="groups-details" open={!!exercise.groups?.length}>
          <summary>
            Grupos que rotan
            {exercise.groups?.length ? ` · ${exercise.groups.length} grupos · vuelta ${currentRound + 1} de ${rounds}` : ''}
          </summary>
          <GroupsPanel
            groups={exercise.groups}
            players={groupPlayers}
            courtLabels={courts.map((c, i) => courtLabel(c, i))}
            round={currentRound}
            onRound={setRound}
            minutes={exercise.stationMinutes}
            onChange={(groups) => update({ groups })}
            onMinutesChange={(stationMinutes) => update({ stationMinutes })}
            picker={
              squads.length === 0 ? (
                <p className="hint">
                  Todavía no cargaste jugadoras. <a href="#/plantel">Cargá tu plantel</a> y volvé.
                </p>
              ) : (
                <div className="groups-picker">
                  <label className="field">
                    Plantel
                    <select
                      value={exercise.squadId ?? ''}
                      onChange={(e) => {
                        const squadId = e.target.value || null;
                        // Al elegir el plantel se marcan todas sus jugadoras (después se pueden desmarcar).
                        update({ squadId, playerIds: allPlayers.filter((p) => p.squadId === squadId).map((p) => p.id) });
                      }}
                    >
                      <option value="">— Elegí el plantel —</option>
                      {squads.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {exercise.squadId && (
                    <>
                      <div className="row">
                        <span className="muted">
                          {exercisePlayers.length} de {roster.length} marcadas
                        </span>
                        <button className="link-button" onClick={() => update({ playerIds: roster.map((p) => p.id) })}>
                          Marcar todas
                        </button>
                        <button className="link-button" onClick={() => update({ playerIds: [] })}>
                          Ninguna
                        </button>
                      </div>
                      <div className="player-picker">
                        {sortedRoster.map((p) => (
                          <label key={p.id} className={`chip${exercise.playerIds.includes(p.id) ? ' on' : ''}`}>
                            <input type="checkbox" checked={exercise.playerIds.includes(p.id)} onChange={() => togglePlayer(p.id)} />
                            <b>{p.number}</b> {p.name}
                          </label>
                        ))}
                        {!roster.length && <span className="muted">Este plantel no tiene jugadoras todavía.</span>}
                      </div>
                    </>
                  )}
                </div>
              )
            }
          />
        </details>
      )}

      <div className="court-settings">
        {courts.length > 1 && (
          <>
            <input
              value={court.name ?? ''}
              onChange={(e) => setCourt({ name: e.target.value })}
              placeholder={`Cancha ${courtIndex + 1}: nombre (ej.: Saque y recepción)`}
              aria-label="Nombre de la cancha"
            />
            <input
              value={court.objective ?? ''}
              onChange={(e) => setCourt({ objective: e.target.value })}
              placeholder="Objetivo de esta cancha"
              aria-label="Objetivo de la cancha"
            />
          </>
        )}
        <div className="segmented" role="group" aria-label="Tamaño de la cancha">
          <button className={!court.half ? 'active' : ''} aria-pressed={!court.half} onClick={() => setCourt({ half: false })}>
            Cancha entera
          </button>
          <button
            className={court.half ? 'active' : ''}
            aria-pressed={!!court.half}
            onClick={toHalf}
            title="Solo un lado de la red: para trabajos de un solo equipo"
          >
            Media cancha
          </button>
        </div>
        {court.id !== MAIN_COURT && (
          <button className="danger" onClick={removeCourt}>
            Borrar cancha
          </button>
        )}
      </div>

      <BoardEditor
        key={exercise.id}
        courtId={court.id}
        courtLabel={courtLabel(court, courtIndex)}
        courtPosition={courtIndex}
        others={
          showAll
            ? courts
                .map((c, i) => ({ id: c.id, label: courtLabel(c, i), position: i, frames: c.frames, half: c.half, teamNames: c.teamNames }))
                .filter((c) => c.id !== court.id)
            : undefined
        }
        onActivate={setActive}
        courtBadges={badges}
        overviewControls={
          exercise.groups?.length ? <RotationControls round={currentRound} rounds={rounds} onRound={setRound} /> : undefined
        }
        frames={court.frames}
        onChange={(frames) => setCourt({ frames })}
        allPlayers={allPlayers}
        roster={roster}
        exercisePlayers={exercisePlayers}
        title={courts.length > 1 && !showAll ? `${exercise.name} · ${courtLabel(court, courtIndex)}` : exercise.name}
        system={exercise.system}
        onSystemChange={(system) => update({ system })}
        teamNames={court.teamNames}
        onTeamNamesChange={(teamNames) => setCourt({ teamNames })}
        half={court.half}
      />
    </div>
  );
}
