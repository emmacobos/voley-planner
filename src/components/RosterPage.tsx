import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAppStore } from '../store';
import { POSITIONS } from '../domain/types';
import type { Position } from '../domain/types';

export function RosterPage() {
  const squads = useAppStore((s) => s.squads);
  const allPlayers = useAppStore((s) => s.players);
  const addSquad = useAppStore((s) => s.addSquad);
  const renameSquad = useAppStore((s) => s.renameSquad);
  const removeSquad = useAppStore((s) => s.removeSquad);
  const addPlayer = useAppStore((s) => s.addPlayer);
  const updatePlayer = useAppStore((s) => s.updatePlayer);
  const removePlayer = useAppStore((s) => s.removePlayer);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newSquad, setNewSquad] = useState('');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [position, setPosition] = useState<Position>('punta');

  const squad = squads.find((q) => q.id === selectedId) ?? squads[0];
  const players = squad ? allPlayers.filter((p) => p.squadId === squad.id) : [];
  const sorted = [...players].sort((a, b) => a.number - b.number);
  const numberTaken = players.some((p) => p.number === Number(number));

  const createSquad = (e: FormEvent) => {
    e.preventDefault();
    if (!newSquad.trim()) return;
    setSelectedId(addSquad(newSquad.trim()));
    setNewSquad('');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!squad || !name.trim() || number === '') return;
    addPlayer({ squadId: squad.id, name: name.trim(), number: Number(number), position });
    setName('');
    setNumber('');
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Planteles</h1>
      </div>

      <div className="squad-bar">
        {squads.length > 0 && (
          <div className="segmented squad-tabs">
            {squads.map((q) => (
              <button key={q.id} className={q.id === squad?.id ? 'active' : ''} onClick={() => setSelectedId(q.id)}>
                {q.name} <span className="muted">({allPlayers.filter((p) => p.squadId === q.id).length})</span>
              </button>
            ))}
          </div>
        )}
        <form className="inline-form" onSubmit={createSquad}>
          <input
            placeholder={squads.length ? 'Nuevo plantel' : 'Nombre del plantel (ej.: Primera femenina)'}
            value={newSquad}
            onChange={(e) => setNewSquad(e.target.value)}
          />
          <button type="submit" disabled={!newSquad.trim()}>
            + Crear plantel
          </button>
        </form>
      </div>

      {!squad ? (
        <div className="empty">
          <p>Todavía no tenés planteles.</p>
          <p className="muted">Creá uno por equipo o categoría, por ejemplo "Primera femenina" o "Sub 18".</p>
        </div>
      ) : (
        <>
          <div className="squad-header">
            <input
              className="title-input"
              value={squad.name}
              onChange={(e) => renameSquad(squad.id, e.target.value)}
              aria-label="Nombre del plantel"
            />
            <button
              className="danger"
              onClick={() => {
                if (confirm(`¿Eliminar el plantel "${squad.name}" y sus ${players.length} jugadores?`)) {
                  removeSquad(squad.id);
                  setSelectedId(null);
                }
              }}
            >
              Eliminar plantel
            </button>
          </div>

          <form className="add-player" onSubmit={submit}>
            <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
            <input
              type="number"
              placeholder="Número"
              min={0}
              max={99}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
            />
            <select value={position} onChange={(e) => setPosition(e.target.value as Position)}>
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <button className="primary" type="submit">
              Agregar jugador
            </button>
            {numberTaken && <span className="warning">Ese número ya está en uso en este plantel.</span>}
          </form>

          {sorted.length === 0 ? (
            <p className="muted">Cargá a los jugadores para usarlos en las formaciones y ver sus nombres en la pizarra.</p>
          ) : (
            <table className="roster">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Nombre</th>
                  <th>Posición</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <input
                        type="number"
                        className="num"
                        min={0}
                        max={99}
                        value={p.number}
                        onChange={(e) => updatePlayer(p.id, { number: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <input value={p.name} onChange={(e) => updatePlayer(p.id, { name: e.target.value })} />
                    </td>
                    <td>
                      <select value={p.position} onChange={(e) => updatePlayer(p.id, { position: e.target.value as Position })}>
                        {POSITIONS.map((pos) => (
                          <option key={pos.value} value={pos.value}>
                            {pos.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="danger"
                        onClick={() => {
                          if (confirm(`¿Eliminar a ${p.name}?`)) removePlayer(p.id);
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
