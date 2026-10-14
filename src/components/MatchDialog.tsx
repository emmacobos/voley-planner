import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Match, Squad } from '../domain/types';

/** Ficha de un partido: rival, fecha, local/visitante, lugar, torneo, resultado y notas. */
export function MatchDialog({
  match,
  squads,
  onChange,
  onRemove,
  onClose,
  children,
}: {
  match: Match;
  squads: Squad[];
  onChange: (patch: Partial<Omit<Match, 'id'>>) => void;
  onRemove: () => void;
  onClose: () => void;
  /** Contenido extra (por ejemplo, el plan de partido). */
  children?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal match-dialog" role="dialog" aria-modal="true" aria-labelledby="match-title">
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <h2 id="match-title">{match.opponent ? `Partido vs ${match.opponent}` : 'Nuevo partido'}</h2>
        <div className="match-grid">
          <label className="field span-2">
            Rival
            <input
              autoFocus={!match.opponent}
              value={match.opponent}
              placeholder="Nombre del equipo rival"
              onChange={(e) => onChange({ opponent: e.target.value })}
            />
          </label>
          <label className="field">
            Fecha
            <input type="date" value={match.date} onChange={(e) => onChange({ date: e.target.value })} />
          </label>
          <label className="field">
            Hora
            <input type="time" value={match.time} onChange={(e) => onChange({ time: e.target.value })} />
          </label>
          <div className="field">
            Condición
            <div className="segmented" role="group" aria-label="Local o visitante">
              {[
                [true, 'Local'],
                [false, 'Visitante'],
              ].map(([home, label]) => (
                <button
                  key={label as string}
                  className={match.home === home ? 'active' : ''}
                  aria-pressed={match.home === home}
                  onClick={() => onChange({ home: home as boolean })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            Plantel
            <select value={match.squadId ?? ''} onChange={(e) => onChange({ squadId: e.target.value || null })}>
              <option value="">—</option>
              {squads.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Lugar
            <input value={match.venue} placeholder="Gimnasio" onChange={(e) => onChange({ venue: e.target.value })} />
          </label>
          <label className="field">
            Torneo
            <input
              value={match.competition}
              placeholder="Liga, copa…"
              onChange={(e) => onChange({ competition: e.target.value })}
            />
          </label>
          <label className="field">
            Resultado (sets)
            <input value={match.result} placeholder="Ej.: 3-1" maxLength={9} onChange={(e) => onChange({ result: e.target.value })} />
          </label>
          <label className="field span-2">
            Notas
            <textarea
              rows={2}
              value={match.notes}
              placeholder="Convocatoria, horario de llegada, viaje…"
              onChange={(e) => onChange({ notes: e.target.value })}
            />
          </label>
        </div>
        {children}
        <div className="modal-actions">
          <button
            className="danger"
            onClick={() => {
              if (confirm('¿Eliminar este partido?')) onRemove();
            }}
          >
            Eliminar
          </button>
          <button className="primary" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
