import { useEffect, useRef, useState } from 'react';
import { elementsAtProgress } from '../domain/animation';
import type { Frame, Player } from '../domain/types';
import { Board } from './Board';

const TRANSITION_MS = 1200;
const noop = () => {};

/**
 * Pizarra a pantalla completa para mostrar la jugada en el gimnasio: botones
 * grandes, la descripción de cada paso y atajos de teclado.
 */
export function Presentation({
  title,
  frames,
  players,
  startAt = 0,
  onClose,
}: {
  title: string;
  frames: Frame[];
  players: Player[];
  startAt?: number;
  onClose: () => void;
}) {
  const last = frames.length - 1;
  const [progress, setProgress] = useState(Math.min(startAt, last));
  const [target, setTarget] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  const closeRef = useRef(onClose);
  useEffect(() => {
    progressRef.current = progress;
    closeRef.current = onClose;
  });

  const index = Math.round(progress);
  const moving = target !== null;
  const playingAll = moving && target === last && index < last;

  // Movimiento hacia el paso objetivo (adelante o atrás).
  useEffect(() => {
    if (target === null) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (time: number) => {
      const dt = Math.max(0, time - prev);
      prev = time;
      const p = progressRef.current;
      const delta = (dt * speed) / TRANSITION_MS;
      const next = p < target ? Math.min(target, p + delta) : Math.max(target, p - delta);
      progressRef.current = next;
      setProgress(next);
      if (next === target) {
        setTarget(null);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, speed]);

  const go = (step: number) => setTarget(Math.max(0, Math.min(last, step)));
  const nextStep = () => go(Math.floor(progress + 1e-6) + 1);
  const prevStep = () => go(Math.ceil(progress - 1e-6) - 1);
  const togglePlay = () => {
    if (playingAll) {
      setTarget(null);
      return;
    }
    if (progress >= last) {
      progressRef.current = 0;
      setProgress(0);
    }
    setTarget(last);
  };

  // Pantalla completa del navegador (si se puede) mientras está abierta.
  useEffect(() => {
    const el = rootRef.current;
    el?.requestFullscreen?.().catch(() => {});
    const onChange = () => {
      if (!document.fullscreenElement) closeRef.current();
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevStep();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const elements = elementsAtProgress(
    frames.map((f) => f.elements),
    progress,
  );
  const note = frames[index]?.note;

  return (
    <div className="presentation" ref={rootRef} role="dialog" aria-label={`Presentación: ${title}`}>
      <header className="presentation-top">
        <h2>{title}</h2>
        <button className="presentation-close" onClick={onClose} aria-label="Cerrar presentación" title="Cerrar (Esc)">
          ×
        </button>
      </header>

      <div className="presentation-board">
        <Board
          elements={elements}
          players={players}
          selectedId={null}
          tool="select"
          readOnly
          showZones
          onSelect={noop}
          onUpdate={noop}
          onAddArrow={noop}
        />
      </div>

      <p className="presentation-note">{note || `Paso ${index + 1}`}</p>

      <footer className="presentation-controls">
        <button className="presentation-step" onClick={prevStep} disabled={progress <= 0} aria-label="Paso anterior">
          ◀
        </button>
        <button className="primary presentation-play" onClick={togglePlay} disabled={last === 0}>
          {playingAll ? '❚❚ Pausa' : progress >= last ? '↺ Desde el principio' : '▶ Reproducir'}
        </button>
        <button className="presentation-step" onClick={nextStep} disabled={progress >= last} aria-label="Paso siguiente">
          ▶
        </button>
        <div className="presentation-dots" role="group" aria-label="Pasos">
          {frames.map((f, i) => (
            <button
              key={f.id}
              className={i === index ? 'active' : ''}
              onClick={() => go(i)}
              aria-label={`Ir al paso ${i + 1}`}
              aria-current={i === index ? 'step' : undefined}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Velocidad">
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={2}>2×</option>
        </select>
      </footer>
      <p className="presentation-hint">← → pasos · Espacio reproducir · Esc salir</p>
    </div>
  );
}
