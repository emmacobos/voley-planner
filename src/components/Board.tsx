import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode, Ref } from 'react';
import {
  ATTACK_LINE_DIST,
  COURT_LENGTH,
  COURT_WIDTH,
  NET_X,
  VIEW,
  clampToView,
  toCourt,
} from '../domain/court';
import { ARROW_KINDS, arrowColor, arrowDashed, arrowKind, arrowPath, curveThrough, headMarkerId, midPoint } from '../domain/arrows';
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
import { boxMap, project, shrink, toCss, toMeters, toPx, unproject, viewMatrix } from '../domain/perspective';
import type { BoxMap, Mat4, View3D } from '../domain/perspective';
import { DEFAULT_DRAW_WIDTH, DRAW_COLORS, drawPath, moveStroke, simplifyStroke, strokeBounds, strokeLength, strokeWidth } from '../domain/drawing';
import type {
  ArrowElement,
  BlockShadowElement,
  DrawElement,
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
  onAddElement?: (element: Omit<BlockShadowElement, 'id'> | Omit<TextElement, 'id'> | Omit<DrawElement, 'id'>) => void;
  /** Color y grosor del lápiz (herramienta de dibujo libre). */
  pen?: { color: string; width: number };
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
  /** Vista inclinada (en perspectiva). Sin valor, la vista de arriba. */
  view3d?: View3D | null;
}

/** En la vista inclinada, estos elementos se ven parados (con su sombra); el resto queda en el piso. */
const STANDING = new Set<BoardElement['kind']>(['player', 'ball', 'cone', 'coach']);
/** A qué altura (m) se dibuja cada uno parado. */
const STAND_HEIGHT: Partial<Record<BoardElement['kind'], number>> = { player: 1, coach: 1, ball: 0.9, cone: 0.05 };
/** El piso inclinado se dibuja a esta escala (para que se vea nítido). */
const FLOOR_SCALE = 2;
/** Red: abajo y arriba de la faja (m). */
const NET_BOTTOM = 1.43;
const NET_TOP = 2.43;

/**
 * Qué parte se arrastra: el elemento entero, un extremo o el punto medio
 * (curva) de una flecha, o el borde (ancho) o la esquina (tamaño) de un texto.
 */
type ArrowPart = 'whole' | 'start' | 'end' | 'mid' | 'width' | 'scale';

