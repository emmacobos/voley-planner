import { useState } from 'react';
import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';
import { EXERCISE_TYPES, INTENSITIES } from '../domain/types';
import type { ExerciseType } from '../domain/types';

export function ExerciseList() {
  const exercises = useAppStore((s) => s.exercises);
  const createExercise = useAppStore((s) => s.createExercise);
  const duplicateExercise = useAppStore((s) => s.duplicateExercise);
  const removeExercise = useAppStore((s) => s.removeExercise);
  const [filter, setFilter] = useState<ExerciseType | 'todos'>('todos');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const visible = exercises.filter(
    (e) =>
      (filter === 'todos' || e.type === filter) &&
      (!q || e.name.toLowerCase().includes(q) || e.objective.toLowerCase().includes(q)),
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Biblioteca de ejercicios</h1>
        <button className="primary" onClick={() => navigate(`/ejercicios/${createExercise()}`)}>
          + Nuevo ejercicio
        </button>
      </div>

      <div className="filters">
        <input type="search" placeholder="Buscar por nombre u objetivo" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="segmented">
          <button className={filter === 'todos' ? 'active' : ''} onClick={() => setFilter('todos')}>
            Todos
          </button>
          {EXERCISE_TYPES.map((t) => (
            <button key={t.value} className={filter === t.value ? 'active' : ''} onClick={() => setFilter(t.value)} title={t.description}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {exercises.length === 0 ? (
        <div className="empty">
          <p>Todavía no hay ejercicios.</p>
          <p className="muted">
            Empezá cargando tu <a href="#/plantel">plantel</a> y después creá tu primer ejercicio.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <p className="muted">No hay ejercicios que coincidan con el filtro.</p>
      ) : (
        <div className="cards">
          {visible.map((e) => {
            const type = EXERCISE_TYPES.find((t) => t.value === e.type);
            return (
              <article key={e.id} className="card" onClick={() => navigate(`/ejercicios/${e.id}`)}>
                <div className="card-top">
                  <span className={`badge type-${e.type}`}>{type?.label}</span>
                  <span className="muted">{e.durationMin} min</span>
                </div>
                <h2>{e.name}</h2>
                {e.objective && <p className="objective">{e.objective}</p>}
                <p className="muted small">
                  Intensidad {INTENSITIES.find((i) => i.value === e.intensity)?.label.toLowerCase()} ·{' '}
                  {e.playerIds.length} jugadores · {e.frames.length} {e.frames.length === 1 ? 'paso' : 'pasos'}
                </p>
                <div className="card-actions" onClick={(ev) => ev.stopPropagation()}>
                  <button onClick={() => navigate(`/ejercicios/${duplicateExercise(e.id)}`)}>Duplicar</button>
                  <button
                    className="danger"
                    onClick={() => {
                      if (confirm(`¿Eliminar "${e.name}"?`)) removeExercise(e.id);
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
