import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { elementsAtProgress } from '../domain/animation';
import type { Frame, Player } from '../domain/types';
import { useBoardOrientation } from '../utils/boardOrientation';
import { Board } from './Board';
import { boardViewBox } from './boardTheme';

const TRANSITION_MS = 1200;
const noop = () => {};

/** Colores para marcar a mano sobre la jugada. */
const INK = [
  { value: '#F2CF83', label: 'Dorado' },
  { value: '#FFFFFF', label: 'Blanco' },
  { value: '#E5484D', label: 'Rojo' },
];

interface Stroke {
  color: string;
  points: string;
}

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
  fullscreen = true,
  footer,
}: {
  title: string;
  frames: Frame[];
  players: Player[];
  startAt?: number;
  onClose: () => void;
  /** Pedir pantalla completa al abrir (necesita que se abra con un toque). */
  fullscreen?: boolean;
  /** Texto extra al pie (por ejemplo, en una jugada compartida). */
  footer?: ReactNode;
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
  const vertical = useBoardOrientation((s) => s.vertical);

  // Marcas a mano alzada: no se guardan; cada paso tiene las suyas.
  const [drawing, setDrawing] = useState(false);
  const [ink, setInk] = useState(INK[0].value);
  const [strokes, setStrokes] = useState<Record<number, Stroke[]>>({});
  const live = useRef<{ svg: SVGSVGElement; points: string[] } | null>(null);
  const [livePoints, setLivePoints] = useState<string | null>(null);
  const toBoard = (svg: SVGSVGElement, e: ReactPointerEvent) => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  };
  const inkDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const pt = toBoard(svg, e);
    if (!pt) return;
    svg.setPointerCapture(e.pointerId);
    live.current = { svg, points: [pt] };
    setLivePoints(pt);
  };
  const inkMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const l = live.current;
    if (!l) return;
    const pt = toBoard(l.svg, e);
    if (!pt) return;
    l.points.push(pt);
    setLivePoints(l.points.join(' '));
  };
  const inkUp = () => {
    const l = live.current;
    live.current = null;
    setLivePoints(null);
    if (!l || l.points.length < 2) return;
    setStrokes((all) => ({ ...all, [index]: [...(all[index] ?? []), { color: ink, points: l.points.join(' ') }] }));
  };
  const clearInk = () => setStrokes((all) => ({ ...all, [index]: [] }));
  const stepStrokes = strokes[index] ?? [];
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
    if (!fullscreen) return;
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
  }, [fullscreen]);

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
        if (drawing) setDrawing(false);
        else onClose();
      } else if (e.key === 'd' || e.key === 'D') {
        setDrawing((d) => !d);
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
        <div className="ink-tools">
          <button
            className={`ink-toggle${drawing ? ' active' : ''}`}
            onClick={() => setDrawing(!drawing)}
            aria-pressed={drawing}
            title="Marcar a mano sobre la jugada (D). No se guarda."
          >
            ✏ {drawing ? 'Marcando' : 'Marcar'}
          </button>
          {drawing &&
            INK.map((c) => (
              <button
                key={c.value}
                className={`ink-color${ink === c.value ? ' active' : ''}`}
                style={{ background: c.value }}
                onClick={() => setInk(c.value)}
                aria-label={c.label}
                aria-pressed={ink === c.value}
                title={c.label}
              />
            ))}
          {(drawing || stepStrokes.length > 0) && (
            <button className="ink-clear" onClick={clearInk} disabled={!stepStrokes.length} title="Borrar las marcas de este paso">
              Borrar marcas
            </button>
          )}
        </div>
        <button className="presentation-close" onClick={onClose} aria-label="Cerrar presentación" title="Cerrar (Esc)">
          ×
        </button>
      </header>

      <div className="presentation-board">
        <div className="ink-canvas">
        <Board
          elements={elements}
          players={players}
          selectedId={null}
          tool="select"
          readOnly
          showZones
          vertical={vertical}
          onSelect={noop}
          onUpdate={noop}
          onAddArrow={noop}
        />
        <svg
          className={`ink-layer${drawing ? ' drawing' : ''}`}
          viewBox={boardViewBox(vertical)}
          onPointerDown={drawing ? inkDown : undefined}
          onPointerMove={drawing ? inkMove : undefined}
          onPointerUp={drawing ? inkUp : undefined}
          onPointerCancel={drawing ? inkUp : undefined}
          aria-hidden="true"
        >
          {stepStrokes.map((st, i) => (
            <polyline key={i} points={st.points} stroke={st.color} />
          ))}
          {livePoints && <polyline points={livePoints} stroke={ink} />}
        </svg>
        </div>
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
      <p className="presentation-hint">← → pasos · Espacio reproducir · D marcar · Esc salir</p>
      {footer}
    </div>
  );
}
