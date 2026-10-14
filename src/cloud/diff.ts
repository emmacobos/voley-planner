interface WithId {
  id: string;
}

export interface CollectionDiff<T extends WithId> {
  upserts: T[];
  deletes: string[];
}

/**
 * Compara dos versiones de una colección. El store es inmutable, así que un
 * elemento cambió si su referencia es distinta.
 */
export function diffCollection<T extends WithId>(prev: T[], next: T[]): CollectionDiff<T> {
  const prevById = new Map(prev.map((x) => [x.id, x]));
  const nextIds = new Set(next.map((x) => x.id));
  return {
    upserts: next.filter((x) => prevById.get(x.id) !== x),
    deletes: prev.filter((x) => !nextIds.has(x.id)).map((x) => x.id),
  };
}

/**
 * Une los datos que llegan de la nube con los locales que todavía no se
 * subieron: para esos ids gana la versión local (o su borrado).
 */
export function mergeRemote<T extends WithId>(
  remote: T[],
  local: T[],
  pending: Map<string, 'upsert' | 'delete'>,
): T[] {
  if (pending.size === 0) return remote;
  const result = remote.filter((x) => !pending.has(x.id));
  for (const item of local) {
    if (pending.get(item.id) === 'upsert') result.push(item);
  }
  return result;
}
