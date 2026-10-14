import { useState } from 'react';
import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';
import { EXERCISE_TYPES, INTENSITIES } from '../domain/types';
import type { ExerciseType } from '../domain/types';
import { GettingStarted } from './GettingStarted';

export function ExerciseList() {
  const exercises = useAppStore((s) => s.exercises);
  const createExercise = useAppStore((s) => s.createExercise);
  const duplicateExercise = useAppStore((s) => s.duplicateExercise);
  const removeExercise = useAppStore((s) => s.removeExercise);
  const [filter, setFilter] = useState<ExerciseType | 'todos'>('todos');
  const [query, setQuery] = useState('');

  // Los filtros aparecen a medida que hay ejercicios: el buscador desde 2 y
  // los tipos cuando hay ejercicios de más de un tipo.
  const typesInUse = EXERCISE_TYPES.filter((t) => exercises.some((e) => e.type === t.value));
  const showSearch = exercises.length >= 2;
  const showTypes = typesInUse.length >= 2;
  const activeFilter = showTypes && typesInUse.some((t) => t.value === filter) ? filter : 'todos';
  const q = showSearch ? query.trim().toLowerCase() : '';
  const visible = exercises.filter(
    (e) =>
      (activeFilter === 'todos' || e.type === activeFilter) &&
      (!q || e.name.toLowerCase().includes(q) || e.objective.toLowerCase().includes(q)),
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Biblioteca de ejercicios</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/ejercicios/modelos')} title="Ejercicios clásicos listos para copiar y adaptar">
            Ejercicios modelo
          </button>
          {/* Sin ejercicios, la guía de primeros pasos indica qué hacer primero. */}
          {exercises.length > 0 && (
            <button className="primary" onClick={() => navigate(`/ejercicios/${createExercise()}`)}>
              + Nuevo ejercicio
            </button>
          )}
        </div>
      </div>

      {(showSearch || showTypes) && (
        <div className="filters">
          {showSearch && (
            <input
              type="search"
              placeholder="Buscar por nombre u objetivo"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          {showTypes && (
            <div className="segmented">
              <button className={activeFilter === 'todos' ? 'active' : ''} onClick={() => setFilter('todos')}>
                Todos ({exercises.length})
              </button>
              {typesInUse.map((t) => (
                <button
                  key={t.value}
                  className={activeFilter === t.value ? 'active' : ''}
                  onClick={() => setFilter(t.value)}
                  title={t.description}
                >
                  {t.label} ({exercises.filter((e) => e.type === t.value).length})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {exercises.length === 0 ? (
        <GettingStarted />
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
