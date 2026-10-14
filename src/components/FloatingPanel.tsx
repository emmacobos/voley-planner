import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from 'react';
import { midPoint } from '../domain/arrows';
import { shadowCorners, textBox, wrapText } from '../domain/shadows';
import type { BoardElement } from '../domain/types';

const CARD_WIDTH = 280;
const GAP = 10;
const MARGIN = 6;

const TITLES: Record<BoardElement['kind'], string> = {
  player: 'Jugador',
  ball: 'Pelota',
  cone: 'Cono',
  coach: 'Entrenador',
  cart: 'Carro',
  arrow: 'Flecha',
  shadow: 'Sombra del bloqueo',
  text: 'Texto',
};

/** Rectángulo (en metros) que ocupa el elemento en la pizarra, incluidos sus textos. */
function elementBounds(el: BoardElement): { x1: number; y1: number; x2: number; y2: number } {
  if (el.kind === 'arrow') {
    const m = midPoint(el);
    const xs = [el.x1, el.x2, m.x];
    const ys = [el.y1, el.y2, m.y];
    return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
  }
  if (el.kind === 'shadow') {
    const pts = shadowCorners(el);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
  }
  if (el.kind === 'text') {
    const { width, height } = textBox(el);
    return { x1: el.x - width / 2, y1: el.y - height / 2, x2: el.x + width / 2, y2: el.y + height / 2 };
  }
  // Fichas: debajo van el nombre y el comentario.
  const below = el.kind === 'player' ? 1.3 + (el.comment ? wrapText(el.comment, 24).length * 0.42 : 0) : 0.6;
  return { x1: el.x - 0.6, y1: el.y - 1.1, x2: el.x + 0.6, y2: el.y + below };
}

interface Placement {
  left: number;
  top: number;
  /** Posición horizontal de la flechita que apunta al elemento. */
  pointer: number;
  side: 'below' | 'above';
}

/**
 * Tarjeta del elemento seleccionado, flotando sobre la pizarra debajo del
 * elemento (o arriba si no hay lugar), para no tapar lo que se está editando.
 * Se puede arrastrar desde el título. En pantallas angostas queda debajo de la
 * pizarra (lo resuelve el CSS).
 */
export function FloatingPanel({
  element,
  stageRef,
  svgRef,
  onClose,
  children,
}: {
  element: BoardElement;
  stageRef: RefObject<HTMLDivElement | null>;
  svgRef: RefObject<SVGSVGElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [resizes, setResizes] = useState(0);
  /** Lugar elegido a mano (arrastrando el título); se mantiene mientras la tarjeta está abierta. */
  const [manual, setManual] = useState<{ left: number; top: number } | null>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  // Recalcular si cambia el tamaño de la ventana o el de la tarjeta (otro contenido).
  useEffect(() => {
    const onResize = () => setResizes((n) => n + 1);
    window.addEventListener('resize', onResize);
    const observer = new ResizeObserver(onResize);
    if (cardRef.current) observer.observe(cardRef.current);
    return () => {
      window.removeEventListener('resize', onResize);
      observer.disconnect();
    };
  }, []);

  // Ubicación debajo del elemento (se recalcula cuando el elemento se mueve).
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const svg = svgRef.current;
    const card = cardRef.current;
    const ctm = svg?.getScreenCTM();
    if (!stage || !card || !ctm) return;
    const box = stage.getBoundingClientRect();
    const toPx = (x: number, y: number) => ({ x: ctm.a * x + ctm.e - box.left, y: ctm.d * y + ctm.f - box.top });
    const b = elementBounds(element);
    const topLeft = toPx(b.x1, b.y1);
    const bottomRight = toPx(b.x2, b.y2);
    const centerX = (topLeft.x + bottomRight.x) / 2;
    const height = card.offsetHeight;

    const left = Math.round(Math.min(Math.max(MARGIN, centerX - CARD_WIDTH / 2), Math.max(MARGIN, box.width - CARD_WIDTH - MARGIN)));
    // Abajo, salvo que el elemento esté muy cerca del borde inferior y arriba haya lugar.
    const fitsBelow = bottomRight.y + GAP + height <= box.height + 120;
    const fitsAbove = topLeft.y - GAP - height >= MARGIN;
    const side: Placement['side'] = fitsBelow || !fitsAbove ? 'below' : 'above';
    const top = Math.round(side === 'below' ? bottomRight.y + GAP : topLeft.y - GAP - height);
    const pointer = Math.round(Math.min(CARD_WIDTH - 18, Math.max(18, centerX - left)));
    const next = { left, top, pointer, side };
    if (
      !placement ||
      placement.left !== next.left ||
      placement.top !== next.top ||
      placement.pointer !== next.pointer ||
      placement.side !== next.side
    ) {
      setPlacement(next);
    }
  }, [element, placement, resizes, stageRef, svgRef]);

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button') || !placement) return;
    const current = manual ?? placement;
    drag.current = { x: e.clientX, y: e.clientY, left: current.left, top: current.top };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const moveDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    setManual({ left: d.left + e.clientX - d.x, top: d.top + e.clientY - d.y });
  };
  const endDrag = () => {
    drag.current = null;
  };

  const position = manual ?? placement;

  return (
    <div
      ref={cardRef}
      className={`floating-panel ${manual ? 'moved' : `side-${placement?.side ?? 'below'}`}`}
      style={
        {
          left: position?.left ?? 0,
          top: position?.top ?? 0,
          visibility: position ? 'visible' : 'hidden',
          '--pointer-x': `${placement?.pointer ?? 40}px`,
        } as CSSProperties
      }
      role="dialog"
      aria-label={`${TITLES[element.kind]} seleccionado`}
    >
      <div
        className="floating-panel-head"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        title="Arrastrá para moverla"
      >
        <h3>{TITLES[element.kind]}</h3>
        <button className="icon-button floating-close" onClick={onClose} aria-label="Cerrar" title="Cerrar (Esc)">
          ×
        </button>
      </div>
      {children}
    </div>
  );
}
