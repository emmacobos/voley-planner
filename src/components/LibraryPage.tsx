import { useState } from 'react';
import { LIBRARY } from '../domain/library';
import type { LibraryExercise } from '../domain/library';
import { EXERCISE_TYPES, INTENSITIES } from '../domain/types';
import type { ExerciseType } from '../domain/types';
import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';
import { Board } from './Board';
import { Presentation } from './Presentation';

const noop = () => {};

/** Ejercicios modelo: clásicos para ver animados y copiar a la biblioteca propia. */
export function LibraryPage() {
  const copy = useAppStore((s) => s.copyLibraryExercise);
  const [type, setType] = useState<ExerciseType | 'todos'>('todos');
  const [showing, setShowing] = useState<LibraryExercise | null>(null);
  const visible = LIBRARY.filter((e) => type === 'todos' || e.type === type);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="link" onClick={() => navigate('/ejercicios')}>
            ← Biblioteca
          </button>
          <h1>Ejercicios modelo</h1>
          <p className="muted">
            Ejercicios clásicos con su pizarra, consignas y variantes. Miralos animados y copialos a tu biblioteca para
            adaptarlos a tu equipo.
          </p>
        </div>
      </div>

      <div className="filters">
        <div className="segmented" role="group" aria-label="Tipo de ejercicio">
          {[{ value: 'todos' as const, label: 'Todos' }, ...EXERCISE_TYPES].map((t) => (
            <button key={t.value} className={type === t.value ? 'active' : ''} onClick={() => setType(t.value)} aria-pressed={type === t.value}>
              {t.label} ({t.value === 'todos' ? LIBRARY.length : LIBRARY.filter((e) => e.type === t.value).length})
            </button>
          ))}
        </div>
      </div>

      <div className="cards library-cards">
        {visible.map((e) => (
          <article key={e.key} className="card library-card">
            <div className="library-board" onClick={() => setShowing(e)} title="Ver animado">
              <Board
                elements={e.frames[0].elements}
                players={[]}
                selectedId={null}
                tool="select"
                readOnly
                showZones={false}
                onSelect={noop}
                onUpdate={noop}
                onAddArrow={noop}
              />
            </div>
            <div className="card-top">
              <span className={`badge type-${e.type}`}>{EXERCISE_TYPES.find((t) => t.value === e.type)?.label}</span>
              <span className="muted">{e.durationMin} min</span>
            </div>
            <h2>{e.name}</h2>
            <p className="objective">{e.objective}</p>
            <p className="muted small">
              Intensidad {INTENSITIES.find((i) => i.value === e.intensity)?.label.toLowerCase()} · {e.frames.length}{' '}
              {e.frames.length === 1 ? 'paso' : 'pasos'}
              {e.system && ` · Sistema ${e.system}`}
            </p>
            <details className="library-notes">
              <summary>Consignas y variantes</summary>
              <p>{e.notes}</p>
            </details>
            <div className="card-actions">
              <button onClick={() => setShowing(e)}>▶ Ver</button>
              <button className="primary" onClick={() => navigate(`/ejercicios/${copy(e)}`)}>
                Copiar a mi biblioteca
              </button>
            </div>
          </article>
        ))}
      </div>

      {showing && (
        <Presentation title={showing.name} frames={showing.frames} players={[]} onClose={() => setShowing(null)} />
      )}
    </div>
  );
}
