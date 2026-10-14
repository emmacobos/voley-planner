import { describe, expect, it } from 'vitest';
import { diffCollection, mergeRemote } from './diff';

const a = { id: 'a', v: 1 };
const b = { id: 'b', v: 1 };
const c = { id: 'c', v: 1 };

describe('diffCollection', () => {
  it('detecta altas, cambios y bajas', () => {
    const b2 = { ...b, v: 2 };
    const d = diffCollection([a, b, c], [a, b2, { id: 'd', v: 1 }]);
    expect(d.upserts.map((x) => x.id)).toEqual(['b', 'd']);
    expect(d.deletes).toEqual(['c']);
  });

  it('no informa nada si no cambió ninguna referencia', () => {
    expect(diffCollection([a, b], [b, a])).toEqual({ upserts: [], deletes: [] });
  });
});

describe('mergeRemote', () => {
  it('sin cambios pendientes usa lo remoto', () => {
    const remote = [a, b];
    expect(mergeRemote(remote, [c], new Map())).toBe(remote);
  });

  it('respeta las ediciones y borrados locales que no se subieron', () => {
    const aLocal = { ...a, v: 9 };
    const merged = mergeRemote(
      [a, b, c],
      [aLocal, c, { id: 'nuevo', v: 1 }],
      new Map([
        ['a', 'upsert'],
        ['b', 'delete'],
        ['nuevo', 'upsert'],
      ]),
    );
    expect(merged).toEqual([c, aLocal, { id: 'nuevo', v: 1 }]);
  });
});
