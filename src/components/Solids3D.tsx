import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { MachineElement } from '../domain/types';
import { HOOP_COLORS, SELECTION_COLOR } from './boardTheme';
import { SOLID_HEIGHT } from './solids';
import type { SolidElement } from './solids';

type Pt = { x: number; y: number; depth: number };
/** Dónde se ve en la pantalla un punto de la cancha (en metros) a cierta altura (en metros). */
type At = (x: number, y: number, z?: number) => Pt;

const pts = (list: Pt[]) => list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

/** Oscurece (o aclara) un color #rrggbb. */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Un objeto en su lugar, girado (`rotation`, en grados, como en la vista de
 * arriba): convierte coordenadas propias (u adelante, v al costado, z arriba)
 * en puntos de la pantalla.
 */
function placer(at: At, x: number, y: number, rotation = 0) {
  const r = (rotation * Math.PI) / 180;
  const [c, s] = [Math.cos(r), Math.sin(r)];
  return (u: number, v: number, z = 0) => at(x + c * u - s * v, y + s * u + c * v, z);
}

/** Centro y giro de un objeto corrido `u` metros hacia adelante (por ejemplo, la tolva de la máquina, hacia atrás). */
function shift(el: MachineElement, u: number): [number, number, number] {
  const r = ((el.rotation ?? 0) * Math.PI) / 180;
  return [el.x + Math.cos(r) * u, el.y + Math.sin(r) * u, el.rotation ?? 0];
}

/**
 * Una caja de L × W × H (m), apoyada a la altura z0: las caras que se ven
 * (las de atrás no se dibujan), con las de los costados un poco más oscuras.
 */
function box(place: ReturnType<typeof placer>, L: number, W: number, H: number, color: string, z0 = 0, top?: string): ReactNode[] {
  const [a, b] = [L / 2, W / 2];
  const corners: [number, number][] = [
    [-a, -b],
    [a, -b],
    [a, b],
    [-a, b],
  ];
  const faces: ReactNode[] = [];
  const sides = corners.map((p, i) => {
    const q = corners[(i + 1) % 4];
    const [mu, mv] = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    // Se ve si, saliendo de la cara hacia afuera, se acerca a la cámara.
    const center = place(mu, mv, z0 + H / 2);
    const out = place(mu * 1.2, mv * 1.2, z0 + H / 2);
    const light = 0.72 + 0.16 * Math.sign(mu - mv);
    return { visible: out.depth < center.depth, poly: [place(p[0], p[1], z0), place(q[0], q[1], z0), place(q[0], q[1], z0 + H), place(p[0], p[1], z0 + H)], light, depth: center.depth };
  });
  sides
    .filter((f) => f.visible)
    .sort((x, y) => y.depth - x.depth)
    .forEach((f, i) => faces.push(<polygon key={`s${i}`} points={pts(f.poly)} fill={shade(color, f.light)} stroke={shade(color, 0.5)} strokeWidth={1} strokeLinejoin="round" />));
  faces.push(
    <polygon key="top" points={pts(corners.map(([u, v]) => place(u, v, z0 + H)))} fill={top ?? shade(color, 1.12)} stroke={shade(color, 0.5)} strokeWidth={1} strokeLinejoin="round" />,
  );
  return faces;
}

