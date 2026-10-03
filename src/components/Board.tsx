import { useState } from 'react';
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
import type {
  ArrowElement,
  ArrowStyle,
  BoardElement,
  Player,
  PlayerToken,
  Team,
  Zone,
} from '../domain/types';
import { positionShort } from '../domain/types';
import { LIBERO_COLORS, TEAM_COLORS } from './boardTheme';
import type { Tool } from './boardTheme';


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
}

type Drag =
  | { type: 'element'; id: string; part: 'whole' | 'start' | 'end'; ox: number; oy: number; dx: number; dy: number }
  | { type: 'arrow'; style: ArrowStyle; x1: number; y1: number; x2: number; y2: number };

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

function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

function applyDrag(el: BoardElement, drag: Drag | null): BoardElement {
  if (!drag || drag.type !== 'element' || drag.id !== el.id) return el;
  const { dx, dy, part } = drag;
  if (el.kind === 'arrow') {
    return {
      ...el,
      ...(part !== 'end' ? { x1: el.x1 + dx, y1: el.y1 + dy } : {}),
      ...(part !== 'start' ? { x2: el.x2 + dx, y2: el.y2 + dy } : {}),
    };
  }
  const p = clampToView(el.x + dx, el.y + dy);
  return { ...el, ...p };
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
}: BoardProps) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const playersById = new Map(players.map((p) => [p.id, p]));

  const point = (e: ReactPointerEvent<SVGSVGElement>) => svgPoint(e.currentTarget, e.clientX, e.clientY);

  const startElementDrag = (
    e: ReactPointerEvent<SVGElement>,
    id: string,
    part: 'whole' | 'start' | 'end' = 'whole',
  ) => {
    if (readOnly || tool !== 'select') return;
    e.stopPropagation();
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    svg.setPointerCapture(e.pointerId);
    const p = svgPoint(svg, e.clientX, e.clientY);
    onSelect(id);
    setDrag({ type: 'element', id, part, ox: p.x, oy: p.y, dx: 0, dy: 0 });
  };

  const onBackgroundDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (readOnly) return;
    if (tool === 'select') {
      onSelect(null);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    setDrag({
      type: 'arrow',
      style: tool === 'arrow-move' ? 'move' : 'ball',
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
      if (el && (drag.dx !== 0 || drag.dy !== 0)) onUpdate(applyDrag(el, drag));
    } else if (Math.hypot(drag.x2 - drag.x1, drag.y2 - drag.y1) > 0.3) {
      onAddArrow({
        kind: 'arrow',
        style: drag.style,
        x1: drag.x1,
        y1: drag.y1,
        x2: drag.x2,
        y2: drag.y2,
      });
    }
    setDrag(null);
  };

  const shown = elements.map((el) => applyDrag(el, drag));
  // Las flechas se dibujan debajo del resto de los elementos.
  const arrows = shown.filter((e): e is ArrowElement => e.kind === 'arrow');
  const points = shown.filter((e) => e.kind !== 'arrow');

  return (
    <svg
      ref={svgRef}
      className={`board tool-${tool}${readOnly ? ' read-only' : ''}`}
      viewBox={`${VIEW.minX} ${VIEW.minY} ${VIEW.width} ${VIEW.height}`}
      xmlns="http://www.w3.org/2000/svg"
      fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
      onPointerDown={onBackgroundDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
    >
      <defs>
        <marker id="head-move" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#ffffff" />
        </marker>
        <marker id="head-ball" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#111827" />
        </marker>
      </defs>

      <Court showZones={showZones} />

      {arrows.map((a) => (
        <Arrow
          key={a.id}
          arrow={a}
          selected={a.id === selectedId}
          onPointerDown={(e, part) => startElementDrag(e, a.id, part)}
        />
      ))}
      {drag?.type === 'arrow' && (
        <Arrow arrow={{ id: 'preview', kind: 'arrow', ...drag }} selected={false} />
      )}

      {points.map((el) => {
        const selected = el.id === selectedId;
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
              <g key={el.id} className="el" transform={`translate(${el.x} ${el.y})`} onPointerDown={down}>
                {selected && <Halo r={0.4} />}
                <circle r={0.24} fill="#ffffff" stroke="#1e3a8a" strokeWidth={0.05} />
                <path d="M-0.24,0 Q0,-0.12 0.24,0 M-0.08,-0.22 Q0.06,0 -0.08,0.22" fill="none" stroke="#2563eb" strokeWidth={0.04} />
              </g>
            );
          case 'cone':
            return (
              <g key={el.id} className="el" transform={`translate(${el.x} ${el.y})`} onPointerDown={down}>
                {selected && <Halo r={0.4} />}
                <polygon points="0,-0.28 0.25,0.2 -0.25,0.2" fill="#fde047" stroke="#713f12" strokeWidth={0.04} />
              </g>
            );
          case 'coach':
            return (
              <g key={el.id} className="el" transform={`translate(${el.x} ${el.y})`} onPointerDown={down}>
                {selected && <Halo r={0.55} />}
                <rect x={-0.38} y={-0.38} width={0.76} height={0.76} rx={0.12} fill="#111827" stroke="#ffffff" strokeWidth={0.05} />
                <text textAnchor="middle" dominantBaseline="central" fontSize={0.4} fontWeight={700} fill="#ffffff">E</text>
              </g>
            );
          case 'cart':
            return (
              <g key={el.id} className="el" transform={`translate(${el.x} ${el.y})`} onPointerDown={down}>
                {selected && <Halo r={0.6} />}
                <rect x={-0.45} y={-0.3} width={0.9} height={0.6} rx={0.06} fill="#78350f" stroke="#ffffff" strokeWidth={0.04} />
                {[-0.22, 0, 0.22].map((cx) => (
                  <circle key={cx} cx={cx} cy={0} r={0.1} fill="#ffffff" />
                ))}
              </g>
            );
        }
      })}
    </svg>
  );
}

