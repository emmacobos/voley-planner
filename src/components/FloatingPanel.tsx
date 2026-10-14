import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { midPoint } from '../domain/arrows';
import { textBox } from '../domain/shadows';
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

/**
 * Punto de la pizarra (en metros) al que apunta la tarjeta y hasta dónde llega
 * el elemento a cada lado (incluidos el tachito y el globito, que van a la derecha).
 */
function elementAnchor(el: BoardElement): { x: number; y: number; left: number; right: number } {
  if (el.kind === 'arrow') {
    const m = midPoint(el);
    return { x: m.x, y: m.y, left: m.x - 0.5, right: m.x + 1.8 };
  }
  if (el.kind === 'shadow') {
    const x = (el.x1 + el.x2) / 2;
    const y = (el.y1 + el.y2) / 2;
    return { x, y, left: x - 0.5, right: x + 1.7 };
  }
  if (el.kind === 'text') {
    const w = textBox(el).width / 2;
    return { x: el.x, y: el.y, left: el.x - w - 0.3, right: el.x + w + 1.6 };
  }
  return { x: el.x, y: el.y, left: el.x - 0.6, right: el.x + (el.kind === 'player' ? 1.9 : 1.7) };
}

interface Placement {
  left: number;
  top: number;
  pointer: number;
  side: 'right' | 'left';
}

/**
 * Tarjeta del elemento seleccionado, flotando sobre la pizarra al lado del
 * elemento. En pantallas angostas queda debajo de la pizarra (lo resuelve el CSS).
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

  // Ubicación al lado del elemento (se recalcula cuando el elemento se mueve).
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const svg = svgRef.current;
    const card = cardRef.current;
    const ctm = svg?.getScreenCTM();
    if (!stage || !card || !ctm) return;
    const box = stage.getBoundingClientRect();
    const toPx = (x: number, y: number) => ({ x: ctm.a * x + ctm.e - box.left, y: ctm.d * y + ctm.f - box.top });
    const a = elementAnchor(element);
    const center = toPx(a.x, a.y);
    const right = toPx(a.right, a.y).x;
    const left = toPx(a.left, a.y).x;
    const height = card.offsetHeight;

    let side: Placement['side'] = 'right';
    let x = right + GAP;
    if (x + CARD_WIDTH > box.width - MARGIN) {
      if (left - GAP - CARD_WIDTH >= MARGIN) {
        side = 'left';
        x = left - GAP - CARD_WIDTH;
      } else {
        x = Math.max(MARGIN, box.width - CARD_WIDTH - MARGIN);
      }
    }
    // La flecha de la tarjeta queda a la altura del elemento.
    const maxTop = Math.max(MARGIN, box.height - height - MARGIN);
    const top = Math.round(Math.min(maxTop, Math.max(MARGIN, center.y - 60)));
    const pointer = Math.round(Math.min(height - 18, Math.max(18, center.y - top)));
    const next = { left: Math.round(x), top, pointer, side };
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

  return (
    <div
      ref={cardRef}
      className={`floating-panel side-${placement?.side ?? 'right'}`}
      style={
        {
          left: placement?.left ?? 0,
          top: placement?.top ?? 0,
          visibility: placement ? 'visible' : 'hidden',
          '--pointer-y': `${placement?.pointer ?? 60}px`,
        } as CSSProperties
      }
      role="dialog"
      aria-label={`${TITLES[element.kind]} seleccionado`}
    >
      <div className="floating-panel-head">
        <h3>{TITLES[element.kind]}</h3>
        <button className="icon-button floating-close" onClick={onClose} aria-label="Cerrar" title="Cerrar (Esc)">
          ×
        </button>
      </div>
      {children}
    </div>
  );
}