type Drag =
  | { type: 'element'; id: string; part: ArrowPart; ox: number; oy: number; dx: number; dy: number }
  | { type: 'shadow'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'draw'; points: { x: number; y: number }[] }
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
  if (el.kind === 'draw') return moveStroke(el, dx, dy);
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
  vertical: verticalProp = false,
  teamNames,
  half = false,
  pen,
  view3d = null,
}: BoardProps) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const contentRef = useRef<SVGGElement>(null);
  const playersById = new Map(players.map((p) => [p.id, p]));
  // La vista inclinada parte de la horizontal.
  const vertical = view3d ? false : verticalProp;
  const viewBox = boardViewBox(vertical, half);

  // Vista inclinada: tamaño del recuadro y la transformación del piso.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!view3d || !el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox((b) => (b && b.w === r.width && b.h === r.height ? b : { w: r.width, h: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view3d]);
  const bm = view3d && box && box.w > 0 ? boxMap(viewBox, box.w, box.h) : null;
  const mat = (() => {
    if (!view3d || !bm || !box) return null;
    const right = half ? NET_X + 1.5 : COURT_LENGTH + 1.5;
    const keep = [
      [-1.5, -1.5, 0],
      [right, -1.5, 0],
      [right, COURT_WIDTH + 1.5, 0],
      [-1.5, COURT_WIDTH + 1.5, 0],
      [NET_X, -0.5, NET_TOP + 0.4],
      [NET_X, COURT_WIDTH + 0.5, NET_TOP + 0.4],
    ].map(([x, y, z]): [number, number, number] => {
      const p = toPx(bm, x, y);
      return [p.x, p.y, z * bm.scale];
    });
    return viewMatrix(view3d, box.w, box.h, keep);
  })();
  /** Punto de la pantalla en metros: en la vista inclinada, el punto del piso que se ve ahí. */
  const toBoard = (clientX: number, clientY: number, fallback: SVGGraphicsElement) => {
    if (mat && bm && wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect();
      const f = unproject(mat, clientX - r.left, clientY - r.top);
      return toMeters(bm, f.x, f.y);
    }
    return svgPoint(contentRef.current ?? fallback, clientX, clientY);
  };

  const point = (e: ReactPointerEvent<SVGSVGElement>) => toBoard(e.clientX, e.clientY, e.currentTarget);

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
    const p = toBoard(e.clientX, e.clientY, svg);
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
    if (tool === 'draw') {
      setDrag({ type: 'draw', points: [p] });
      return;
    }
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
    } else if (drag.type === 'draw') {
      setDrag({ ...drag, points: [...drag.points, p] });
    } else {
      setDrag({ ...drag, x2: p.x, y2: p.y });
    }
  };

  const onPointerUp = () => {
    if (!drag) return;
    if (drag.type === 'element') {
      const el = elements.find((x) => x.id === drag.id);
      if (el && (drag.dx !== 0 || drag.dy !== 0)) onUpdate(applyDrag(el, drag, vertical));
    } else if (drag.type === 'draw') {
      const points = simplifyStroke(drag.points);
      // Un toque sin arrastrar no deja marca.
      if (strokeLength(points) > 0.15) onAddElement?.({ kind: 'draw', points, ...currentPen });
    } else if (Math.hypot(drag.x2 - drag.x1, drag.y2 - drag.y1) > 0.3) {
      if (drag.type === 'shadow') onAddElement?.(drawnShadow(drag));
      else onAddArrow(drawnArrow(drag));
    }
    endDrag();
  };

  const currentPen = pen ?? { color: DRAW_COLORS[0].value, width: DEFAULT_DRAW_WIDTH };
  const shown = elements.map((el) => applyDrag(el, drag, vertical));
  const strokes = shown.filter((e): e is DrawElement => e.kind === 'draw');
  // Abajo las sombras del bloqueo, después las flechas y arriba el resto.
  const shadows = shown.filter((e): e is BlockShadowElement => e.kind === 'shadow');
  const arrows = shown.filter((e): e is ArrowElement => e.kind === 'arrow');
  // Aros y banquitos van en el piso: debajo de jugadores, pelotas y textos (una jugadora se puede parar arriba).
  const onFloor = (e: PointElement) => Number(e.kind === 'hoop' || e.kind === 'step');
  const points = shown.filter((e): e is PointElement => !isSegment(e)).sort((a, b) => onFloor(b) - onFloor(a));
  const selectedEl = shown.find((e) => e.id === selectedId) ?? null;

  /** Dibuja un elemento de un punto (ficha, pelota, cono…) en su lugar de la cancha, en metros. */
  const renderPoint = (el: PointElement, upright = vertical) => {
    const selected = el.id === selectedId;
    const up = upright ? ' rotate(90)' : '';
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
            <BallShape />
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
  };

  const floor = (
    <svg
      ref={svgRef}
      className={`board tool-${tool}${readOnly ? ' read-only' : ''}${vertical ? ' vertical' : ''}${half ? ' half' : ''}${view3d ? ' tilted' : ''}`}
      viewBox={viewBox}
      style={
        mat
          ? // Se dibuja al doble y se achica al inclinarlo: si no, el navegador lo agranda y se ve borroso.
            { width: `${FLOOR_SCALE * 100}%`, height: `${FLOOR_SCALE * 100}%`, transform: toCss(shrink(mat, FLOOR_SCALE)), transformOrigin: '0 0' }
          : undefined
      }
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

      {strokes.map((st) => (
        <Stroke key={st.id} stroke={st} selected={st.id === selectedId} onPointerDown={(e) => startElementDrag(e, st.id)} />
      ))}
      {drag?.type === 'draw' && (
        <Stroke stroke={{ id: 'preview', kind: 'draw', points: drag.points.flatMap((q) => [q.x, q.y]), ...currentPen }} selected={false} />
      )}

      {points.filter((el) => !(mat && STANDING.has(el.kind))).map((el) => renderPoint(el))}
      {onDelete && !readOnly && !drag && selectedEl && !(mat && STANDING.has(selectedEl.kind)) && (
        <DeleteButton element={selectedEl} onDelete={() => onDelete(selectedEl.id)} />
      )}
      {onComment && !readOnly && !drag && selectedEl?.kind === 'player' && !mat && (
        <CommentButton element={selectedEl} onComment={() => onComment(selectedEl.id)} />
      )}
      </g>
    </svg>
  );

  if (!view3d) return <VerticalContext.Provider value={vertical}>{floor}</VerticalContext.Provider>;
  const [, , vbW, vbH] = viewBox.split(' ').map(Number);
  return (
    <VerticalContext.Provider value={false}>
      <div ref={wrapRef} className={`board board-3d tool-${tool}${readOnly ? ' read-only' : ''}${half ? ' half' : ''}`} style={{ aspectRatio: `${vbW} / ${vbH}` }}>
        {floor}
        {mat && bm && (
          <StandingLayer
            mat={mat}
            bm={bm}
            elements={points.filter((el) => STANDING.has(el.kind))}
            selectedEl={selectedEl}
            render={(el) => renderPoint(el, false)}
            buttons={(el) => (
              <>
                {onDelete && !readOnly && !drag && <DeleteButton element={el} onDelete={() => onDelete(el.id)} />}
                {onComment && !readOnly && !drag && el.kind === 'player' && <CommentButton element={el} onComment={() => onComment(el.id)} />}
              </>
            )}
            onPointerDown={onBackgroundDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={endDrag}
          />
        )}
      </div>
    </VerticalContext.Provider>
  );
}

