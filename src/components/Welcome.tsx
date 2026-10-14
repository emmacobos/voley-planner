import { useEffect, useMemo, useState } from 'react';
import { elementsAtProgress, easeInOut } from '../domain/animation';
import { buildDemoData } from '../domain/demo';
import { useAuth } from '../cloud/auth';
import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';
import { AuthDialog } from './AuthDialog';
import { Board } from './Board';

const MOVE_MS = 1400;
const HOLD_MS = 900;
const END_MS = 1600;
const noop = () => {};

/** Pizarra que reproduce sola, en loop, la jugada del ejemplo. */
function PlayPreview() {
  const frames = useMemo(() => buildDemoData().exercises[0].frames, []);
  const [progress, setProgress] = useState(0);
  const last = frames.length - 1;

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const step = MOVE_MS + HOLD_MS;
    const cycle = last * step + END_MS;
    let raf = 0;
    const start = performance.now();
    const tick = (time: number) => {
      const local = Math.max(0, time - start) % cycle;
      const seg = Math.floor(local / step);
      if (seg >= last) setProgress(last);
      else {
        const within = local - seg * step;
        setProgress(seg + (within < HOLD_MS ? 0 : (within - HOLD_MS) / MOVE_MS));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [last]);

  const index = Math.min(last, Math.floor(progress));
  // elementsAtProgress ya suaviza cada transición.
  const elements = elementsAtProgress(
    frames.map((f) => f.elements),
    progress,
  );
  const shown = Math.min(1, (index + easeInOut(progress - index)) / last);

  return (
    <div className="welcome-board" aria-label="Jugada de ejemplo animada">
      <Board
        elements={elements}
        players={[]}
        selectedId={null}
        tool="select"
        readOnly
        showZones
        onSelect={noop}
        onUpdate={noop}
        onAddArrow={noop}
      />
      <div className="welcome-progress" aria-hidden="true">
        <i style={{ width: `${shown * 100}%` }} />
      </div>
      <span className="welcome-badge">
        ▶ Paso {index + 1}: {frames[index].note}
      </span>
    </div>
  );
}

const FEATURES = [
  {
    color: '#1F4FB8',
    icon: 'M4 18c4-1 7-5 9-9m0 0-4 .5M13 9l1 4',
    title: 'Pizarra animada',
    text: 'Cancha completa con los dos equipos, flechas, sombra del bloqueo y textos. Armá la jugada en pasos y reproducila.',
  },
  {
    color: '#C0262D',
    icon: 'M12 3a9 9 0 1 0 9 9M12 3v9l6 3',
    title: 'Sistemas y rotaciones',
    text: 'Formaciones del 5-1, 4-2 y 6-0 para cada rotación, con control automático de faltas de posición.',
  },
  {
    color: '#15935E',
    icon: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 2v4M16 2v4M3 10h18',
    title: 'Sesiones por bloques',
    text: 'Calentamiento, técnica, táctica y juego con sus minutos, intensidad y jugadores. Exportá a PDF.',
  },
  {
    color: '#B9851A',
    icon: 'M7 18a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.5 1.5A3.75 3.75 0 0 1 17.5 18z',
    title: 'Siempre a mano',
    text: 'Con tu cuenta, todo se guarda en la nube y lo ves en la compu del club o en tu casa.',
  },
];

/** Portada para quien entra por primera vez (sin datos cargados). */
export function Welcome() {
  const user = useAuth((s) => s.user);
  const loadDemo = useAppStore((s) => s.loadDemo);
  const [dialog, setDialog] = useState(false);

  return (
    <>
      <section className="welcome-hero">
        <div className="welcome-text">
          <span className="welcome-kicker">Pizarra táctica · Planificador de entrenamientos</span>
          <h1>Planificá tus entrenamientos como un cuerpo técnico profesional</h1>
          <p>
            Dibujá jugadas en cancha completa, animalas paso a paso, controlá las rotaciones del 5-1, 4-2 y 6-0 y armá
            cada sesión por bloques, lista para imprimir.
          </p>
          <div className="welcome-actions">
            <button className="primary" onClick={() => navigate('/plantel')}>
              Empezar: cargá tu plantel
            </button>
            <button className="welcome-ghost" onClick={loadDemo} title="Carga un plantel, ejercicios y una sesión de muestra">
              ▶ Ver un ejemplo
            </button>
          </div>
          {!user && (
            <small>
              ¿Ya tenés cuenta?{' '}
              <button className="link-button" onClick={() => setDialog(true)}>
                Entrá
              </button>{' '}
              y seguí donde lo dejaste.
            </small>
          )}
        </div>
        <PlayPreview />
      </section>

      <div className="welcome-features">
        {FEATURES.map((f) => (
          <article key={f.title}>
            <span className="welcome-icon" style={{ color: f.color, background: `${f.color}21` }}>
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                <path d={f.icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </article>
        ))}
      </div>
      {dialog && <AuthDialog onClose={() => setDialog(false)} />}
    </>
  );
}
