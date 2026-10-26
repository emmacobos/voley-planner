import { createContext, useContext, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, Ref } from 'react';
import {
  ATTACK_LINE_DIST,
  COURT_LENGTH,
  COURT_WIDTH,
  NET_X,
  VIEW,
  clampToView,
  toCourt,
} from '../domain/court';
import { ARROW_KINDS, arrowColor, arrowDashed, arrowPath, curveThrough, headMarkerId, midPoint } from '../domain/arrows';
import {
  DEFAULT_SHADOW,
  TEXT_COLORS,
  TEXT_FONT_RANGE,
  setTextMeasurer,
  shadowPoints,
  textBox,
  textFontSize,
  textLines,
  textMinWidth,
  wrapText,
} from '../domain/shadows';
import { isSegment } from '../domain/types';
import type {
  ArrowElement,
  BlockShadowElement,
  PointElement,
  TextElement,
  ArrowStyle,
  BoardElement,
  Player,
  PlayerToken,
  Team,
  TeamNames,
  Zone,
} from '../domain/types';
import { positionShort } from '../domain/types';
import { COURT_COLORS, DISPLAY_FONT, HOOP_COLORS, LIBERO_COLORS, SELECTION_COLOR, TEAM_COLORS, boardViewBox } from './boardTheme';
import type { Tool } from './boardTheme';


// Medir los textos con la tipografía real (negrita de Barlow) para que el cuadro los envuelva justo.
const measureCanvas = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
if (measureCanvas) {
  measureCanvas.font = "700 100px Barlow, system-ui, -apple-system, 'Segoe UI', sans-serif";
  setTextMeasurer((text, size) => (measureCanvas.measureText(text).width / 100) * size);
  // Cuando termina de cargar la tipografía, volver a fijarla (antes medía con la de reserva).
  document.fonts?.ready.then(() => {
    measureCanvas.font = "700 100px Barlow, system-ui, -apple-system, 'Segoe UI', sans-serif";
  });
}

/** En pantallas táctiles los puntos de agarre se agrandan para tocarlos con el dedo. */
const TOUCH = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
const HANDLE = TOUCH ? 1.8 : 1;

/** Pizarra vertical: misma jugada, dibujada girada (red horizontal, equipo A abajo). */
const VerticalContext = createContext(false);
/** Para dejar derechos los textos y fichas cuando la pizarra está girada. */
const useUpright = () => (useContext(VerticalContext) ? ' rotate(90)' : '');

/**
 * Punto a (sx, sy) de distancia en la pantalla (sx a la derecha, sy hacia
 * arriba) de (x, y), según cómo esté girada la pizarra.
 */
function screenOffset(x: number, y: number, sx: number, sy: number, vertical: boolean) {
  return vertical ? clampToView(x + sy, y + sx) : clampToView(x + sx, y - sy);
}

interface BoardProps {
  elements: BoardElement[];
  players: Player[];
  selectedId: string | null;
  tool: Tool;
  readOnly?: boolean;
  showZones: boolean;
  svgRef?: Ref<SVGSVGElement>;
  onSelect: (id: string | null) => void;
  onUpdate: (element: BoardElement) => void;
  onAddArrow: (arrow: Omit<ArrowElement, 'id'>) => void;
  /** Agrega otro elemento dibujado en la pizarra (sombra del bloqueo, texto). */
  onAddElement?: (element: Omit<BlockShadowElement, 'id'> | Omit<TextElement, 'id'>) => void;
  /** Si está, el elemento seleccionado muestra un tachito para borrarlo. */
  onDelete?: (id: string) => void;
  /** Si está, el jugador seleccionado muestra un botón para comentarlo. */
  onComment?: (id: string) => void;
  /** Avisa cuando empieza y termina el arrastre de un elemento (para esconder su tarjeta mientras tanto). */
  onDraggingChange?: (dragging: boolean) => void;
  /** Dibujar la cancha vertical (red horizontal, equipo A abajo). */
  vertical?: boolean;
  /** Nombres de los equipos en la cancha (si faltan, "Equipo A" y "Equipo B"). */
  teamNames?: TeamNames;
  /** Media cancha: solo el lado del equipo A y la red. */
  half?: boolean;
}

/**
 * Qué parte se arrastra: el elemento entero, un extremo o el punto medio
 * (curva) de una flecha, o el borde (ancho) o la esquina (tamaño) de un texto.
 */
type ArrowPart = 'whole' | 'start' | 'end' | 'mid' | 'width' | 'scale';

type Drag =
  | { type: 'element'; id: string; part: ArrowPart; ox: number; oy: number; dx: number; dy: number }
  | { type: 'shadow'; x1: number; y1: number; x2: number; y2: number }
  | {
      type: 'arrow';
      style: ArrowStyle;
      /** Curvatura como fracción del largo (0: recta). */
      bend: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };

/** Curvatura de las flechas curvas al dibujarlas, como fracción del largo. */
export const DEFAULT_BEND = 0.22;