/**
 * Vista inclinada: lo que se ve parado (fichas, pelota, conos y la red), en px
 * de la pantalla, encima del piso en perspectiva. Lo de atrás de la red se
 * dibuja antes que la red, y lo de adelante después.
 */
function StandingLayer({
  mat,
  bm,
  elements,
  selectedEl,
  render,
  buttons,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  mat: Mat4;
  bm: BoxMap;
  elements: PointElement[];
  selectedEl: BoardElement | null;
  render: (el: PointElement) => ReactNode;
  buttons: (el: PointElement) => ReactNode;
  /** Tocar una ficha con una herramienta de dibujo empieza a dibujar desde ahí (como en la vista de arriba). */
  onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}) {
  /** Dónde se ve en la pantalla un punto de la cancha (en metros), a cierta altura (en metros). */
  const at = (x: number, y: number, z = 0) => {
    const p = toPx(bm, x, y);
    return project(mat, p.x, p.y, z * bm.scale);
  };
  const sideDepth = (x: number) => at(x, COURT_WIDTH / 2).depth;
  // El lado de la red que queda más lejos se dibuja primero.
  const farSide = sideDepth(NET_X - 3) > sideDepth(NET_X + 3) ? 'A' : 'B';
  const sideOf = (x: number) => (x < NET_X ? 'A' : 'B');

  const items = elements.map((el) => {
    const foot = at(el.x, el.y);
    const top = at(el.x, el.y, STAND_HEIGHT[el.kind] ?? 0);
    const right = at(el.x + 1, el.y);
    const down = at(el.x, el.y + 1);
    // Cuántos px de pantalla mide un metro ahí (más chico en el fondo).
    const k = (Math.hypot(right.x - foot.x, right.y - foot.y) + Math.hypot(down.x - foot.x, down.y - foot.y)) / 2;
    // La sombra se ve más achatada cuanto más acostada está la cancha.
    const [a, b] = [Math.hypot(right.x - foot.x, right.y - foot.y), Math.hypot(down.x - foot.x, down.y - foot.y)];
    const squash = Math.max(0.3, Math.min(a, b) / Math.max(a, b));
    return { el, foot, top, k, squash, depth: foot.depth };
  });
  const order = (side: 'A' | 'B') =>
    items.filter((it) => sideOf(it.el.x) === side).sort((a, b) => b.depth - a.depth);
  const near = farSide === 'A' ? 'B' : 'A';
  const flat = (x: number, y: number, z: number) => {
    const p = at(x, y, z);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  };
  const netEnd = COURT_WIDTH + 0.3;
  const net = (
    <g className="net-3d" pointerEvents="none">
      <polygon
        points={[flat(NET_X, -0.3, NET_BOTTOM), flat(NET_X, netEnd, NET_BOTTOM), flat(NET_X, netEnd, NET_TOP), flat(NET_X, -0.3, NET_TOP)].join(' ')}
        fill="#111111"
        fillOpacity={0.3}
        stroke="#111111"
        strokeOpacity={0.6}
      />
      {Array.from({ length: 16 }, (_, i) => {
        const y = (i * COURT_WIDTH) / 15;
        const [a, b] = [at(NET_X, y, NET_BOTTOM), at(NET_X, y, NET_TOP)];
        return <line key={`v${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff" strokeOpacity={0.18} />;
      })}
      {[0.25, 0.5, 0.75].map((f) => {
        const z = NET_BOTTOM + f * (NET_TOP - NET_BOTTOM);
        const [a, b] = [at(NET_X, -0.3, z), at(NET_X, netEnd, z)];
        return <line key={`h${f}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff" strokeOpacity={0.18} />;
      })}
      {(() => {
        const [a, b] = [at(NET_X, -0.3, NET_TOP), at(NET_X, netEnd, NET_TOP)];
        return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff" strokeWidth={2.5} />;
      })()}
      {[-0.5, COURT_WIDTH + 0.5].map((y) => {
        const [a, b] = [at(NET_X, y, 0), at(NET_X, y, NET_TOP + 0.15)];
        return <line key={y} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={COURT_COLORS.net} strokeWidth={Math.max(2, 0.12 * bm.scale)} strokeLinecap="round" />;
      })}
    </g>
  );
  const draw = (it: (typeof items)[number]) => {
    const { el, foot, top, k, squash } = it;
    const color = el.kind === 'player' ? TEAM_COLORS[el.team] : el.kind === 'ball' ? '#1e3a8a' : '#713f12';
    const selected = selectedEl?.id === el.id;
    return (
      <g key={el.id}>
        <ellipse cx={foot.x} cy={foot.y} rx={0.5 * k} ry={0.5 * k * squash} fill="#000000" fillOpacity={0.28} pointerEvents="none" />
        {STAND_HEIGHT[el.kind] && STAND_HEIGHT[el.kind]! > 0.2 ? (
          <line x1={foot.x} y1={foot.y} x2={top.x} y2={top.y} stroke={color} strokeWidth={Math.max(1.5, 0.12 * k)} strokeLinecap="round" pointerEvents="none" />
        ) : null}
        <g transform={`translate(${top.x} ${top.y}) scale(${k}) translate(${-el.x} ${-el.y})`}>
          {render(el)}
          {selected && buttons(el)}
        </g>
      </g>
    );
  };
  return (
    <svg
      className="board-standing"
      xmlns="http://www.w3.org/2000/svg"
      fontFamily="Barlow, system-ui, -apple-system, 'Segoe UI', sans-serif"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {order(farSide).map(draw)}
      {net}
      {order(near).map(draw)}
    </svg>
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
            letterSpacing={0.02}
            fill="#ffffff"
          >
            {/* Tal cual lo escribió (mayúsculas y minúsculas). */}
            {name}
          </text>
        );
      })}
    </g>
  );
}

