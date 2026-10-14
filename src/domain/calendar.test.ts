import { describe, expect, it } from 'vitest';
import { daysUntil, isoWeek, monthWeeks } from './calendar';

describe('calendario', () => {
  it('arma las semanas del mes de lunes a domingo', () => {
    const weeks = monthWeeks(2026, 9); // octubre 2026: empieza jueves
    expect(weeks[0][0]).toBe('2026-09-28');
    expect(weeks[0][3]).toBe('2026-10-01');
    expect(weeks.at(-1)!.at(-1)).toBe('2026-11-01');
    expect(weeks).toHaveLength(5);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it('cubre meses que empiezan en lunes y terminan en domingo', () => {
    const weeks = monthWeeks(2027, 1); // febrero 2027: del lunes 1 al domingo 28
    expect(weeks[0][0]).toBe('2027-02-01');
    expect(weeks).toHaveLength(4);
  });

  it('calcula la semana ISO y los días que faltan', () => {
    expect(isoWeek('2026-10-14')).toBe(42);
    expect(isoWeek('2027-01-01')).toBe(53);
    expect(daysUntil('2026-10-17', new Date(2026, 9, 14, 20))).toBe(3);
  });
});
