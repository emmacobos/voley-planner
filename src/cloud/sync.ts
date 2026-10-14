import { collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { create } from 'zustand';
import { DATA_KEYS, useAppStore } from '../store';
import type { AppData, DataKey } from '../store';
import { db } from './firebase';
import { diffCollection, mergeRemote } from './diff';

/**
 * Sincronización entre el store local y Firestore.
 *
 * Estructura en Firestore: `users/{uid}/{squads|players|exercises|sessions|matches|weeks|templates}/{id}`,
 * un documento por entidad.
 *
 * - Bajada: un listener por colección reemplaza los datos del store.
 * - Subida: cada cambio del store se compara con el estado anterior y los
 *   documentos modificados se escriben con un pequeño retraso, para no hacer
 *   una escritura por cada tecla.
 */

export type SyncState = 'off' | 'loading' | 'saving' | 'saved' | 'offline' | 'error';

interface SyncStatus {
  state: SyncState;
  error: string | null;
}

export const useSyncStatus = create<SyncStatus>(() => ({ state: 'off', error: null }));

const DEBOUNCE_MS = 800;
const MAX_WAIT_MS = 4000;

type Pending = { key: DataKey; id: string; data: unknown | null };

let uid: string | null = null;
let unsubscribers: Unsubscribe[] = [];
let applyingRemote = false;
let loaded = new Set<DataKey>();
const pending = new Map<string, Pending>();
let inFlight = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let firstPendingAt = 0;

const pendingKey = (key: DataKey, id: string) => `${key}/${id}`;

function refreshStatus() {
  if (!uid) return useSyncStatus.setState({ state: 'off', error: null });
  if (useSyncStatus.getState().state === 'error') return;
  let state: SyncState;
  if (loaded.size < DATA_KEYS.length) state = 'loading';
  else if (pending.size + inFlight > 0) state = navigator.onLine ? 'saving' : 'offline';
  else state = 'saved';
  useSyncStatus.setState({ state });
}

function fail(err: unknown) {
  console.error(err);
  useSyncStatus.setState({ state: 'error', error: err instanceof Error ? err.message : String(err) });
}

type Item = { id: string } & Record<string, unknown>;
const byText = (field: string) => (a: Item, b: Item) =>
  String(a[field] ?? '').localeCompare(String(b[field] ?? ''), 'es');

/** Orden en que se guardan las colecciones en el store. */
const SORTERS: Record<DataKey, (a: Item, b: Item) => number> = {
  squads: byText('name'),
  players: (a, b) => Number(a.number) - Number(b.number),
  exercises: (a, b) => byText('createdAt')(b, a),
  sessions: (a, b) => byText('date')(b, a),
  matches: byText('date'),
  weeks: byText('weekStart'),
  templates: byText('name'),
};

function applyRemote(key: DataKey, remote: Item[]) {
  const pendingForKey = new Map<string, 'upsert' | 'delete'>();
  for (const p of pending.values()) {
    if (p.key === key) pendingForKey.set(p.id, p.data === null ? 'delete' : 'upsert');
  }
  const local = useAppStore.getState()[key] as unknown as Item[];
  const sorted = [...mergeRemote(remote, local, pendingForKey)].sort(SORTERS[key]);
  applyingRemote = true;
  try {
    useAppStore.setState({ [key]: sorted } as unknown as Partial<AppData>);
  } finally {
    applyingRemote = false;
  }
}

function schedule() {
  if (!firstPendingAt) firstPendingAt = Date.now();
  clearTimeout(timer);
  const wait = Math.min(DEBOUNCE_MS, Math.max(0, firstPendingAt + MAX_WAIT_MS - Date.now()));
  timer = setTimeout(flush, wait);
  refreshStatus();
}

/** Envía ya los cambios pendientes. */
export function flush() {
  clearTimeout(timer);
  firstPendingAt = 0;
  if (!uid) return;
  const user = uid;
  for (const p of pending.values()) {
    const ref = doc(db, 'users', user, p.key, p.id);
    const write = p.data === null ? deleteDoc(ref) : setDoc(ref, p.data);
    inFlight++;
    write
      .catch(fail)
      .finally(() => {
        inFlight--;
        refreshStatus();
      });
  }
  pending.clear();
  refreshStatus();
}

function onStoreChange(state: AppData, prev: AppData) {
  if (applyingRemote || !uid) return;
  let changed = false;
  for (const key of DATA_KEYS) {
    if (state[key] === prev[key]) continue;
    const { upserts, deletes } = diffCollection(prev[key] as { id: string }[], state[key] as { id: string }[]);
    for (const item of upserts) pending.set(pendingKey(key, item.id), { key, id: item.id, data: item });
    for (const id of deletes) pending.set(pendingKey(key, id), { key, id, data: null });
    changed ||= upserts.length + deletes.length > 0;
  }
  if (changed) schedule();
}

/** Empieza a sincronizar el store con la cuenta indicada. */
export function startSync(userId: string) {
  stopSync();
  uid = userId;
  loaded = new Set();
  useSyncStatus.setState({ state: 'loading', error: null });
  for (const key of DATA_KEYS) {
    unsubscribers.push(
      onSnapshot(
        collection(db, 'users', userId, key),
        (snap) => {
          applyRemote(key, snap.docs.map((d) => d.data() as Item));
          loaded.add(key);
          refreshStatus();
        },
        fail,
      ),
    );
  }
  unsubscribers.push(useAppStore.subscribe(onStoreChange));
  window.addEventListener('online', refreshStatus);
  window.addEventListener('offline', refreshStatus);
  window.addEventListener('pagehide', flush);
}

export function stopSync() {
  flush();
  for (const u of unsubscribers) u();
  unsubscribers = [];
  uid = null;
  window.removeEventListener('online', refreshStatus);
  window.removeEventListener('offline', refreshStatus);
  window.removeEventListener('pagehide', flush);
  refreshStatus();
}

/** Sube de una vez todos los datos locales a la cuenta (al entrar por primera vez). */
export async function uploadAll(userId: string, data: AppData) {
  const writes = DATA_KEYS.flatMap((key) =>
    (data[key] as { id: string }[]).map((item) => ({ ref: doc(db, 'users', userId, key, item.id), item })),
  );
  // Firestore admite hasta 500 escrituras por lote.
  for (let i = 0; i < writes.length; i += 400) {
    const batch = writeBatch(db);
    for (const w of writes.slice(i, i + 400)) batch.set(w.ref, w.item);
    await batch.commit();
  }
}
