import { describe, expect, it } from 'vitest';
import { boxMap, project, toMeters, toPx, turnLabel, unproject, viewMatrix, withCamera, zoomAt } from './perspective';

const W = 960;
const H = 600;
const keep: [number, number, number][] = [
  [0, 0, 0],
  [W, 0, 0],
  [W, H, 0],
  [0, H, 0],
];

describe('vista inclinada', () => {
  it('lo que se toca en la pantalla cae en el mismo punto del piso', () => {
    const m = viewMatrix({ tilt: 40, turn: 40 }, W, H, keep);
    for (const [x, y] of [
      [100, 80],
      [480, 300],
      [900, 550],
    ]) {
      const s = project(m, x, y);
      const back = unproject(m, s.x, s.y);
      expect(back.x).toBeCloseTo(x, 6);
      expect(back.y).toBeCloseTo(y, 6);
    }
  });

  it('lo del fondo se ve más chico y más lejos que lo de adelante', () => {
    const m = viewMatrix({ tilt: 40, turn: 0 }, W, H, keep);
    const far = [project(m, 400, 50), project(m, 500, 50)];
    const near = [project(m, 400, 550), project(m, 500, 550)];
    expect(far[0].depth).toBeGreaterThan(near[0].depth);
    expect(Math.abs(far[1].x - far[0].x)).toBeLessThan(Math.abs(near[1].x - near[0].x));
  });

  it('lo alto se ve más arriba en la pantalla', () => {
    const m = viewMatrix({ tilt: 40, turn: 40 }, W, H, keep);
    expect(project(m, 480, 300, 80).y).toBeLessThan(project(m, 480, 300, 0).y);
  });

  it('todo lo importante entra en el recuadro', () => {
    const m = viewMatrix({ tilt: 30, turn: 60 }, W, H, keep);
    for (const [x, y, z] of keep) {
      const p = project(m, x, y, z);
      expect(p.x).toBeGreaterThanOrEqual(9);
      expect(p.x).toBeLessThanOrEqual(W - 9);
      expect(p.y).toBeGreaterThanOrEqual(9);
      expect(p.y).toBeLessThanOrEqual(H - 9);
    }
  });

  it('pasa de metros a px del recuadro y vuelve', () => {
    const b = boxMap('-3 -3 24 15', W, H);
    const px = toPx(b, 9, 4.5);
    expect(px.x).toBeCloseTo(480);
    const back = toMeters(b, px.x, px.y);
    expect(back.x).toBeCloseTo(9);
    expect(back.y).toBeCloseTo(4.5);
  });

  it('el zoom deja quieto el punto donde está el mouse, y se puede mover la cancha', () => {
    const m = viewMatrix({ tilt: 40, turn: 40 }, W, H, keep);
    const before = project(m, 300, 200);
    const cam = zoomAt({ zoom: 1, x: 0, y: 0 }, 2, before.x, before.y, W, H);
    expect(cam.zoom).toBe(2);
    const after = project(withCamera(m, cam, W, H), 300, 200);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
    // Corrida 50 px a la derecha, todo se ve 50 px más a la derecha; y se toca igual.
    const moved = withCamera(m, { zoom: 1, x: 50, y: 0 }, W, H);
    expect(project(moved, 300, 200).x).toBeCloseTo(before.x + 50, 6);
    const back = unproject(moved, before.x + 50, before.y);
    expect(back.x).toBeCloseTo(300, 6);
    // No se acerca ni se aleja de más.
    expect(zoomAt(cam, 100, 0, 0, W, H).zoom).toBe(4);
  });

  it('nombra el giro de los dos lados', () => {
    expect(turnLabel(0)).toBe('de costado');
    expect(turnLabel(90)).toBe('desde atrás del equipo A');
    expect(turnLabel(-90)).toBe('desde atrás del equipo B');
    expect(turnLabel(-40)).toBe('en diagonal (lado B)');
  });
});
