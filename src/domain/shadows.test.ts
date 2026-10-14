import { describe, expect, it } from 'vitest';
import { shadowCorners, textBox, textLines, wrapText } from './shadows';

describe('sombra del bloqueo', () => {
  it('nace con el ancho del bloqueo y se abre hacia el fondo', () => {
    const [a, b, c, d] = shadowCorners({ x1: 9, y1: 4.5, x2: 3, y2: 4.5, startWidth: 1, endWidth: 4 });
    // Sobre el eje x, el ancho se mide en y.
    expect(Math.abs(a.y - d.y)).toBeCloseTo(1);
    expect(Math.abs(b.y - c.y)).toBeCloseTo(4);
    expect(a.x).toBeCloseTo(9);
    expect(b.x).toBeCloseTo(3);
  });

  it('no falla si los dos extremos coinciden', () => {
    const corners = shadowCorners({ x1: 1, y1: 1, x2: 1, y2: 1, startWidth: 1, endWidth: 2 });
    expect(corners.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });
});

describe('texto en el tablero', () => {
  it('separa las líneas y estima su tamaño', () => {
    expect(textLines({ text: 'Bloqueo\ndoble' })).toEqual(['Bloqueo', 'doble']);
    const box = textBox({ text: 'Bloqueo\ndoble', size: 'M' });
    expect(box.height).toBeCloseTo(2 * 0.6 * 1.2);
    expect(box.width).toBeGreaterThan(textBox({ text: 'doble', size: 'M' }).width);
  });
});

describe('comentarios de jugadores', () => {
  it('parte el comentario en líneas cortas', () => {
    expect(wrapText('El jugador se desplaza a 1 y cubre la diagonal', 20)).toEqual([
      'El jugador se',
      'desplaza a 1 y cubre',
      'la diagonal',
    ]);
  });

  it('respeta los saltos de línea y descarta lo vacío', () => {
    expect(wrapText('Bloquea\nDespués cubre')).toEqual(['Bloquea', 'Después cubre']);
    expect(wrapText('   ')).toEqual([]);
  });
});
