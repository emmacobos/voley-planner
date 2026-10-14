import { describe, expect, it } from 'vitest';
import { BACKUP_KEYS, describeBackup, makeBackup, mergeBackup, parseBackup } from './backup';
import type { BackupData } from './backup';

const empty = (): BackupData => Object.fromEntries(BACKUP_KEYS.map((k) => [k, []])) as unknown as BackupData;

describe('copia de seguridad', () => {
  it('se puede leer lo que se exporta', () => {
    const data = { ...empty(), squads: [{ id: 'q' }], players: [{ id: 'p' }] };
    const backup = makeBackup(data, new Date('2026-10-14T12:00:00Z'));
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.data.squads).toEqual([{ id: 'q' }]);
    expect(parsed.exportedAt).toBe('2026-10-14T12:00:00.000Z');
    expect(describeBackup(parsed.data)).toBe('1 plantel, 1 jugador');
  });

  it('acepta copias viejas sin las colecciones nuevas', () => {
    const old = { app: 'voley-planner', format: 1, exportedAt: '', data: { squads: [], players: [], exercises: [], sessions: [{ id: 's' }] } };
    const parsed = parseBackup(JSON.stringify(old));
    expect(parsed.data.matches).toEqual([]);
    expect(parsed.data.sessions).toHaveLength(1);
  });

  it('rechaza archivos que no son copias', () => {
    expect(() => parseBackup('hola')).toThrow(/no se puede leer/);
    expect(() => parseBackup('{"app":"otra"}')).toThrow(/no es una copia/);
    expect(() => parseBackup('{"app":"voley-planner","data":{"players":[{"nombre":1}]}}')).toThrow(/dañada/);
  });

  it('al sumar, agrega lo nuevo y se queda con lo modificado más recientemente', () => {
    const current = { ...empty(), sessions: [{ id: 'a', updatedAt: '2026-10-10' }, { id: 'b', updatedAt: '2026-10-12' }] };
    const incoming = { ...empty(), sessions: [{ id: 'b', updatedAt: '2026-10-01' }, { id: 'c' }, { id: 'a', updatedAt: '2026-10-11' }] };
    const merged = mergeBackup(current, incoming);
    expect(merged.sessions.map((s) => [s.id, s.updatedAt])).toEqual([
      ['a', '2026-10-11'],
      ['b', '2026-10-12'],
      ['c', undefined],
    ]);
  });
});

describe('copias viejas', () => {
  it('suma una copia que no tiene las colecciones nuevas', () => {
    const current = Object.fromEntries(BACKUP_KEYS.map((k) => [k, []])) as unknown as BackupData;
    const old = { squads: [{ id: 'a' }] } as unknown as BackupData;
    const merged = mergeBackup(current, old);
    expect(merged.squads).toHaveLength(1);
    expect(merged.phases).toEqual([]);
    expect(describeBackup(old)).toBe('1 plantel');
  });
});
