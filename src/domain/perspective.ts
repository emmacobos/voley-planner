/**
 * Vista inclinada de la pizarra: la cancha se ve en perspectiva, como desde
 * una tribuna. Es una transformación 3D (la misma que se le da a la pizarra
 * con CSS) y su inversa, para saber en qué punto del piso cae un toque.
 *
 * Las matrices son de 4 × 4 por columnas, como `matrix3d` de CSS.
 */

export type Mat4 = number[];

export interface View3D {
  /** Inclinación: 90 es la vista de arriba; menos, más de costado. */
  tilt: number;
  /** Giro: 0 de costado (como en la tele), 90 desde atrás de nuestro equipo, −90 desde atrás del rival. */
  turn: number;
}

export const DEFAULT_VIEW_3D: View3D = { tilt: 40, turn: 40 };
export const TILT_RANGE = { min: 5, max: 90 };
/** El giro da la vuelta completa. */
export const TURN_RANGE = { min: -180, max: 180 };

/** El giro llevado a −180…180 (girar sin topes da la vuelta). */
export function normalizeTurn(turn: number): number {
  const t = (((turn + 180) % 360) + 360) % 360 - 180;
  return t === -180 ? 180 : t;
}

/** Cómo se llama cada giro. */
export function turnLabel(turn: number): string {
  const t = normalizeTurn(turn);
  const a = Math.abs(t);
  if (a < 15) return 'de costado';
  if (a > 165) return 'del otro costado';
  if (a >= 75 && a <= 105) return t > 0 ? 'desde atrás del equipo A' : 'desde atrás del equipo B';
  return t > 0 ? 'en diagonal (lado A)' : 'en diagonal (lado B)';
}

/** Acercar y mover la cancha: el zoom es alrededor del centro y se corre `x`, `y` px. */
export interface Camera {
  zoom: number;
  x: number;
  y: number;
}

export const DEFAULT_CAMERA: Camera = { zoom: 1, x: 0, y: 0 };
export const ZOOM_RANGE = { min: 0.5, max: 4 };

const identity = (): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  return out;
}

const translate = (x: number, y: number, z = 0): Mat4 => {
  const m = identity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
};

const scale = (s: number): Mat4 => {
  const m = identity();
  m[0] = s;
  m[5] = s;
  return m;
};

const perspective = (d: number): Mat4 => {
  const m = identity();
  m[11] = -1 / d;
  return m;
};

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Como `rotateX` de CSS: con un ángulo positivo, la parte de arriba se aleja. */
const rotateX = (deg: number): Mat4 => {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
};

/** Como `rotateZ` de CSS (positivo: en el sentido de las agujas del reloj). */
const rotateZ = (deg: number): Mat4 => {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
};

export interface Projected {
  x: number;
  y: number;
  /** Profundidad: más grande, más lejos. */
  depth: number;
}

export function project(m: Mat4, x: number, y: number, z = 0): Projected {
  const X = m[0] * x + m[4] * y + m[8] * z + m[12];
  const Y = m[1] * x + m[5] * y + m[9] * z + m[13];
  const W = m[3] * x + m[7] * y + m[11] * z + m[15];
  return { x: X / W, y: Y / W, depth: W };
}

/** El punto del piso (z = 0) que se ve en (sx, sy). */
export function unproject(m: Mat4, sx: number, sy: number): { x: number; y: number } {
  const a = m[0] - sx * m[3];
  const b = m[4] - sx * m[7];
  const c = m[1] - sy * m[3];
  const d = m[5] - sy * m[7];
  const e = sx * m[15] - m[12];
  const f = sy * m[15] - m[13];
  const det = a * d - b * c;
  return { x: (e * d - b * f) / det, y: (a * f - e * c) / det };
}

/** La transformación con el zoom y el corrimiento de la cámara aplicados encima. */
export function withCamera(m: Mat4, cam: Camera, w: number, h: number): Mat4 {
  if (cam.zoom === 1 && cam.x === 0 && cam.y === 0) return m;
  return [translate(w / 2 + cam.x, h / 2 + cam.y), scale(cam.zoom), translate(-w / 2, -h / 2), m].reduce(multiply);
}

