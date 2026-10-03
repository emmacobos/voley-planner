import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';
import { EXERCISE_TYPES, INTENSITIES, positionLabel } from '../domain/types';
import type { ExerciseType, Intensity } from '../domain/types';
import { BoardEditor } from './BoardEditor';

export function ExerciseEditor({ id }: { id: string }) {
  const exercise = useAppStore((s) => s.exercises.find((e) => e.id === id));
  const allPlayers = useAppStore((s) => s.players);
  const squads = useAppStore((s) => s.squads);
  const updateExercise = useAppStore((s) => s.updateExercise);

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

      <BoardEditor
        key={exercise.id}
        frames={exercise.frames}
        onChange={(frames) => update({ frames })}
        allPlayers={allPlayers}
        roster={roster}
        exercisePlayers={exercisePlayers}
        title={exercise.name}
      />
    </div>
  );
}
