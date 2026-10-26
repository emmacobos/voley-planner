import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { newId } from '../domain/ids';
import { GROUP_COLORS, makeGroups, movePlayer, reshuffleGroups, rotationTable } from '../domain/stations';
import type { Player, StationGroup } from '../domain/types';

const firstName = (p?: Player) => (p ? p.name.split(' ')[0] || `#${p.number}` : '');

/** Chip con el grupo que está en una cancha (para mostrar arriba de cada cancha). */
export function GroupBadge({ group, players }: { group?: StationGroup; players: Player[] }) {
  if (!group) return <span className="group-badge empty">Sin grupo</span>;
  const names = group.playerIds.map((id) => firstName(players.find((p) => p.id === id))).filter(Boolean);
  return (
    <span className="group-badge" style={{ background: group.color }} title={names.join(', ')}>
      <b>{group.name}</b>
      {names.length > 0 && <small>{names.join(' · ')}</small>}
    </span>
  );
}

/** Botones para pasar de vuelta (se usan en el panel y en la presentación). */
export function RotationControls({
  round,
  rounds,
  onRound,
}: {
  round: number;
  rounds: number;
  onRound: (round: number) => void;
}) {
  return (
    <div className="rotation-controls">
      <button className="icon-button" onClick={() => onRound((round - 1 + rounds) % rounds)} aria-label="Vuelta anterior">
        ‹
      </button>
      <span>
        Vuelta <b>{round + 1}</b> de {rounds}
      </span>
      <button className="primary" onClick={() => onRound((round + 1) % rounds)} title="Cada grupo pasa a la cancha siguiente">
        Rotar grupos ↻
      </button>
    </div>
  );
}

/**
 * Grupos de un circuito por estaciones: se arman con las jugadoras del
 * ejercicio, cada uno arranca en una cancha y rota a la siguiente.
 */
