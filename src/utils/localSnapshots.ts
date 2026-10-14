import { BACKUP_KEYS } from '../domain/backup';
import type { BackupData } from '../domain/backup';

/**
 * Copias automáticas en este navegador: al abrir la app, antes de conectarse a
 * la nube, se guarda lo que había guardado localmente (las últimas 10 distintas).
 * Sirven para recuperar datos si algo se borró en la nube.
 */
const STORE_KEY = 'voley-planner';
const SNAPSHOTS_KEY = 'voley-planner-copias';
/** Cuántas copias se guardan como máximo. */
export const MAX_SNAPSHOTS = 10;

export interface LocalSnapshot {
  at: string;
  ownerUid: string | null;
  data: BackupData;
}

export function readSnapshots(): LocalSnapshot[] {
  try {
    const list = JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) ?? '[]') as LocalSnapshot[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list: LocalSnapshot[]) {
  // Si no entra en el almacenamiento, se van descartando las más viejas.
  for (let n = list.length; n > 0; n--) {
    try {
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(list.slice(0, n)));
      return;
    } catch {
      // Probar con una copia menos.
    }
  }
}

/** Se llama una vez al abrir la app, antes de conectar la cuenta. */
export function takeStartupSnapshot(now: Date = new Date()) {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const state = raw ? (JSON.parse(raw) as { state?: Record<string, unknown> }).state : undefined;
    if (!state) return;
    const data = Object.fromEntries(
      BACKUP_KEYS.map((k) => [k, Array.isArray(state[k]) ? state[k] : []]),
    ) as unknown as BackupData;
    if (!BACKUP_KEYS.some((k) => data[k].length > 0)) return;
    const list = readSnapshots();
    if (list[0] && JSON.stringify(list[0].data) === JSON.stringify(data)) return;
    save([{ at: now.toISOString(), ownerUid: (state.ownerUid as string | null) ?? null, data }, ...list].slice(0, MAX_SNAPSHOTS));
  } catch {
    // Sin almacenamiento disponible: no hay copia automática.
  }
}

export function removeSnapshot(at: string) {
  save(readSnapshots().filter((s) => s.at !== at));
}
