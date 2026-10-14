import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { markTutorialSeen } from '../utils/tutorials';

/** Mini pantallas de ejemplo para cada paso del tutorial. */
const Pad = ({ items, active }: { items: string[]; active?: number }) => (
  <div className="tut-pad">
    {items.map((t, i) => (
      <span key={t} className={i === active ? 'on' : ''}>
        {t}
      </span>
    ))}
  </div>
);

const STEPS: { title: string; art: ReactNode; text: ReactNode }[] = [
  {
    title: 'Para qué sirve',
    art: (
      <div className="tut-art tut-intro">
        <div className="tut-score">
          <span>Nosotros</span>
          <b>18</b>
          <i>–</i>
          <b>15</b>
          <span>Rival</span>
        </div>
        <div className="tut-bars">
          <i style={{ width: '72%' }} />
          <i style={{ width: '38%' }} className="low" />
          <i style={{ width: '61%' }} />
        </div>
      </div>
    ),
    text: (
      <>
        <p>
          Mientras se juega, alguien del banco anota con el celular <b>quién hizo qué y cómo salió</b>. La app lleva sola
          el marcador, quién saca y en qué rotación están.
        </p>
        <p>
          Al terminar ves, por ejemplo, que en <b>R4 ganan solo 4 de cada 10 puntos recibiendo</b> o que una jugadora
          recibe bien el 70 %. Con eso planificás el próximo entrenamiento sobre datos, no sobre sensaciones.
        </p>
      </>
    ),
  },
  {
    title: '1. Antes de cada set',
    art: (
      <div className="tut-art">
        <small>Rotación inicial (zona del armador)</small>
        <Pad items={['R1', 'R6', 'R5', 'R4', 'R3', 'R2']} active={0} />
        <small>¿Quién saca primero?</small>
        <Pad items={['Nosotros', 'El rival']} active={1} />
      </div>
    ),
    text: (
      <p>
        Elegí en qué rotación arranca el equipo (R1 = armador en la zona 1, como en la pizarra) y quién saca. Es lo único
        que se carga a mano: después la rotación avanza sola cada vez que recuperan el saque. Si en algún momento no
        coincide con la cancha, se corrige tocando la <b>R</b> del marcador.
      </p>
    ),
  },
  {
    title: '2. Cada acción, en 3 toques',
    art: (
      <div className="tut-art tut-flow">
        <div>
          <small>¿Quién?</small>
          <Pad items={['7 Flor', '3 Cami', '1 Sofi']} active={0} />
        </div>
        <span className="tut-arrow">→</span>
        <div>
          <small>¿Qué hizo?</small>
          <Pad items={['Saque', 'Recepción', 'Ataque']} active={2} />
        </div>
        <span className="tut-arrow">→</span>
        <div>
          <small>¿Cómo salió?</small>
          <Pad items={['Punto', 'En juego', 'Error']} active={0} />
        </div>
      </div>
    ),
    text: (
      <>
        <p>
          Tocás la jugadora, el fundamento y el resultado. Al tocar el resultado se guarda y queda listo para la próxima.
          Con práctica son 2 o 3 segundos por acción.
        </p>
        <p className="muted">
          No hace falta anotar todo: con <b>saque, recepción y ataque</b> ya tenés lo más importante. Bloqueo y defensa
          suman si te da el tiempo.
        </p>
      </>
    ),
  },
  {
    title: '3. Qué resultado elegir',
    art: (
      <div className="tut-art tut-results">
        <span className="tone-punto">Punto / Ace</span>
        <span className="tone-bueno">Perfecta · Buena · Complica</span>
        <span className="tone-neutro">En juego · Mala</span>
        <span className="tone-error">Error · Bloqueado</span>
      </div>
    ),
    text: (
      <>
        <p>
          <b>Verde</b> termina el punto a favor, <b>rojo</b> lo termina en contra, y el resto deja la jugada en juego (no
          cambia el marcador). Cada botón explica qué es si lo mantenés apretado o pasás el mouse.
        </p>
        <p>
          En la recepción: <b>Perfecta</b> llega al armador con todas las opciones, <b>Buena</b> se puede armar,{' '}
          <b>Mala</b> solo un ataque forzado y <b>Error</b> es ace del rival.
        </p>
      </>
    ),
  },
  {
    title: '4. Puntos que no son de una jugadora',
    art: (
      <div className="tut-art">
        <Pad items={['+ Error del rival', 'Punto del rival', '↶ Deshacer']} />
      </div>
    ),
    text: (
      <p>
        Si el rival tira afuera o hace un ace que no se le puede adjudicar a nadie, usá <b>Error del rival</b> o{' '}
        <b>Punto del rival</b>. ¿Te equivocaste? <b>Deshacer</b> borra la última anotación. Si te perdiste una jugada, no
        pasa nada: sumá el punto con estos botones para que el marcador siga bien.
      </p>
    ),
  },
  {
    title: '5. Después del partido',
    art: (
      <div className="tut-art tut-summary">
        <div>
          <small>Side-out</small>
          <b>58 %</b>
        </div>
        <div>
          <small>Break</small>
          <b>41 %</b>
        </div>
        <div className="warn">
          <small>Rotación a trabajar</small>
          <b>R4</b>
        </div>
      </div>
    ),
    text: (
      <>
        <p>
          En <b>Resumen</b> ves el partido entero o cada set: puntos y errores por jugadora, saque, recepción y ataque, y
          cómo les fue en cada rotación. Abajo hay una explicación de cada número.
        </p>
        <p>
          Al terminar, la app ofrece guardar el resultado (por ejemplo 3-1) en el partido. Todo queda guardado y se
          sincroniza con el resto del cuerpo técnico.
        </p>
      </>
    ),
  },
];

/** Tutorial paso a paso de las estadísticas de partido. */
export function StatsTutorial({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const close = () => {
    markTutorialSeen('estadisticas');
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') setStep((s) => Math.min(STEPS.length - 1, s + 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const s = STEPS[step];
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal tutorial" role="dialog" aria-modal="true" aria-label="Cómo se usan las estadísticas">
        <button className="modal-close" onClick={close} aria-label="Cerrar">
          ×
        </button>
        <span className="tutorial-kicker">
          Estadísticas de partido · {step + 1} de {STEPS.length}
        </span>
        <h2>{s.title}</h2>
        {s.art}
        <div className="tutorial-text">{s.text}</div>
        <div className="tutorial-dots" aria-hidden="true">
          {STEPS.map((x, i) => (
            <i key={x.title} className={i === step ? 'on' : ''} />
          ))}
        </div>
        <div className="row tutorial-nav">
          <button onClick={() => setStep(step - 1)} disabled={step === 0}>
            Anterior
          </button>
          <button className="primary" onClick={last ? close : () => setStep(step + 1)}>
            {last ? '¡Empezar!' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
