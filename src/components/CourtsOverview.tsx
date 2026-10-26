import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { elementsAtProgress } from '../domain/animation';
import { courtLabel, courtProgress, sharedStepCount } from '../domain/courts';
import type { Court } from '../domain/courts';
import type { Player } from '../domain/types';
import { useBoardOrientation } from '../utils/boardOrientation';
import { Board } from './Board';

const TRANSITION_MS = 1200;
const noop = () => {};

/**
 * Todas las canchas del ejercicio una al lado de la otra, reproduciéndose a la
 * vez (paso 1 de todas, después paso 2…). Las que tienen menos pasos quedan
 * quietas en el último.
 */
export function CourtsOverview({
  courts,
  players,
  onOpen,
  badges,
  controls,
}: {
  courts: Court[];
  players: Player[];
  onOpen: (id: string) => void;
  /** Algo para mostrar arriba de cada cancha (por ejemplo, el grupo que está ahí). */
  badges?: Record<string, ReactNode>;
  /** Controles extra en la barra (por ejemplo, rotar grupos). */
  controls?: ReactNode;
}) {
  const vertical = useBoardOrientation((s) => s.vertical);
  const steps = sharedStepCount(courts);
  const last = steps - 1;
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);

  const progressRef = useRef(progress);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    progressRef.current = progress;
  });

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (time: number) => {
      const next = Math.min(last, progressRef.current + Math.max(0, time - prev) / TRANSITION_MS);
      prev = time;
      progressRef.current = next;
      setProgress(next);
      if (next >= last) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, last]);

  const index = Math.round(progress);
  const play = () => {
    if (playing) return setPlaying(false);
    if (progress >= last) {
      progressRef.current = 0;
      setProgress(0);
    }
    setPlaying(true);
  };
  const go = (step: number) => {
    setPlaying(false);
    setProgress(step);
  };

  return (
    <div className="courts-overview" ref={rootRef}>
      <div className="frames">
        <button className="primary play-button" onClick={play} disabled={last === 0}>
          {playing ? '❚❚ Detener' : progress >= last && last > 0 ? '↺ Reproducir de nuevo' : '▶ Reproducir todas'}
        </button>
        <div className="presentation-dots overview-dots" role="group" aria-label="Pasos">
          {Array.from({ length: steps }, (_, i) => (
            <button key={i} className={i === index ? 'active' : ''} onClick={() => go(i)} aria-label={`Paso ${i + 1}`}>
              {i + 1}
            </button>
          ))}
        </div>
        {controls}
        <button
          onClick={() => rootRef.current?.requestFullscreen?.().catch(() => {})}
          title="Ver las canchas a pantalla completa (por ejemplo en una tele)"
        >
          Pantalla completa
        </button>
      </div>
      <div className={`courts-grid count-${courts.length}`}>
        {courts.map((court, i) => {
          const p = courtProgress(court, progress);
          const step = Math.min(index, court.frames.length - 1);
          return (
            <section key={court.id} className="court-card">
              <header>
                <b>{courtLabel(court, i)}</b>
                <button className="link-button" onClick={() => onOpen(court.id)}>
                  Editar
                </button>
              </header>
              {court.objective && <p className="court-objective">{court.objective}</p>}
              {badges?.[court.id]}
              <Board
                elements={elementsAtProgress(
                  court.frames.map((f) => f.elements),
                  p,
                )}
                players={players}
                selectedId={null}
                tool="select"
                readOnly
                showZones
                vertical={vertical}
                half={court.half}
                teamNames={court.teamNames}
                onSelect={noop}
                onUpdate={noop}
                onAddArrow={noop}
              />
              <p className="court-note">
                Paso {step + 1} de {court.frames.length}
                {court.frames[step]?.note && ` · ${court.frames[step].note}`}
              </p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
