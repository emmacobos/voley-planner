import { useEffect, useState } from 'react';
import type { Player } from '../domain/types';
import { navigate } from '../hooks/useHashRoute';
import { decodePlay } from '../utils/sharePlay';
import type { SharedPlay } from '../utils/sharePlay';
import { Presentation } from './Presentation';

/** Jugada abierta desde un link compartido: se ve animada, sin cuenta. */
export function SharedPlayPage({ code }: { code: string }) {
  const [play, setPlay] = useState<SharedPlay | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    decodePlay(code)
      .then((p) => alive && setPlay(p))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [code]);

  if (error) {
    return (
      <div className="empty">
        <p>Este link de jugada no se pudo abrir: puede estar cortado. Pedile a quien te lo mandó que lo copie de nuevo.</p>
        <button onClick={() => navigate('/')}>Ir a Voley Planner</button>
      </div>
    );
  }
  if (!play) return <p className="muted page-loading">Cargando la jugada…</p>;

  const players = play.players.map((p) => ({ ...p, squadId: '' }) as Player);
  return (
    <Presentation
      title={play.title || 'Jugada'}
      frames={play.frames}
      players={players}
      teamNames={play.teamNames}
      fullscreen={false}
      onClose={() => navigate('/')}
      footer={
        <p className="presentation-credit">
          Jugada compartida con <a href="#/">Voley Planner</a> · pizarra táctica de vóley
        </p>
      }
    />
  );
}
