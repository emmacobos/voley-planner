import { describe, expect, it } from 'vitest';
import { ageOn } from './players';

describe('ageOn', () => {
  const on = new Date(2026, 9, 14); // 14/10/2026

  it('cuenta los años cumplidos', () => {
    expect(ageOn('2008-10-14', on)).toBe(18);
    expect(ageOn('2008-10-15', on)).toBe(17);
    expect(ageOn('2008-01-01', on)).toBe(18);
  });

  it('devuelve null sin fecha o con fecha inválida', () => {
    expect(ageOn(undefined, on)).toBeNull();
    expect(ageOn('', on)).toBeNull();
    expect(ageOn('2030-01-01', on)).toBeNull();
  });
});
