import { todayISO } from './sessions';

/**
 * Semanas (lunes a domingo, en AAAA-MM-DD) que cubren el mes `month` (0 a 11)
 * de `year`, para dibujar el calendario.
 */
export function monthWeeks(year: number, month: number): string[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - ((first.getDay() + 6) % 7));
  const last = new Date(year, month + 1, 0);
  const weeks: string[][] = [];
  for (let d = start; d <= last || weeks.length === 0; ) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(todayISO(d));
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/** Número de semana ISO 8601 de una fecha AAAA-MM-DD. */
export function isoWeek(date: string): number {
  const [y, m, day] = date.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  // El jueves de esa semana define a qué año pertenece.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
}

/** Días que faltan desde `today` hasta `date` (0 = hoy). */
export function daysUntil(date: string, today: Date = new Date()): number {
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const b = new Date(`${date}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