/** Trazo hecho con el lápiz. */
function Stroke({
  stroke,
  selected,
  onPointerDown,
}: {
  stroke: DrawElement;
  selected: boolean;
  onPointerDown?: (e: ReactPointerEvent<SVGElement>) => void;
}) {
  const d = drawPath(stroke.points);
  const w = strokeWidth(stroke);
  return (
    <g className={onPointerDown ? 'el' : undefined} data-id={stroke.id}>
      {selected && (
        <path className="ui-only" d={d} fill="none" stroke={SELECTION_COLOR} strokeOpacity={0.45} strokeWidth={w + 0.24} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
      )}
      <path d={d} fill="none" stroke={stroke.color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
      {onPointerDown && (
        <path d={d} fill="none" stroke="transparent" strokeWidth={Math.max(0.45, w + 0.3)} strokeLinecap="round" strokeLinejoin="round" onPointerDown={onPointerDown} />
      )}
    </g>
  );
}

/** Pelota de vóley vista desde arriba, centrada en el origen. */
function BallShape({ r = 0.24 }: { r?: number }) {
  const k = r / 0.24;
  return (
    <g transform={k === 1 ? undefined : `scale(${k})`}>
      <circle r={0.24} fill="#ffffff" stroke="#1e3a8a" strokeWidth={0.05} />
      <path d="M-0.24,0 Q0,-0.12 0.24,0 M-0.08,-0.22 Q0.06,0 -0.08,0.22" fill="none" stroke="#2563eb" strokeWidth={0.04} />
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
  // La de pelota: trazo blanco medio transparente con la pelota en la punta.
  const ballTip = arrowKind(arrow) === 'pelota';
  return (
    <g className={onPointerDown ? 'el' : undefined} data-id={arrow.id}>
      {selected && (
        <path className="ui-only" d={d} fill="none" stroke={SELECTION_COLOR} strokeOpacity={0.45} strokeWidth={0.3} strokeLinecap="round" pointerEvents="none" />
      )}
      {ballTip ? (
        <g pointerEvents="none">
          <path d={d} fill="none" stroke="#000000" strokeOpacity={0.18} strokeWidth={0.15} strokeLinecap="round" />
          <path d={d} fill="none" stroke="#ffffff" strokeOpacity={0.7} strokeWidth={0.1} strokeLinecap="round" />
          <g transform={`translate(${x2} ${y2})`}>
            <BallShape r={0.2} />
          </g>
        </g>
      ) : (
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
      )}
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
  if (el.kind === 'draw') {
    const b = strokeBounds(el.points);
    const w = (b.x2 - b.x1) / 2 + 0.35;
    const h = (b.y2 - b.y1) / 2 + 0.35;
    return screenOffset((b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2, vertical ? h : w, vertical ? w : h, vertical);
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
