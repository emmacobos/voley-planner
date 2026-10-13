import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';
import { newId } from '../domain/ids';
import { blockDuration, formatMinutes, newBlock } from '../domain/sessions';
import { BLOCK_KINDS, EXERCISE_TYPES, positionLabel } from '../domain/types';
import type { BlockItem, BlockKind, Exercise, Player, SessionBlock, TrainingSession } from '../domain/types';
import { SessionSummary } from './SessionSummary';

export function SessionEditor({ id }: { id: string }) {
  const session = useAppStore((s) => s.sessions.find((x) => x.id === id));
  const squads = useAppStore((s) => s.squads);
  const allPlayers = useAppStore((s) => s.players);
  const exercises = useAppStore((s) => s.exercises);
  const updateSession = useAppStore((s) => s.updateSession);

  if (!session) {
    return (
      <div className="empty">
        <p>No se encontró la sesión.</p>
        <button onClick={() => navigate('/sesiones')}>Volver a las sesiones</button>
      </div>
    );
  }

  const update = (patch: Partial<Omit<TrainingSession, 'id'>>) => updateSession(id, patch);
  const squadPlayers = allPlayers
    .filter((p) => p.squadId === session.squadId)
    .sort((a, b) => a.number - b.number);
  const called = squadPlayers.filter((p) => session.playerIds.includes(p.id));
  const exercisesById = new Map(exercises.map((e) => [e.id, e]));

  const setBlocks = (fn: (blocks: SessionBlock[]) => SessionBlock[]) => update({ blocks: fn(session.blocks) });
  const updateBlock = (blockId: string, patch: Partial<SessionBlock>) =>
    setBlocks((bs) => bs.map((b) => (b.id === blockId ? { ...b, ...patch } : b)));

  const moveBlock = (index: number, delta: number) =>
    setBlocks((bs) => {
      const next = [...bs];
      const [b] = next.splice(index, 1);
      next.splice(index + delta, 0, b);
      return next;
    });

  const addBlock = (kind: BlockKind) => {
    const label = BLOCK_KINDS.find((k) => k.value === kind)!.label;
    setBlocks((bs) => [...bs, newBlock(kind, label, 15, [...session.playerIds])]);
  };

  /** Al convocar a alguien se lo suma a todos los bloques; al desconvocarlo se lo saca. */
  const toggleCalled = (pid: string) => {
    const isCalled = session.playerIds.includes(pid);
    update({
      playerIds: isCalled ? session.playerIds.filter((x) => x !== pid) : [...session.playerIds, pid],
      blocks: session.blocks.map((b) => ({
        ...b,
        playerIds: isCalled ? b.playerIds.filter((x) => x !== pid) : [...new Set([...b.playerIds, pid])],
      })),
    });
  };

  const changeSquad = (squadId: string | null) =>
    update({
      squadId,
      playerIds: [],
      blocks: session.blocks.map((b) => ({ ...b, playerIds: [] })),
    });

  return (
    <div className="session-editor">
      <div className="exercise-header">
        <button className="link" onClick={() => navigate('/sesiones')}>
          ← Sesiones
        </button>
        <input
          className="title-input"
          value={session.name}
          onChange={(e) => update({ name: e.target.value })}
          aria-label="Nombre de la sesión"
        />
        <button className="primary" onClick={() => navigate(`/sesiones/${id}/imprimir`)}>
          Exportar PDF
        </button>
      </div>

      <div className="session-layout">
        <div className="session-main">
          <section className="panel">
            <div className="meta-grid">
              <label className="field">
                Fecha
                <input type="date" value={session.date} onChange={(e) => update({ date: e.target.value })} />
              </label>
              <label className="field">
                Hora
                <input type="time" value={session.time} onChange={(e) => update({ time: e.target.value })} />
              </label>
              <label className="field">
                Plantel
                <select
                  value={session.squadId ?? ''}
                  onChange={(e) => {
                    const next = e.target.value || null;
                    if (session.playerIds.length && !confirm('Al cambiar de plantel se borran los convocados. ¿Seguir?')) return;
                    changeSquad(next);
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
              <label className="field span-3">
                Objetivo de la sesión
                <input
                  value={session.objective}
                  placeholder="Ej.: mejorar el side-out en R1 y R6"
                  onChange={(e) => update({ objective: e.target.value })}
                />
              </label>
              <label className="field span-3">
                Notas
                <textarea
                  rows={2}
                  value={session.notes}
                  placeholder="Material, organización, recordatorios…"
                  onChange={(e) => update({ notes: e.target.value })}
                />
              </label>
              <div className="field span-3">
                Convocados ({called.length})
                {!session.squadId ? (
                  <p className="hint">Elegí un plantel para convocar jugadores.</p>
                ) : squadPlayers.length === 0 ? (
                  <p className="hint">
                    Este plantel no tiene jugadores. <a href="#/plantel">Cargar jugadores</a>
                  </p>
                ) : (
                  <>
                    <PlayerChips players={squadPlayers} selected={session.playerIds} onToggle={toggleCalled} />
                    <div className="chip-actions">
                      <button
                        className="link"
                        onClick={() => {
                          const ids = squadPlayers.map((p) => p.id);
                          update({ playerIds: ids, blocks: session.blocks.map((b) => ({ ...b, playerIds: ids })) });
                        }}
                      >
                        Convocar a todos
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {session.blocks.map((block, i) => (
            <BlockCard
              key={block.id}
              block={block}
              index={i}
              total={session.blocks.length}
              called={called}
              exercises={exercises}
              exercisesById={exercisesById}
              onChange={(patch) => updateBlock(block.id, patch)}
              onMove={(delta) => moveBlock(i, delta)}
              onRemove={() => {
                if (confirm(`¿Eliminar el bloque "${block.title}"?`)) setBlocks((bs) => bs.filter((b) => b.id !== block.id));
              }}
            />
          ))}

          <div className="add-block">
            <span className="muted">Agregar bloque:</span>
            {BLOCK_KINDS.map((k) => (
              <button key={k.value} onClick={() => addBlock(k.value)}>
                + {k.label}
              </button>
            ))}
          </div>
        </div>

        <aside className="session-side">
          <SessionSummary session={session} exercisesById={exercisesById} />
        </aside>
      </div>
    </div>
  );
}

function PlayerChips({
  players,
  selected,
  onToggle,
}: {
  players: Player[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="player-picker">
      {players.map((p) => (
        <label key={p.id} className={`chip${selected.includes(p.id) ? ' on' : ''}`}>
          <input type="checkbox" checked={selected.includes(p.id)} onChange={() => onToggle(p.id)} />
          <b>{p.number}</b> {p.name} <span className="muted">· {positionLabel(p.position)}</span>
        </label>
      ))}
    </div>
  );
}

function BlockCard({
  block,
  index,
  total,
  called,
  exercises,
  exercisesById,
  onChange,
  onMove,
  onRemove,
}: {
  block: SessionBlock;
  index: number;
  total: number;
  called: Player[];
  exercises: Exercise[];
  exercisesById: Map<string, Exercise>;
  onChange: (patch: Partial<SessionBlock>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const setItems = (fn: (items: BlockItem[]) => BlockItem[]) => onChange({ items: fn(block.items) });
  const moveItem = (i: number, delta: number) =>
    setItems((items) => {
      const next = [...items];
      const [it] = next.splice(i, 1);
      next.splice(i + delta, 0, it);
      return next;
    });

  const addExercise = (exerciseId: string) => {
    const ex = exercisesById.get(exerciseId);
    if (!ex) return;
    setItems((items) => [...items, { id: newId(), exerciseId, durationMin: ex.durationMin }]);
  };

  const changeKind = (kind: BlockKind) => {
    const oldLabel = BLOCK_KINDS.find((k) => k.value === block.kind)?.label;
    const newLabel = BLOCK_KINDS.find((k) => k.value === kind)!.label;
    onChange({ kind, title: block.title === oldLabel ? newLabel : block.title });
  };

  return (
    <section className={`panel block block-${block.kind}`}>
      <div className="block-header">
        <span className="block-number">{index + 1}</span>
        <select value={block.kind} onChange={(e) => changeKind(e.target.value as BlockKind)} aria-label="Tipo de bloque">
          {BLOCK_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <input
          className="block-title"
          value={block.title}
          onChange={(e) => onChange({ title: e.target.value })}
          aria-label="Título del bloque"
        />
        {block.items.length === 0 ? (
          <label className="check">
            <input
              type="number"
              className="num"
              min={0}
              max={240}
              value={block.durationMin}
              onChange={(e) => onChange({ durationMin: Math.max(0, Number(e.target.value)) })}
              aria-label="Duración del bloque"
            />
            min
          </label>
        ) : (
          <strong className="block-duration">{formatMinutes(blockDuration(block))}</strong>
        )}
        <div className="block-actions">
          <button onClick={() => onMove(-1)} disabled={index === 0} title="Subir">
            ↑
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} title="Bajar">
            ↓
          </button>
          <button className="danger" onClick={onRemove} title="Eliminar bloque">
            ✕
          </button>
        </div>
      </div>

      {block.items.length > 0 && (
        <ol className="block-items">
          {block.items.map((item, i) => {
            const ex = exercisesById.get(item.exerciseId);
            const type = EXERCISE_TYPES.find((t) => t.value === ex?.type);
            return (
              <li key={item.id}>
                {ex ? (
                  <>
                    <span className={`badge type-${ex.type}`}>{type?.label}</span>
                    <a href={`#/ejercicios/${ex.id}`} className="item-name" title="Abrir el ejercicio">
                      {ex.name}
                    </a>
                  </>
                ) : (
                  <span className="item-name muted">Ejercicio eliminado</span>
                )}
                <label className="check">
                  <input
                    type="number"
                    className="num"
                    min={0}
                    max={240}
                    value={item.durationMin}
                    onChange={(e) =>
                      setItems((items) =>
                        items.map((x) => (x.id === item.id ? { ...x, durationMin: Math.max(0, Number(e.target.value)) } : x)),
                      )
                    }
                    aria-label="Duración del ejercicio"
                  />
                  min
                </label>
                <div className="block-actions">
                  <button onClick={() => moveItem(i, -1)} disabled={i === 0} title="Subir">
                    ↑
                  </button>
                  <button onClick={() => moveItem(i, 1)} disabled={i === block.items.length - 1} title="Bajar">
                    ↓
                  </button>
                  <button className="danger" onClick={() => setItems((items) => items.filter((x) => x.id !== item.id))} title="Quitar">
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <select
        className="add-exercise"
        value=""
        onChange={(e) => addExercise(e.target.value)}
        disabled={exercises.length === 0}
        aria-label="Agregar ejercicio"
      >
        <option value="">{exercises.length ? '+ Agregar ejercicio de la biblioteca…' : 'La biblioteca de ejercicios está vacía'}</option>
        {EXERCISE_TYPES.map((t) => {
          const group = exercises.filter((e) => e.type === t.value);
          return group.length ? (
            <optgroup key={t.value} label={t.label}>
              {group.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.durationMin} min)
                </option>
              ))}
            </optgroup>
          ) : null;
        })}
      </select>

      <div className="field">
        Jugadores del bloque ({block.playerIds.filter((pid) => called.some((p) => p.id === pid)).length} de {called.length})
        {called.length === 0 ? (
          <p className="hint">Primero convocá jugadores a la sesión.</p>
        ) : (
          <PlayerChips
            players={called}
            selected={block.playerIds}
            onToggle={(pid) =>
              onChange({
                playerIds: block.playerIds.includes(pid)
                  ? block.playerIds.filter((x) => x !== pid)
                  : [...block.playerIds, pid],
              })
            }
          />
        )}
      </div>

      <textarea
        className="block-notes"
        rows={1}
        value={block.notes}
        placeholder="Notas del bloque (grupos, rotaciones, consignas…)"
        onChange={(e) => onChange({ notes: e.target.value })}
      />
    </section>
  );
}