/** La cámara después de acercar o alejar `factor` veces, dejando quieto el punto (sx, sy) de la pantalla. */
export function zoomAt(cam: Camera, factor: number, sx: number, sy: number, w: number, h: number): Camera {
  const zoom = Math.min(ZOOM_RANGE.max, Math.max(ZOOM_RANGE.min, cam.zoom * factor));
  const [cx, cy] = [w / 2, h / 2];
  // Punto sin cámara que hoy se ve en (sx, sy).
  const qx = cx + (sx - cx - cam.x) / cam.zoom;
  const qy = cy + (sy - cy - cam.y) / cam.zoom;
  return { zoom, x: sx - cx - zoom * (qx - cx), y: sy - cy - zoom * (qy - cy) };
}

/** La misma transformación para algo dibujado `s` veces más grande (se ve más nítido). */
export const shrink = (m: Mat4, s: number): Mat4 => multiply(m, scale(1 / s));

export const toCss = (m: Mat4) => `matrix3d(${m.map((v) => +v.toFixed(8)).join(',')})`;

/** Cómo el `viewBox` (en metros) se acomoda en un recuadro de w × h px (centrado, sin deformar). */
export interface BoxMap {
  scale: number;
  offsetX: number;
  offsetY: number;
  minX: number;
  minY: number;
}

export function boxMap(viewBox: string, w: number, h: number): BoxMap {
  const [minX, minY, vw, vh] = viewBox.split(' ').map(Number);
  const s = Math.min(w / vw, h / vh);
  return { scale: s, offsetX: (w - vw * s) / 2, offsetY: (h - vh * s) / 2, minX, minY };
}

export const toPx = (b: BoxMap, x: number, y: number) => ({ x: (x - b.minX) * b.scale + b.offsetX, y: (y - b.minY) * b.scale + b.offsetY });
export const toMeters = (b: BoxMap, px: number, py: number) => ({ x: (px - b.offsetX) / b.scale + b.minX, y: (py - b.offsetY) / b.scale + b.minY });

/**
 * La transformación de la pizarra (en px, dentro de su recuadro de w × h):
 * gira la cancha, la inclina con perspectiva y la agranda para que lo que
 * importa (`keep`, en px del piso, con su altura) entre justo en el recuadro.
 */
export function viewMatrix(view: View3D, w: number, h: number, keep: [number, number, number][], padding = 10): Mat4 {
  const base = (turn: number) =>
    [
      translate(w / 2, h / 2),
      perspective(Math.max(w, h) * 1.3),
      rotateX(90 - view.tilt),
      rotateZ(-turn),
      translate(-w / 2, -h / 2),
    ].reduce(multiply);
  // El tamaño no depende del giro (es el que entra en todos los giros) y el
  // centro de la cancha queda quieto: al girar, la cancha no se agranda, ni se
  // achica, ni se corre.
  let k = Infinity;
  for (let turn = 0; turn < 360; turn += 15) {
    const m = base(turn);
    for (const [x, y, z] of keep) {
      const p = project(m, x, y, z);
      const dx = Math.abs(p.x - w / 2);
      const dy = Math.abs(p.y - h / 2);
      if (dx > 0) k = Math.min(k, (w / 2 - padding) / dx);
      if (dy > 0) k = Math.min(k, (h / 2 - padding) / dy);
    }
  }
  const fit = [translate(w / 2, h / 2), scale(k), translate(-w / 2, -h / 2)].reduce(multiply);
  return multiply(fit, base(view.turn));
}

/**
 * La vista después de arrastrar con el clic derecho, sin topes: el giro da la
 * vuelta y, al subir la inclinación más allá de la vista de arriba, la cámara
 * pasa por encima y queda mirando desde el otro lado. Hacia abajo para un poco
 * antes del piso.
 */
export function orbit(start: View3D, dTurn: number, dTilt: number): View3D {
  const raw = Math.min(180 - TILT_RANGE.min, Math.max(TILT_RANGE.min, start.tilt + dTilt));
  const over = raw > 90;
  return {
    tilt: Math.round(over ? 180 - raw : raw),
    turn: Math.round(normalizeTurn(start.turn + dTurn + (over ? 180 : 0))),
  };
}
