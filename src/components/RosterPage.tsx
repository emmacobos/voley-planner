import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAppStore } from '../store';
import { POSITIONS } from '../domain/types';
import type { Position } from '../domain/types';

export function RosterPage() {
  const players = useAppStore((s) => s.players);
  const addPlayer = useAppStore((s) => s.addPlayer);
  const updatePlayer = useAppStore((s) => s.updatePlayer);
  const removePlayer = useAppStore((s) => s.removePlayer);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [position, setPosition] = useState<Position>('punta');

  const sorted = [...players].sort((a, b) => a.number - b.number);
  const numberTaken = players.some((p) => p.number === Number(number));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || number === '') return;
    addPlayer({ name: name.trim(), number: Number(number), position });
    setName('');
    setNumber('');
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Plantel</h1>
        <span className="muted">{players.length} jugadores</span>
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
          Agregar
        </button>
        {numberTaken && <span className="warning">Ese número ya está en uso.</span>}
      </form>

      {sorted.length === 0 ? (
        <p className="muted">Cargá a tus jugadores para usarlos en las rotaciones y ver sus nombres en la pizarra.</p>
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
    </div>
  );
}