/** Qué flecha dibuja cada herramienta. */
const ARROW_TOOLS: Record<ArrowTool, { style: ArrowStyle; bend: number }> = {
  'arrow-move': { style: 'move', bend: 0 },
  'arrow-ball': { style: 'ball', bend: 0 },
  'arrow-curve': { style: 'ball', bend: DEFAULT_BEND },
  'arrow-curve-dashed': { style: 'move', bend: DEFAULT_BEND },
};

type ArrowTool = 'arrow-move' | 'arrow-ball' | 'arrow-curve' | 'arrow-curve-dashed';

function drawnShadow(d: Extract<Drag, { type: 'shadow' }>): Omit<BlockShadowElement, 'id'> {
  return { kind: 'shadow', x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2, ...DEFAULT_SHADOW };
}

/** Flecha que resulta de lo dibujado hasta ahora. */
function drawnArrow(d: Extract<Drag, { type: 'arrow' }>): Omit<ArrowElement, 'id'> {
  const len = Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
  const curve = Math.round(d.bend * len * 100) / 100;
  return {
    kind: 'arrow',
    style: d.style,
    x1: d.x1,
    y1: d.y1,
    x2: d.x2,
    y2: d.y2,
    ...(curve ? { curve } : {}),
  };
}

const ZONES: Zone[] = [1, 2, 3, 4, 5, 6];
/** Dónde se dibuja el número de cada zona (detrás de la posición base, para que no lo tape la ficha). */
const ZONE_LABEL: Record<Zone, { depth: number; lateral: number }> = {
  1: { depth: 7.8, lateral: 7.5 },
  2: { depth: 2.6, lateral: 7.5 },
  3: { depth: 2.6, lateral: 4.5 },
  4: { depth: 2.6, lateral: 1.5 },
  5: { depth: 7.8, lateral: 1.5 },
  6: { depth: 7.8, lateral: 4.5 },
};

