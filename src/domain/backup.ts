/** Colecciones que entran en una copia de seguridad (las mismas que se guardan en la nube). */
export const BACKUP_KEYS = ['squads', 'players', 'exercises', 'sessions', 'matches', 'weeks', 'templates'] as const;
export type BackupKey = (typeof BACKUP_KEYS)[number];

type Item = { id: string; updatedAt?: string };
export type BackupData = Record<BackupKey, Item[]>;

export interface Backup {
  app: 'voley-planner';
  format: 1;
  exportedAt: string;
  data: BackupData;
}

export function makeBackup(data: BackupData, now: Date = new Date()): Backup {
  return {
    app: 'voley-planner',
    format: 1,
    exportedAt: now.toISOString(),
    data: Object.fromEntries(BACKUP_KEYS.map((k) => [k, data[k] ?? []])) as BackupData,
  };
}

/**
 * Lee el texto de un archivo de copia. Las copias de versiones anteriores pueden
 * no tener todas las colecciones: las que faltan quedan vacías. Si el archivo no
 * es una copia válida, tira un error con un mensaje para mostrar.
 */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es una copia de Voley Planner (no se puede leer).');
  }
  const obj = raw as Partial<Backup> | null;
  if (!obj || obj.app !== 'voley-planner' || typeof obj.data !== 'object' || obj.data === null) {
    throw new Error('El archivo no es una copia de Voley Planner.');
  }
  const data = {} as BackupData;
  for (const key of BACKUP_KEYS) {
    const list = (obj.data as Partial<Record<BackupKey, unknown>>)[key] ?? [];
    if (!Array.isArray(list) || list.some((x) => typeof x !== 'object' || x === null || typeof x.id !== 'string')) {
      throw new Error(`La copia está dañada (${key}).`);
    }
    data[key] = list as Item[];
  }
  return { app: 'voley-planner', format: 1, exportedAt: String(obj.exportedAt ?? ''), data };
}

/**
 * Suma una copia a los datos actuales: agrega lo que no está y, si algo está
 * en los dos lados, se queda con la versión modificada más recientemente.
 */
export function mergeBackup(current: BackupData, incoming: BackupData): BackupData {
  const result = {} as BackupData;
  for (const key of BACKUP_KEYS) {
    const byId = new Map((current[key] ?? []).map((x) => [x.id, x]));
    for (const item of incoming[key]) {
      const mine = byId.get(item.id);
      if (!mine || (item.updatedAt ?? '') > (mine.updatedAt ?? '')) byId.set(item.id, item);
    }
    result[key] = [...byId.values()];
  }
  return result;
}

/** "3 planteles, 24 jugadores, …" para mostrar qué tiene una copia. */
export function describeBackup(data: BackupData): string {
  const labels: [BackupKey, string, string][] = [
    ['squads', 'plantel', 'planteles'],
    ['players', 'jugador', 'jugadores'],
    ['exercises', 'ejercicio', 'ejercicios'],
    ['sessions', 'sesión', 'sesiones'],
    ['matches', 'partido', 'partidos'],
    ['templates', 'plantilla', 'plantillas'],
  ];
  const parts = labels.filter(([k]) => data[k].length).map(([k, one, many]) => `${data[k].length} ${data[k].length === 1 ? one : many}`);
  return parts.length ? parts.join(', ') : 'nada';
}