function Halo({ r }: { r: number }) {
  return <circle r={r} fill="none" stroke="#facc15" strokeWidth={0.08} strokeDasharray="0.15 0.1" />;
}

function Court({ showZones }: { showZones: boolean }) {
  const line = { stroke: '#ffffff', strokeWidth: 0.05 };
  return (
    <g pointerEvents="none">
      <rect x={VIEW.minX} y={VIEW.minY} width={VIEW.width} height={VIEW.height} fill="#2f7d6d" />
      <rect x={0} y={0} width={COURT_LENGTH} height={COURT_WIDTH} fill="#f4a259" />
      <rect x={0} y={0} width={COURT_LENGTH} height={COURT_WIDTH} fill="none" {...line} />
      <line x1={NET_X - ATTACK_LINE_DIST} y1={0} x2={NET_X - ATTACK_LINE_DIST} y2={COURT_WIDTH} {...line} />
      <line x1={NET_X + ATTACK_LINE_DIST} y1={0} x2={NET_X + ATTACK_LINE_DIST} y2={COURT_WIDTH} {...line} />
      {showZones &&
        (['A', 'B'] as Team[]).flatMap((team) =>
          ZONES.map((z) => {
            const c = toCourt(team, ZONE_LABEL[z].depth, ZONE_LABEL[z].lateral);
            return (
              <text key={`${team}${z}`} x={c.x} y={c.y} textAnchor="middle" dominantBaseline="central" fontSize={0.9} fontWeight={700} fill="#ffffff" opacity={0.45}>
                {z}
              </text>
            );
          }),
        )}
      <line x1={NET_X} y1={-0.7} x2={NET_X} y2={COURT_WIDTH + 0.7} stroke="#1f2937" strokeWidth={0.14} />
      <circle cx={NET_X} cy={-0.8} r={0.15} fill="#1f2937" />
      <circle cx={NET_X} cy={COURT_WIDTH + 0.8} r={0.15} fill="#1f2937" />
      <text x={NET_X / 2} y={-1.6} textAnchor="middle" fontSize={0.6} fontWeight={700} fill={TEAM_COLORS.A} stroke="#ffffff" strokeWidth={0.12} paintOrder="stroke">
        Equipo A
      </text>
      <text x={NET_X + NET_X / 2} y={-1.6} textAnchor="middle" fontSize={0.6} fontWeight={700} fill={TEAM_COLORS.B} stroke="#ffffff" strokeWidth={0.12} paintOrder="stroke">
        Equipo B
      </text>
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
  onPointerDown?: (e: ReactPointerEvent<SVGElement>, part: 'whole' | 'start' | 'end') => void;
}) {
  const isMove = arrow.style === 'move';
  const { x1, y1, x2, y2 } = arrow;
  return (
    <g className={onPointerDown ? 'el' : undefined}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={selected ? '#facc15' : isMove ? '#ffffff' : '#111827'}
        strokeWidth={0.08}
        strokeDasharray={isMove ? '0.25 0.15' : undefined}
        markerEnd={`url(#head-${arrow.style})`}
        pointerEvents="none"
      />
      {onPointerDown && (
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={0.45} onPointerDown={(e) => onPointerDown(e, 'whole')} />
      )}
      {selected && onPointerDown && (
        <>
          <circle className="handle" cx={x1} cy={y1} r={0.18} onPointerDown={(e) => onPointerDown(e, 'start')} />
          <circle className="handle" cx={x2} cy={y2} r={0.18} onPointerDown={(e) => onPointerDown(e, 'end')} />
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
  return (
    <g className="el" transform={`translate(${token.x} ${token.y})`} onPointerDown={onPointerDown}>
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
    </g>
  );
}