export function GroupsPanel({
  groups,
  players,
  courtLabels,
  round,
  onRound,
  minutes,
  onChange,
  onMinutesChange,
  picker,
}: {
  groups: StationGroup[] | undefined;
  players: Player[];
  courtLabels: string[];
  round: number;
  onRound: (round: number) => void;
  minutes: number | undefined;
  onChange: (groups: StationGroup[] | undefined) => void;
  onMinutesChange: (minutes: number | undefined) => void;
  /** Para elegir el plantel y las jugadoras que participan, ahí mismo. */
  picker?: ReactNode;
}) {
  const courts = courtLabels.length;
  /** Jugadora que se está arrastrando a otro grupo (con el mouse o el dedo). */
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; sx: number; sy: number; over: string | null } | null>(null);
  const playerOf = (id: string) => players.find((p) => p.id === id);
  const assigned = new Set(groups?.flatMap((g) => g.playerIds) ?? []);
  const unassigned = players.filter((p) => !assigned.has(p.id));

  if (!groups?.length) {
    return (
      <section className="panel groups-panel">
        <h2>Grupos que rotan</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Repartí a las jugadoras en {courts} grupos, uno por cancha. En cada vuelta, cada grupo pasa a la cancha siguiente,
          como en un circuito.
        </p>
        <ol className="groups-steps">
          <li>Marcá las jugadoras que participan.</li>
          <li>
            Tocá <b>Armar grupos</b>: se reparten parejas por puesto (después las podés cambiar).
          </li>
        </ol>
        {picker}
        <button className="primary" disabled={players.length < courts} onClick={() => onChange(makeGroups(players, courts, newId))}>
          {players.length
            ? `Armar ${courts} grupos con las ${players.length} jugadoras`
            : `Armar ${courts} grupos`}
        </button>
        {players.length > 0 && players.length < courts && (
          <p className="hint">Marcá al menos {courts} jugadoras (una por grupo).</p>
        )}
      </section>
    );
  }

  /** Grupo que está debajo del puntero. */
  const groupAt = (x: number, y: number) =>
    (document.elementFromPoint(x, y)?.closest('[data-group]') as HTMLElement | null)?.dataset.group ?? null;
  /** Para agarrar una jugadora y soltarla en otro grupo. */
  const dragProps = (id: string) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ id, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, over: null });
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) =>
      setDrag((d) => (d && d.id === id ? { ...d, x: e.clientX, y: e.clientY, over: groupAt(e.clientX, e.clientY) } : d)),
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      const d = drag;
      setDrag(null);
      if (!d || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return;
      const over = groupAt(e.clientX, e.clientY);
      if (over) onChange(movePlayer(groups, id, over));
    },
    onPointerCancel: () => setDrag(null),
  });
  const moving = drag && Math.hypot(drag.x - drag.sx, drag.y - drag.sy) >= 5 ? drag : null;
  const rename = (id: string, name: string) => onChange(groups.map((g) => (g.id === id ? { ...g, name } : g)));
  const recolor = (id: string) =>
    onChange(
      groups.map((g) =>
        g.id === id ? { ...g, color: GROUP_COLORS[(GROUP_COLORS.indexOf(g.color) + 1) % GROUP_COLORS.length] } : g,
      ),
    );
  const table = rotationTable(groups, courts);

  return (
    <section className="panel groups-panel">
      <div className="groups-head">
        <h2>Grupos que rotan</h2>
        <RotationControls round={round} rounds={courts} onRound={onRound} />
      </div>

      <div className="groups-grid">
        {groups.map((g, i) => (
          <div
            key={g.id}
            data-group={g.id}
            className={`group-col${moving?.over === g.id ? ' drop-over' : ''}`}
            style={{ borderTopColor: g.color }}
          >
            <div className="group-title">
              <button
                className="group-color"
                style={{ background: g.color }}
                onClick={() => recolor(g.id)}
                aria-label="Cambiar color del grupo"
                title="Cambiar color"
              />
              <input value={g.name} onChange={(e) => rename(g.id, e.target.value)} aria-label={`Nombre del grupo ${i + 1}`} />
            </div>
            <small className="muted">
              Ahora en: <b>{courtLabels[(i + round) % courts]}</b>
            </small>
            <div className="group-players">
              {g.playerIds.map((id) => {
                const p = playerOf(id);
                return (
                  <button
                    key={id}
                    className={`chip drag-chip${moving?.id === id ? ' dragging' : ''}`}
                    title="Arrastrala a otro grupo"
                    {...dragProps(id)}
                  >
                    <b>{p?.number ?? '?'}</b> {firstName(p)}
                  </button>
                );
              })}
              {!g.playerIds.length && <span className="muted">Sin jugadoras</span>}
            </div>
          </div>
        ))}
      </div>
      {unassigned.length > 0 && (
        <p className="hint">
          Sin grupo:{' '}
          {unassigned.map((p) => (
            <button key={p.id} className={`chip drag-chip${moving?.id === p.id ? ' dragging' : ''}`} {...dragProps(p.id)}>
              <b>{p.number}</b> {firstName(p)}
            </button>
          ))}
        </p>
      )}
      <p className="hint">Arrastrá una jugadora a otro grupo para cambiarla. Tocá el color para cambiarlo.</p>
      {moving && (
        <span className="drag-ghost" style={{ left: moving.x, top: moving.y }} aria-hidden="true">
          <b>{playerOf(moving.id)?.number}</b> {firstName(playerOf(moving.id))}
        </span>
      )}

      <div className="groups-foot">
        <label className="field">
          Minutos por estación
          <input
            type="number"
            min={1}
            max={60}
            value={minutes ?? ''}
            placeholder="8"
            onChange={(e) => onMinutesChange(e.target.value ? Number(e.target.value) : undefined)}
          />
        </label>
        {minutes ? (
          <p>
            {courts} vueltas × {minutes} min = <b>{courts * minutes} min</b> en total
          </p>
        ) : null}
        <div className="row">
          <button onClick={() => onChange(reshuffleGroups(groups, players))} title="Mezcla distinto, parejo por puesto">
            Repartir de nuevo
          </button>
          <button
            className="danger"
            onClick={() => {
              if (confirm('¿Quitar los grupos?')) onChange(undefined);
            }}
          >
            Quitar grupos
          </button>
        </div>
      </div>

      <details className="rotation-table">
        <summary>Ver la rotación completa</summary>
        <table className="stats-table">
          <thead>
            <tr>
              <th>Vuelta</th>
              {courtLabels.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row, r) => (
              <tr key={r} className={r === round ? 'current' : ''}>
                <th scope="row">{r + 1}</th>
                {row.map((g, c) => (
                  <td key={c}>{g ? <span className="dot-label" style={{ ['--dot' as string]: g.color }}>{g.name}</span> : '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