/** Punto de la pantalla en metros de la cancha (según el grupo que contiene la cancha, que puede estar girado). */
function svgPoint(content: SVGGraphicsElement, clientX: number, clientY: number) {
  const ctm = content.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

function applyDrag(el: BoardElement, drag: Drag | null, vertical = false): BoardElement {
  if (!drag || drag.type !== 'element' || drag.id !== el.id) return el;
  const { dx, dy, part } = drag;
  if (isSegment(el)) {
    if (part === 'mid' && el.kind === 'arrow') return { ...el, curve: curveThrough(el, { x: drag.ox + dx, y: drag.oy + dy }) };
    return {
      ...el,
      ...(part !== 'end' ? { x1: el.x1 + dx, y1: el.y1 + dy } : {}),
      ...(part !== 'start' ? { x2: el.x2 + dx, y2: el.y2 + dy } : {}),
    };
  }
  // En la pizarra vertical, el ancho del texto crece hacia la derecha de la pantalla, que es +y en la cancha.
  if (el.kind === 'text' && (part === 'width' || part === 'scale')) return resizeText(el, drag.ox, drag.oy, dx, dy, part, vertical);
  const p = clampToView(el.x + dx, el.y + dy);
  return { ...el, ...p };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Agranda o achica el cuadro de texto (borde: ancho; esquina: tamaño de letra). */
function resizeText(el: TextElement, ox: number, oy: number, dx: number, dy: number, part: 'width' | 'scale', vertical: boolean): TextElement {
  const box = textBox(el);
  if (part === 'width') {
    // El texto está centrado: el cuadro crece hacia los dos lados.
    const width = Math.max(textMinWidth(el), box.width + 2 * (vertical ? dy : dx));
    return { ...el, width: round2(width) };
  }
  // Escala según cuánto se alejó la esquina del centro del texto.
  const from = Math.hypot(ox - el.x, oy - el.y);
  const to = Math.hypot(ox + dx - el.x, oy + dy - el.y);
  if (from < 0.01) return el;
  const font = textFontSize(el);
  const fontSize = Math.min(TEXT_FONT_RANGE.max, Math.max(TEXT_FONT_RANGE.min, font * (to / from)));
  const k = fontSize / font;
  return { ...el, fontSize: round2(fontSize), ...(el.width ? { width: round2(el.width * k) } : {}) };
}

export function Board({
  elements,
  players,
  selectedId,
  tool,
  readOnly = false,
  showZones,
  svgRef,
  onSelect,
  onUpdate,
  onAddArrow,
  onAddElement,
  onDelete,
  onComment,
  onDraggingChange,
  vertical = false,
  teamNames,
  half = false,
}: BoardProps) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const contentRef = useRef<SVGGElement>(null);
  const playersById = new Map(players.map((p) => [p.id, p]));

  const point = (e: ReactPointerEvent<SVGSVGElement>) => svgPoint(contentRef.current ?? e.currentTarget, e.clientX, e.clientY);

  const startElementDrag = (
    e: ReactPointerEvent<SVGElement>,
    id: string,
    part: ArrowPart = 'whole',
  ) => {
    if (readOnly) return;
    // Los puntos de agarre del elemento seleccionado (curva, extremos, borde
    // del texto) se arrastran aunque esté activa una herramienta de dibujo.
    if (tool !== 'select' && (part === 'whole' || id !== selectedId)) return;
    e.stopPropagation();
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    svg.setPointerCapture(e.pointerId);
    const p = svgPoint(contentRef.current ?? svg, e.clientX, e.clientY);
    onSelect(id);
    setDrag({ type: 'element', id, part, ox: p.x, oy: p.y, dx: 0, dy: 0 });
    onDraggingChange?.(true);
  };

  const endDrag = () => {
    if (drag?.type === 'element') onDraggingChange?.(false);
    setDrag(null);
  };

  const onBackgroundDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (readOnly) return;
    if (tool === 'select') {
      onSelect(null);
      return;
    }
    const p = point(e);
    if (tool === 'text') {
      // Que el clic no le saque el foco al campo donde se va a escribir.
      e.preventDefault();
      // Un toque en la cancha crea el texto ahí mismo.
      onAddElement?.({ kind: 'text', x: p.x, y: p.y, text: '', size: 'M', color: TEXT_COLORS[0].value });
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === 'shadow') {
      setDrag({ type: 'shadow', x1: p.x, y1: p.y, x2: p.x, y2: p.y });
      return;
    }
    setDrag({
      type: 'arrow',
      ...ARROW_TOOLS[tool],
      x1: p.x,
      y1: p.y,
      x2: p.x,
      y2: p.y,
    });
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const p = point(e);
    if (drag.type === 'element') {
      setDrag({ ...drag, dx: p.x - drag.ox, dy: p.y - drag.oy });
    } else {
      setDrag({ ...drag, x2: p.x, y2: p.y });
    }
  };

  const onPointerUp = () => {
    if (!drag) return;
    if (drag.type === 'element') {
      const el = elements.find((x) => x.id === drag.id);
      if (el && (drag.dx !== 0 || drag.dy !== 0)) onUpdate(applyDrag(el, drag, vertical));
    } else if (Math.hypot(drag.x2 - drag.x1, drag.y2 - drag.y1) > 0.3) {
      if (drag.type === 'shadow') onAddElement?.(drawnShadow(drag));
      else onAddArrow(drawnArrow(drag));
    }
    endDrag();
  };

  const shown = elements.map((el) => applyDrag(el, drag, vertical));
  // Abajo las sombras del bloqueo, después las flechas y arriba el resto.
  const shadows = shown.filter((e): e is BlockShadowElement => e.kind === 'shadow');
  const arrows = shown.filter((e): e is ArrowElement => e.kind === 'arrow');
  // Aros y banquitos van en el piso: debajo de jugadores, pelotas y textos (una jugadora se puede parar arriba).
  const onFloor = (e: PointElement) => Number(e.kind === 'hoop' || e.kind === 'step');
  const points = shown.filter((e): e is PointElement => !isSegment(e)).sort((a, b) => onFloor(b) - onFloor(a));
  const selectedEl = shown.find((e) => e.id === selectedId) ?? null;

  return (
    <VerticalContext.Provider value={vertical}>
    <svg
      ref={svgRef}
      className={`board tool-${tool}${readOnly ? ' read-only' : ''}${vertical ? ' vertical' : ''}${half ? ' half' : ''}`}
      viewBox={boardViewBox(vertical, half)}
      xmlns="http://www.w3.org/2000/svg"
      fontFamily="Barlow, system-ui, -apple-system, 'Segoe UI', sans-serif"
      onPointerDown={onBackgroundDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={endDrag}
    >
      <defs>
        {ARROW_KINDS.map((c) => (
          <marker
            key={c.value}
            id={headMarkerId(c.color)}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={c.color} />
          </marker>
        ))}
      </defs>
      {/* Todo lo de la cancha, girado si la pizarra está vertical. */}
      <g ref={contentRef} className="board-content" transform={vertical ? 'rotate(-90)' : undefined}>

      <Court showZones={showZones} teamNames={teamNames} half={half} />

      {shadows.map((sh) => (
        <Shadow
          key={sh.id}
          shadow={sh}
          selected={sh.id === selectedId}
          onPointerDown={(e, part) => startElementDrag(e, sh.id, part)}
        />
      ))}
      {drag?.type === 'shadow' && <Shadow shadow={{ id: 'preview', ...drawnShadow(drag) }} selected={false} />}

      {arrows.map((a) => (
        <Arrow
          key={a.id}
          arrow={a}
          selected={a.id === selectedId}
          onPointerDown={(e, part) => startElementDrag(e, a.id, part)}
        />
      ))}
      {drag?.type === 'arrow' && (
        <Arrow arrow={{ id: 'preview', ...drawnArrow(drag) }} selected={false} />
      )}

      {points.map((el) => {
        const selected = el.id === selectedId;
        const up = vertical ? ' rotate(90)' : '';
        const down = (e: ReactPointerEvent<SVGElement>) => startElementDrag(e, el.id);
        switch (el.kind) {
          case 'player':
            return (
              <PlayerMark
                key={el.id}
                token={el}
                player={el.playerId ? playersById.get(el.playerId) : undefined}
                selected={selected}
                onPointerDown={down}
              />
            );
          case 'ball':
            return (
              <g key={el.id} className="el" transform={`translate(${el.x} ${el.y})${up}`} onPointerDown={down} data-id={el.id}>
                {selected && <Halo r={0.4} />}
                <circle r={0.24} fill="#ffffff" stroke="#1e3a8a" strokeWidth={0.05} />
                <path d="M-0.24,0 Q0,-0.12 0.24,0 M-0.08,-0.22 Q0.06,0 -0.08,0.22" fill="none" stroke="#2563eb" strokeWidth={0.04} />
              </g>
            );
          case 'cone':
            return (
              <g key={el.id} className="el" transform={`translate(${el.x} ${el.y})${up}`} onPointerDown={down} data-id={el.id}>
                {selected && <Halo r={0.4} />}
                <polygon points="0,-0.28 0.25,0.2 -0.25,0.2" fill="#fde047" stroke="#713f12" strokeWidth={0.04} />
              </g>
            );
          case 'coach':
            return (
              <g key={el.id} className="el" transform={`translate(${el.x} ${el.y})${up}`} onPointerDown={down} data-id={el.id}>
                {selected && <Halo r={0.55} />}
                <rect x={-0.38} y={-0.38} width={0.76} height={0.76} rx={0.12} fill="#111827" stroke="#ffffff" strokeWidth={0.05} />
                <text textAnchor="middle" dominantBaseline="central" fontSize={0.4} fontWeight={700} fill="#ffffff">E</text>
              </g>
            );
          case 'text':
            return (
              <TextMark
                key={el.id}
                element={el}
                selected={selected}
                onPointerDown={down}
                onHandleDown={(e, part) => startElementDrag(e, el.id, part)}
              />
            );
          case 'cart':
            return (
              <g key={el.id} className="el" transform={`translate(${el.x} ${el.y})${up} scale(1.25)`} onPointerDown={down} data-id={el.id}>
                {selected && <Halo r={0.75} />}
                {/* Carro de pelotas visto desde arriba: canasto con pelotas, manija y ruedas. */}
                <line x1={0.5} y1={0} x2={0.78} y2={0} stroke="#ffffff" strokeWidth={0.07} strokeLinecap="round" />
                <line x1={0.78} y1={-0.22} x2={0.78} y2={0.22} stroke="#ffffff" strokeWidth={0.07} strokeLinecap="round" />
                {[
                  [-0.42, -0.42],
                  [0.42, -0.42],
                  [-0.42, 0.42],
                  [0.42, 0.42],
                ].map(([cx, cy]) => (
                  <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={0.08} fill="#1c1915" stroke="#ffffff" strokeWidth={0.03} />
                ))}
                <rect x={-0.5} y={-0.38} width={1} height={0.76} rx={0.08} fill="#2b2925" stroke="#d8d2c4" strokeWidth={0.05} />
                {[
                  [-0.27, -0.16, '#ffffff'],
                  [0, -0.16, '#F2C744'],
                  [0.27, -0.16, '#2F5DA8'],
                  [-0.27, 0.16, '#F2C744'],
                  [0, 0.16, '#2F5DA8'],
                  [0.27, 0.16, '#ffffff'],
                ].map(([cx, cy, fill]) => (
                  <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={0.13} fill={fill as string} stroke="#1c1915" strokeWidth={0.025} />
                ))}
              </g>
            );
          case 'step':
            return (
              // Gira con la cancha (es un objeto en el piso) y con su propio giro.
              <g key={el.id} className="el" transform={`translate(${el.x} ${el.y}) rotate(${el.rotation ?? 0})`} onPointerDown={down} data-id={el.id}>
                {selected && <Halo r={0.75} />}
                {/* Banquito / cajón visto desde arriba: tapa de madera con borde y sombra. */}
                <rect x={-0.42} y={-0.3} width={0.9} height={0.66} rx={0.08} fill="#000000" opacity={0.25} />
                <rect x={-0.45} y={-0.33} width={0.9} height={0.66} rx={0.08} fill="#8B5A2B" stroke="#ffffff" strokeWidth={0.05} />
                <rect x={-0.33} y={-0.21} width={0.66} height={0.42} rx={0.05} fill="#B07A3C" stroke="#5c3a1a" strokeWidth={0.025} />
                <line x1={-0.33} y1={0} x2={0.33} y2={0} stroke="#5c3a1a" strokeWidth={0.02} opacity={0.6} />
              </g>
            );
          case 'machine':
            return (
              // Gira con la cancha y apunta hacia donde tira.
              <g key={el.id} className="el" transform={`translate(${el.x} ${el.y}) rotate(${el.rotation ?? 0}) scale(1.5)`} onPointerDown={down} data-id={el.id}>
                {selected && <Halo r={0.85} />}
                {/* Máquina lanzadora vista desde arriba: base, ruedas, tolva con pelotas y caño hacia adelante. */}
                <rect x={-0.48} y={-0.4} width={0.9} height={0.8} rx={0.1} fill="#000000" opacity={0.25} />
                {[-0.42, 0.42].map((y) => (
                  <rect key={y} x={-0.42} y={y - 0.07} width={0.26} height={0.14} rx={0.05} fill="#111111" />
                ))}
                <rect x={-0.5} y={-0.36} width={0.86} height={0.72} rx={0.12} fill="#3E4A5A" stroke="#ffffff" strokeWidth={0.05} />
                <rect x={0.3} y={-0.11} width={0.52} height={0.22} rx={0.06} fill="#2b2925" stroke="#ffffff" strokeWidth={0.04} />
                <circle cx={-0.12} cy={0} r={0.24} fill="#1c1915" stroke="#d8d2c4" strokeWidth={0.03} />
                {[
                  [-0.2, -0.08, '#F2C744'],
                  [-0.04, -0.08, '#ffffff'],
                  [-0.12, 0.08, '#2F5DA8'],
                ].map(([cx, cy, fill]) => (
                  <circle key={`${cx}${cy}`} cx={cx as number} cy={cy as number} r={0.075} fill={fill as string} />
                ))}
                <path d="M0.88 -0.1 L1.05 0 L0.88 0.1 Z" fill="#E3C48B" />
              </g>
            );
          case 'hoop':
            return (
              <g key={el.id} className="el" transform={`translate(${el.x} ${el.y})`} onPointerDown={down} data-id={el.id}>
                {selected && <Halo r={0.75} />}
                {/* Aro de precisión (1 m de diámetro): se puede tocar en todo el círculo. */}
                <circle r={0.5} fill={el.color ?? HOOP_COLORS[0].value} fillOpacity={0.14} stroke={el.color ?? HOOP_COLORS[0].value} strokeWidth={0.1} />
                <circle r={0.5} fill="none" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={0.025} />
              </g>
            );
        }
      })}
      {onDelete && !readOnly && !drag && selectedEl && (
        <DeleteButton element={selectedEl} onDelete={() => onDelete(selectedEl.id)} />
      )}
      {onComment && !readOnly && !drag && selectedEl?.kind === 'player' && (
        <CommentButton element={selectedEl} onComment={() => onComment(selectedEl.id)} />
      )}
      </g>
    </svg>
    </VerticalContext.Provider>
  );
}

function Halo({ r }: { r: number }) {
  return <circle className="ui-only" r={r} fill="none" stroke={SELECTION_COLOR} strokeWidth={0.09} strokeDasharray="0.15 0.1" />;
}

function Court({ showZones, teamNames, half = false }: { showZones: boolean; teamNames?: TeamNames; half?: boolean }) {
  const vertical = useContext(VerticalContext);
  // Textos derechos aunque la cancha esté girada.
  const upright = (x: number, y: number) => (vertical ? `rotate(90 ${x} ${y})` : undefined);
  const line = { stroke: COURT_COLORS.lines, strokeWidth: 0.05 };
  const B = COURT_COLORS.band;
  const board = COURT_COLORS.boardDepth;
  // Ancho visible: en media cancha, hasta un poco pasando la red.
  const W = half ? NET_X + 1.5 - VIEW.minX : VIEW.width;
  // En media cancha, la franja y la cancha se cortan antes del borde, con el mismo margen que del otro lado.
  const ring = -B.ends - (VIEW.minX + board);
  const cutAt = VIEW.minX + W - board - ring;
  return (
    <g pointerEvents="none">
      <defs>
        {/* Tablas de madera a lo largo de la cancha. */}
        <pattern id="court-planks" width="3" height="0.24" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0.12" x2="3" y2="0.12" stroke="#7a5326" strokeOpacity="0.07" strokeWidth="0.02" />
          <line x1="1.9" y1="0" x2="1.9" y2="0.12" stroke="#7a5326" strokeOpacity="0.06" strokeWidth="0.02" />
          <line x1="0.7" y1="0.12" x2="0.7" y2="0.24" stroke="#7a5326" strokeOpacity="0.06" strokeWidth="0.02" />
        </pattern>
      </defs>
      {/* Piso del estadio y carteles en los bordes. */}
      <rect x={VIEW.minX} y={VIEW.minY} width={W} height={VIEW.height} fill={COURT_COLORS.boards} />
      <rect
        x={VIEW.minX + board}
        y={VIEW.minY + board}
        width={W - board * 2}
        height={VIEW.height - board * 2}
        fill={COURT_COLORS.floor}
      />
      <rect
        x={VIEW.minX + board}
        y={VIEW.minY + board}
        width={W - board * 2}
        height={VIEW.height - board * 2}
        fill="url(#court-planks)"
      />
      {half && (
        <clipPath id="half-court-clip">
          <rect x={VIEW.minX} y={VIEW.minY} width={cutAt - VIEW.minX} height={VIEW.height} />
        </clipPath>
      )}
      <g clipPath={half ? 'url(#half-court-clip)' : undefined}>
      {/* Franja azul alrededor de la cancha. */}
      <rect x={-B.ends} y={-B.sides} width={COURT_LENGTH + B.ends * 2} height={COURT_WIDTH + B.sides * 2} fill={COURT_COLORS.bandColor} />
      {/* Cancha de madera, con la zona de ataque más oscura. */}
      <rect x={0} y={0} width={COURT_LENGTH} height={COURT_WIDTH} fill={COURT_COLORS.court} />
      <rect x={NET_X - ATTACK_LINE_DIST} y={0} width={ATTACK_LINE_DIST * 2} height={COURT_WIDTH} fill={COURT_COLORS.frontZone} />
      <rect x={0} y={0} width={COURT_LENGTH} height={COURT_WIDTH} fill="url(#court-planks)" />
      <rect x={0} y={0} width={COURT_LENGTH} height={COURT_WIDTH} fill="none" {...line} />
      <line x1={NET_X - ATTACK_LINE_DIST} y1={0} x2={NET_X - ATTACK_LINE_DIST} y2={COURT_WIDTH} {...line} />
      <line x1={NET_X + ATTACK_LINE_DIST} y1={0} x2={NET_X + ATTACK_LINE_DIST} y2={COURT_WIDTH} {...line} />
      {showZones &&
        (['A', 'B'] as Team[]).flatMap((team) =>
          ZONES.map((z) => {
            const c = toCourt(team, ZONE_LABEL[z].depth, ZONE_LABEL[z].lateral);
            return (
              <text key={`${team}${z}`} x={c.x} y={c.y} transform={upright(c.x, c.y)} textAnchor="middle" dominantBaseline="central" fontFamily={DISPLAY_FONT} fontSize={0.95} fontWeight={700} fill={COURT_COLORS.zoneText} opacity={0.35}>
                {z}
              </text>
            );
          }),
        )}
      <line x1={NET_X} y1={-0.7} x2={NET_X} y2={COURT_WIDTH + 0.7} stroke={COURT_COLORS.net} strokeWidth={0.14} />
      <circle cx={NET_X} cy={-0.8} r={0.16} fill={COURT_COLORS.net} />
      <circle cx={NET_X} cy={COURT_WIDTH + 0.8} r={0.16} fill={COURT_COLORS.net} />
      </g>
      {(teamNames?.hidden ? [] : half ? (['A'] as Team[]) : (['A', 'B'] as Team[])).map((team) => {
        // Horizontal: arriba de cada mitad. Vertical: centrado en la franja de abajo (A) y de arriba (B).
        const x = vertical ? (team === 'A' ? -1.4 : COURT_LENGTH + 1.4) : team === 'A' ? NET_X / 2 : NET_X + NET_X / 2;
        const y = vertical ? COURT_WIDTH / 2 : -1.4;
        const name = teamNames?.[team]?.trim() || `Equipo ${team}`;
        return (
          <text
            key={team}
            x={x}
            y={y}
            transform={upright(x, y)}
            dominantBaseline={vertical ? 'central' : undefined}
            textAnchor="middle"
            fontFamily={DISPLAY_FONT}
            fontSize={name.length > 18 ? 0.5 : 0.66}
            fontWeight={700}
            letterSpacing={0.06}
            fill="#ffffff"
          >
            {name.toUpperCase()}
          </text>
        );
      })}
    </g>
  );
}

function Arrow({
  arrow,
  selected,
  onPointerDown,
}: {
  arrow: ArrowElement;
  selected: boolean;
  onPointerDown?: (e: ReactPointerEvent<SVGElement>, part: ArrowPart) => void;
}) {
  const { x1, y1, x2, y2 } = arrow;
  const d = arrowPath(arrow);
  const mid = midPoint(arrow);
  const color = arrowColor(arrow);
  return (
    <g className={onPointerDown ? 'el' : undefined} data-id={arrow.id}>
      {selected && (
        <path className="ui-only" d={d} fill="none" stroke={SELECTION_COLOR} strokeOpacity={0.45} strokeWidth={0.3} strokeLinecap="round" pointerEvents="none" />
      )}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={0.08}
        strokeLinecap="round"
        strokeDasharray={arrowDashed(arrow) ? '0.25 0.15' : undefined}
        markerEnd={`url(#${headMarkerId(color)})`}
        pointerEvents="none"
      />
      {onPointerDown && (
        <path d={d} fill="none" stroke="transparent" strokeWidth={0.45} onPointerDown={(e) => onPointerDown(e, 'whole')} />
      )}
      {selected && onPointerDown && (
        <>
          <circle className="handle ui-only" cx={x1} cy={y1} r={0.18 * HANDLE} onPointerDown={(e) => onPointerDown(e, 'start')} />
          <circle className="handle ui-only" cx={x2} cy={y2} r={0.18 * HANDLE} onPointerDown={(e) => onPointerDown(e, 'end')} />
          <circle className="handle handle-curve ui-only" cx={mid.x} cy={mid.y} r={0.2 * HANDLE} onPointerDown={(e) => onPointerDown(e, 'mid')}>
            <title>Arrastrá para curvar la flecha</title>
          </circle>
        </>
      )}
    </g>
  );
}

function PlayerMark({
  token,
  player,
  selected,
  onPointerDown,
}: {
  token: PlayerToken;
  player?: Player;
  selected: boolean;
  onPointerDown: (e: ReactPointerEvent<SVGElement>) => void;
}) {
  const caption = player ? `${player.name} · ${positionShort(player.position)}` : '';
  const commentLines = token.comment ? wrapText(token.comment, 24) : [];
  const up = useUpright();
  return (
    <g className="el" transform={`translate(${token.x} ${token.y})${up}`} onPointerDown={onPointerDown} data-id={token.id}>
      {selected && <Halo r={0.6} />}
      <circle
        r={0.42}
        fill={(player?.position ?? token.role) === 'libero' ? LIBERO_COLORS[token.team] : TEAM_COLORS[token.team]}
        stroke="#ffffff"
        strokeWidth={0.06}
      />
      <text textAnchor="middle" dominantBaseline="central" fontSize={0.36} fontWeight={700} fill="#ffffff">
        {token.label}
      </text>
      {caption && (
        <text y={0.72} textAnchor="middle" fontSize={0.28} fontWeight={600} fill="#111827" stroke="#ffffff" strokeWidth={0.08} paintOrder="stroke">
          {caption}
        </text>
      )}
      {commentLines.length > 0 && (
        <text
          textAnchor="middle"
          fontSize={0.36}
          fontWeight={700}
          fontStyle="italic"
          fill={COMMENT_COLOR}
          stroke="#ffffff"
          strokeWidth={0.12}
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {commentLines.map((line, i) => (
            <tspan key={i} x={0} y={(caption ? 1.15 : 0.85) + i * 0.42}>
              {line}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
}

/** Dónde va el tachito: arriba a la derecha del elemento (o del medio de la flecha). */
/** Dónde va el tachito: arriba a la derecha del elemento (en la pantalla, aunque la pizarra esté girada). */
function deleteButtonSpot(el: BoardElement, vertical: boolean) {
  if (el.kind === 'arrow') {
    const m = midPoint(el);
    return screenOffset(m.x, m.y, 0.6, 0.6, vertical);
  }
  if (el.kind === 'shadow') {
    return screenOffset((el.x1 + el.x2) / 2, (el.y1 + el.y2) / 2, 0.5, 0.5, vertical);
  }
  if (el.kind === 'text') {
    const box = textBox(el);
    // Arriba a la derecha, sin tapar los agarres del borde y la esquina.
    const pad = textPadding(textFontSize(el));
    return screenOffset(el.x, el.y, box.width / 2 + pad.x + 0.35, box.height / 2 + pad.y + 0.3, vertical);
  }
  const offset = el.kind === 'player' ? 0.62 : 0.5;
  return screenOffset(el.x, el.y, offset, offset, vertical);
}

/** Botón redondo con un tachito de basura que borra el elemento seleccionado. */
function DeleteButton({ element, onDelete }: { element: BoardElement; onDelete: () => void }) {
  const vertical = useContext(VerticalContext);
  const p = deleteButtonSpot(element, vertical);
  return (
    <g
      className="delete-button ui-only"
      transform={`translate(${p.x} ${p.y})${vertical ? ' rotate(90)' : ''}`}
      role="button"
      aria-label="Eliminar elemento"
      tabIndex={0}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onDelete();
        }
      }}
    >
      <title>Eliminar (Supr)</title>
      <circle r={0.34} fill="#7A1424" stroke="#ffffff" strokeWidth={0.05} />
      <g transform="translate(-0.19 -0.2) scale(0.016)" fill="none" stroke="#ffffff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6" />
      </g>
    </g>
  );
}

/** Sombra del bloqueo: trapecio translúcido que se abre desde el bloqueo. */
function Shadow({
  shadow,
  selected,
  onPointerDown,
}: {
  shadow: BlockShadowElement;
  selected: boolean;
  onPointerDown?: (e: ReactPointerEvent<SVGElement>, part: ArrowPart) => void;
}) {
  const points = shadowPoints(shadow);
  return (
    <g className={onPointerDown ? 'el' : undefined} data-id={shadow.id}>
      <polygon
        points={points}
        fill="#0E1A2B"
        fillOpacity={0.22}
        stroke={selected ? SELECTION_COLOR : '#0E1A2B'}
        strokeOpacity={selected ? 1 : 0.55}
        strokeWidth={selected ? 0.07 : 0.04}
        strokeDasharray="0.2 0.12"
        strokeLinejoin="round"
        onPointerDown={onPointerDown ? (e) => onPointerDown(e, 'whole') : undefined}
        pointerEvents={onPointerDown ? undefined : 'none'}
      />
      {selected && onPointerDown && (
        <>
          <circle className="handle ui-only" cx={shadow.x1} cy={shadow.y1} r={0.18 * HANDLE} onPointerDown={(e) => onPointerDown(e, 'start')}>
            <title>Arrastrá para mover el inicio (el bloqueo)</title>
          </circle>
          <circle className="handle ui-only" cx={shadow.x2} cy={shadow.y2} r={0.18 * HANDLE} onPointerDown={(e) => onPointerDown(e, 'end')}>
            <title>Arrastrá para mover el final de la sombra</title>
          </circle>
        </>
      )}
    </g>
  );
}

/** Texto escrito en el tablero. */
/** Margen del cuadro de selección alrededor del texto (crece con la letra). */
function textPadding(size: number) {
  return { x: 0.15 + size * 0.1, y: 0.1 + size * 0.06 };
}

function TextMark({
  element,
  selected,
  onPointerDown,
  onHandleDown,
}: {
  element: TextElement;
  selected: boolean;
  onPointerDown: (e: ReactPointerEvent<SVGElement>) => void;
  onHandleDown?: (e: ReactPointerEvent<SVGElement>, part: 'width' | 'scale') => void;
}) {
  const size = textFontSize(element);
  const lines = textLines(element);
  const box = textBox(element);
  const top = -box.height / 2;
  const pad = textPadding(size);
  const up = useUpright();
  // Contorno contrastante para que se lea sobre la madera o la franja azul (se puede sacar).
  const halo = element.outline === false ? 'none' : element.color.toUpperCase() === '#FFFFFF' ? '#0E1A2B' : '#FFFFFF';
  return (
    <g className="el" transform={`translate(${element.x} ${element.y})${up}`} onPointerDown={onPointerDown} data-id={element.id}>
      {/* Área para tocarlo y arrastrarlo. */}
      <rect x={-box.width / 2 - pad.x} y={top - pad.y} width={box.width + 2 * pad.x} height={box.height + 2 * pad.y} fill="transparent" />
      <text
        // Vacío muestra "Texto" tenue como ayuda (no sale al exportar).
        className={element.text ? undefined : 'ui-only'}
        opacity={element.text ? undefined : 0.4}
        textAnchor="middle"
        fontSize={size}
        fontWeight={700}
        fill={element.color}
        stroke={halo}
        strokeWidth={size * 0.16}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {lines.map((line, i) => (
          <tspan key={i} x={0} y={top + size * (i * 1.2 + 0.95)}>
            {line || ' '}
          </tspan>
        ))}
      </text>
      {/* El cuadro de selección va encima del texto para que el contorno blanco no lo tape. */}
      {selected && (
        <rect
          className="ui-only"
          x={-box.width / 2 - pad.x}
          y={top - pad.y}
          width={box.width + 2 * pad.x}
          height={box.height + 2 * pad.y}
          rx={0.1}
          fill="none"
          stroke={SELECTION_COLOR}
          strokeWidth={0.07}
          strokeDasharray="0.15 0.1"
          pointerEvents="none"
        />
      )}
      {selected && onHandleDown && (
        <>
          <rect
            className="handle handle-width ui-only"
            x={box.width / 2 + pad.x - 0.09 * HANDLE}
            y={-0.28 * HANDLE}
            width={0.18 * HANDLE}
            height={0.56 * HANDLE}
            rx={0.07}
            onPointerDown={(e) => onHandleDown(e, 'width')}
          >
            <title>Arrastrá para cambiar el ancho del cuadro</title>
          </rect>
          <circle
            className="handle handle-scale ui-only"
            cx={box.width / 2 + pad.x}
            cy={-top + pad.y}
            r={0.18 * HANDLE}
            onPointerDown={(e) => onHandleDown(e, 'scale')}
          >
            <title>Arrastrá para agrandar o achicar la letra</title>
          </circle>
        </>
      )}
    </g>
  );
}

/** Color de los comentarios debajo de los jugadores. */
const COMMENT_COLOR = '#1F3C9C';

/** Botón al lado del tachito para escribir un comentario del jugador. */
function CommentButton({ element, onComment }: { element: PlayerToken; onComment: () => void }) {
  const vertical = useContext(VerticalContext);
  const d = deleteButtonSpot(element, vertical);
  const p = screenOffset(d.x, d.y, 0.78, 0, vertical);
  return (
    <g
      className="comment-button ui-only"
      transform={`translate(${p.x} ${p.y})${vertical ? ' rotate(90)' : ''}`}
      role="button"
      aria-label="Comentar jugador"
      tabIndex={0}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onComment();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onComment();
        }
      }}
    >
      <title>Agregar un comentario debajo del jugador</title>
      <circle r={0.34} fill="#2F3A4A" stroke="#ffffff" strokeWidth={0.05} />
      <g transform="translate(-0.19 -0.19) scale(0.016)" fill="none" stroke="#ffffff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5h16v11H9l-5 4zM8 9h8M8 12h5" />
      </g>
    </g>
  );
}