/** Envolvente convexa de puntos de la pantalla (para el cono). */
function hull(points: Pt[]): Pt[] {
  const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Contorno en el piso alrededor del objeto seleccionado. */
function SelectionOutline({ place, L, W }: { place: ReturnType<typeof placer>; L: number; W: number }) {
  const [a, b] = [L / 2 + 0.18, W / 2 + 0.18];
  return (
    <polygon
      className="ui-only"
      points={pts([place(-a, -b), place(a, -b), place(a, b), place(-a, b)])}
      fill="none"
      stroke={SELECTION_COLOR}
      strokeWidth={2.5}
      strokeDasharray="6 4"
      pointerEvents="none"
    />
  );
}

/** Sombra apenas corrida en el piso, para que el objeto "apoye". */
function FloorShadow({ place, L, W }: { place: ReturnType<typeof placer>; L: number; W: number }) {
  const [a, b] = [L / 2 + 0.06, W / 2 + 0.06];
  return <polygon points={pts([place(-a, -b), place(a, -b), place(a, b), place(-a, b)])} fill="#000000" fillOpacity={0.3} pointerEvents="none" />;
}

/** Carro, banquito, máquina o cono, en 3D y en su tamaño real. */
export function Solid3D({
  el,
  at,
  k,
  selected,
  onPointerDown,
  children,
}: {
  el: SolidElement;
  at: At;
  /** Px de pantalla por metro ahí (para el grosor de algunas líneas). */
  k: number;
  selected: boolean;
  onPointerDown: (e: ReactPointerEvent<SVGElement>) => void;
  /** Lo que va encima (por ejemplo, el tachito si está seleccionado). */
  children?: ReactNode;
}) {
  let body: ReactNode;
  let size: [number, number];
  if (el.kind === 'cart') {
    // Carro de pelotas: canasto con pelotas, manija y ruedas.
    const place = placer(at, el.x, el.y);
    const [L, W, H] = [1.2, 0.9, 0.75];
    size = [L, W];
    const balls: [number, number][] = [-0.4, 0, 0.4].flatMap((u) => [-0.2, 0.2].map((v): [number, number] => [u, v]));
    const handle = [place(-L / 2, -W / 2 + 0.1, H), place(-L / 2 - 0.25, -W / 2 + 0.1, H + 0.3), place(-L / 2 - 0.25, W / 2 - 0.1, H + 0.3), place(-L / 2, W / 2 - 0.1, H)];
    body = (
      <>
        <FloorShadow place={place} L={L} W={W} />
        {[
          [-L / 2 + 0.1, -W / 2],
          [L / 2 - 0.1, -W / 2],
          [L / 2 - 0.1, W / 2],
          [-L / 2 + 0.1, W / 2],
        ].map(([u, v]) => {
          const p = place(u, v, 0.08);
          return <circle key={`${u}${v}`} cx={p.x} cy={p.y} r={Math.max(2, 0.08 * k)} fill="#111111" />;
        })}
        {box(place, L, W, H - 0.1, '#2b2925', 0.1, '#1c1915')}
        {balls.map(([u, v], i) => {
          const p = place(u, v, H + 0.02);
          return <circle key={i} cx={p.x} cy={p.y} r={Math.max(2.5, 0.15 * k)} fill={i % 2 ? '#f2cf83' : '#ffffff'} stroke="#1c1915" strokeWidth={1} />;
        })}
        <polyline points={pts(handle)} fill="none" stroke="#d8d2c4" strokeWidth={Math.max(1.5, 0.04 * k)} strokeLinejoin="round" />
      </>
    );
  } else if (el.kind === 'step') {
    // Banquito / cajón de madera.
    const place = placer(at, el.x, el.y, el.rotation);
    const [L, W, H] = [0.9, 0.66, 0.45];
    size = [L, W];
    const inner = [place(-0.33, -0.21, H), place(0.33, -0.21, H), place(0.33, 0.21, H), place(-0.33, 0.21, H)];
    body = (
      <>
        <FloorShadow place={place} L={L} W={W} />
        {box(place, L, W, H, '#8B5A2B', 0, '#B07A3C')}
        <polygon points={pts(inner)} fill="none" stroke="#5c3a1a" strokeWidth={1} pointerEvents="none" />
      </>
    );
  } else if (el.kind === 'machine') {
    // Máquina lanzadora: base, tolva con pelotas y caño hacia adelante (hacia donde tira).
    const place = placer(at, el.x, el.y, el.rotation);
    const [L, W, H] = [1.2, 0.95, 0.55];
    size = [L, W];
    const [m0, m1] = [place(0.15, 0, H + 0.25), place(0.85, 0, H + 0.4)];
    const balls = [place(-0.28, -0.08, H + 0.4), place(-0.14, 0.1, H + 0.4), place(-0.3, 0.12, H + 0.4)];
    body = (
      <>
        <FloorShadow place={place} L={L} W={W} />
        {box(place, L, W, H, '#3E4A5A')}
        <g>{box(placer(at, ...shift(el, -0.2)), 0.5, 0.5, 0.35, '#2b2925', H, '#1c1915')}</g>
        {balls.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={Math.max(2, 0.11 * k)} fill="#ffffff" stroke="#1c1915" strokeWidth={1} />
        ))}
        <line x1={m0.x} y1={m0.y} x2={m1.x} y2={m1.y} stroke="#111111" strokeWidth={Math.max(3, 0.22 * k)} strokeLinecap="round" />
        <circle cx={m1.x} cy={m1.y} r={Math.max(2, 0.11 * k)} fill="#E3C48B" stroke="#111111" strokeWidth={1} />
      </>
    );
  } else if (el.kind === 'hoop' && el.height) {
    // Aro de armado: en un soporte (base y poste), a la altura elegida, con el aro horizontal.
    const place = placer(at, el.x, el.y);
    const color = el.color ?? HOOP_COLORS[0].value;
    const H = el.height;
    size = [1, 1];
    const ring = (radius: number, z: number) =>
      Array.from({ length: 40 }, (_, i) => place(radius * Math.cos((i / 40) * 2 * Math.PI), radius * Math.sin((i / 40) * 2 * Math.PI), z));
    const loop = (list: Pt[]) => `M${list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')}Z`;
    const [foot, top] = [place(0, 0, 0), place(0, 0, H - 0.05)];
    const tube = Math.max(2, 0.05 * k);
    body = (
      <>
        {/* Sombra del aro en el piso y base del soporte (una cruz). */}
        <path d={loop(ring(0.5, 0))} fill="none" stroke="#000000" strokeOpacity={0.25} strokeWidth={tube} pointerEvents="none" />
        {[0, 90].map((a) => {
          const r = (a * Math.PI) / 180;
          const [p, q] = [place(0.35 * Math.cos(r), 0.35 * Math.sin(r)), place(-0.35 * Math.cos(r), -0.35 * Math.sin(r))];
          return <line key={a} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#1c1915" strokeWidth={Math.max(2, 0.06 * k)} strokeLinecap="round" />;
        })}
        <line x1={foot.x} y1={foot.y} x2={top.x} y2={top.y} stroke="#2b2925" strokeWidth={Math.max(2, 0.05 * k)} strokeLinecap="round" />
        {/* Rayos que sostienen el aro. */}
        {[0, 120, 240].map((a) => {
          const r = (a * Math.PI) / 180;
          const p = place(0.5 * Math.cos(r), 0.5 * Math.sin(r), H);
          return <line key={a} x1={top.x} y1={top.y} x2={p.x} y2={p.y} stroke="#2b2925" strokeWidth={Math.max(1, 0.02 * k)} />;
        })}
        {/* El aro: lo de adentro también se toca, para agarrarlo. */}
        <path d={loop(ring(0.5, H))} fill={color} fillOpacity={0.1} />
        <path d={loop(ring(0.5, H))} fill="none" stroke={shade(color, 0.55)} strokeWidth={tube + 2} />
        <path d={loop(ring(0.5, H))} fill="none" stroke={color} strokeWidth={tube} />
      </>
    );
  } else if (el.kind === 'hoop') {
    // Aro en el piso: un aro de 1 m apoyado en el piso, con su grosor.
    const place = placer(at, el.x, el.y);
    const color = el.color ?? HOOP_COLORS[0].value;
    const [R, r, h] = [0.5, 0.43, SOLID_HEIGHT.hoop];
    size = [2 * R, 2 * R];
    const ring = (radius: number, z: number) =>
      Array.from({ length: 40 }, (_, i) => place(radius * Math.cos((i / 40) * 2 * Math.PI), radius * Math.sin((i / 40) * 2 * Math.PI), z));
    const loop = (list: Pt[]) => `M${list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')}Z`;
    // Pared de afuera y de adentro: una tira de cuadraditos entre el borde de abajo y el de arriba.
    const wall = (radius: number) => {
      const [low, high] = [ring(radius, 0), ring(radius, h)];
      return low.map((p, i) => loop([p, low[(i + 1) % low.length], high[(i + 1) % high.length], high[i]])).join(' ');
    };
    body = (
      <>
        <path d={`${loop(ring(R + 0.04, 0))} ${loop(ring(r - 0.04, 0))}`} fillRule="evenodd" fill="#000000" fillOpacity={0.25} pointerEvents="none" />
        <path d={wall(R)} fill={shade(color, 0.6)} pointerEvents="none" />
        <path d={wall(r)} fill={shade(color, 0.55)} pointerEvents="none" />
        {/* Lo de adentro del aro se toca también (como en la vista de arriba). */}
        <path d={loop(ring(r, 0))} fill={color} fillOpacity={0.12} />
        <path d={`${loop(ring(R, h))} ${loop(ring(r, h))}`} fillRule="evenodd" fill={color} stroke={shade(color, 0.5)} strokeWidth={1} />
      </>
    );
  } else {
    // Cono: base redonda y punta.
    const place = placer(at, el.x, el.y);
    const R = 0.22;
    size = [2 * R, 2 * R];
    const base = Array.from({ length: 16 }, (_, i) => place(R * Math.cos((i / 16) * 2 * Math.PI), R * Math.sin((i / 16) * 2 * Math.PI), 0));
    const apex = place(0, 0, SOLID_HEIGHT.cone);
    body = (
      <>
        <polygon points={pts(base)} fill="#000000" fillOpacity={0.28} pointerEvents="none" />
        <polygon points={pts(hull([...base, apex]))} fill="#fde047" stroke="#713f12" strokeWidth={1} strokeLinejoin="round" />
      </>
    );
  }
  const place = placer(at, el.x, el.y, 'rotation' in el ? el.rotation : 0);
  return (
    <g className="el" data-id={el.id} onPointerDown={onPointerDown}>
      {selected && <SelectionOutline place={place} L={size[0]} W={size[1]} />}
      {body}
      {children}
    </g>
  );
}
