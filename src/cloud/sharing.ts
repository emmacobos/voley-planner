import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { reload, sendEmailVerification } from 'firebase/auth';
import { create } from 'zustand';
import { useAppStore } from '../store';
import { auth, db } from './firebase';
import { startSync, stopSync } from './sync';

/**
 * Compartir con el cuerpo técnico.
 *
 * - `users/{uid}/shares/{email}`: a quién compartió cada cuenta (lo ve y lo
 *   cambia solo la dueña).
 * - `invites/{email}/from/{uid}`: la invitación que ve la persona invitada.
 *
 * Las reglas de Firestore dejan leer (o editar, con rol "editar") los datos de
 * `users/{uid}` a quien tenga una invitación con su email verificado.
 */

export type ShareRole = 'ver' | 'editar';

export const ROLE_LABEL: Record<ShareRole, string> = { ver: 'Puede ver', editar: 'Puede editar' };

export interface Share {
  email: string;
  role: ShareRole;
  createdAt: string;
}

export interface SharedWorkspace {
  ownerUid: string;
  ownerName: string;
  ownerEmail: string;
  role: ShareRole;
}

interface SharingState {
  /** Con quién compartí mis datos. */
  shares: Share[];
  /** Quién me compartió sus datos. */
  sharedWithMe: SharedWorkspace[];
  /** Datos compartidos que estoy viendo (null: los míos). */
  workspace: SharedWorkspace | null;
  /** El email de la cuenta no está verificado: no se pueden ver datos compartidos. */
  needsVerification: boolean;
  /** No se pudieron leer las invitaciones (se reintenta solo). */
  invitesError: boolean;
}

export const useSharing = create<SharingState>(() => ({
  shares: [],
  sharedWithMe: [],
  workspace: null,
  needsVerification: false,
  invitesError: false,
}));

const WORKSPACE_KEY = 'voley-planner-workspace';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

interface Me {
  uid: string;
  email: string | null;
  name: string | null;
}

let me: Me | null = null;
let unsubscribers: Unsubscribe[] = [];
let invitesUnsubscribe: Unsubscribe | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retries = 0;

/** Escucha mis invitaciones y las que recibí. Se llama al entrar. */
export function startSharing(user: Me) {
  stopSharing();
  me = user;
  unsubscribers.push(
    onSnapshot(collection(db, 'users', user.uid, 'shares'), (snap) =>
      useSharing.setState({ shares: snap.docs.map((d) => d.data() as Share).sort((a, b) => a.email.localeCompare(b.email)) }),
    ),
  );
  listenInvites();
}

function listenInvites() {
  invitesUnsubscribe?.();
  invitesUnsubscribe = undefined;
  clearTimeout(retryTimer);
  if (!me?.email) return;
  invitesUnsubscribe = onSnapshot(
    collection(db, 'invites', normalizeEmail(me.email), 'from'),
    (snap) => {
      retries = 0;
      const sharedWithMe = snap.docs.map((d) => d.data() as SharedWorkspace);
      useSharing.setState({ sharedWithMe, needsVerification: false, invitesError: false });
      // Si me cambiaron el permiso o me quitaron el acceso mientras miro sus datos.
      const current = useSharing.getState().workspace;
      if (!current || snap.metadata.fromCache) return;
      const updated = sharedWithMe.find((w) => w.ownerUid === current.ownerUid);
      if (!updated) {
        openWorkspace(null);
        alert(`${current.ownerName} dejó de compartir sus datos con vos. Volviste a tus datos.`);
      } else if (updated.role !== current.role) {
        openWorkspace(updated);
      }
    },
    (err) => {
      console.error(err);
      const needsVerification = !auth.currentUser?.emailVerified;
      useSharing.setState({ sharedWithMe: [], needsVerification, invitesError: !needsVerification });
      // Un listener que falla queda cerrado: se vuelve a intentar al rato.
      if (!needsVerification && retries < 5) {
        retries++;
        retryTimer = setTimeout(listenInvites, 5000 * retries);
      }
    },
  );
}

/** Vuelve a buscar las invitaciones (por ejemplo, después de un error). */
export function retryInvites() {
  retries = 0;
  listenInvites();
}

export function stopSharing() {
  for (const u of unsubscribers) u();
  unsubscribers = [];
  invitesUnsubscribe?.();
  invitesUnsubscribe = undefined;
  clearTimeout(retryTimer);
  me = null;
  useSharing.setState({ shares: [], sharedWithMe: [], workspace: null, needsVerification: false, invitesError: false });
}

/** Invita (o cambia el permiso de) una persona del cuerpo técnico. */
export async function shareWith(email: string, role: ShareRole) {
  if (!me) throw new Error('Entrá con tu cuenta para compartir.');
  const clean = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('El email no es válido.');
  if (me.email && clean === normalizeEmail(me.email)) throw new Error('Ese es tu propio email.');
  const batch = writeBatch(db);
  const existing = useSharing.getState().shares.find((s) => s.email === clean);
  batch.set(doc(db, 'users', me.uid, 'shares', clean), {
    email: clean,
    role,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  } satisfies Share);
  batch.set(doc(db, 'invites', clean, 'from', me.uid), {
    ownerUid: me.uid,
    ownerName: me.name ?? me.email ?? 'Entrenador/a',
    ownerEmail: me.email ?? '',
    role,
  } satisfies SharedWorkspace);
  await batch.commit();
}

/** Deja de compartir con esa persona. */
export async function stopSharingWith(email: string) {
  if (!me) return;
  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', me.uid, 'shares', email));
  batch.delete(doc(db, 'invites', email, 'from', me.uid));
  await batch.commit();
}

/**
 * Pasa a ver los datos compartidos de otra cuenta (o vuelve a los propios con
 * null). Los datos del navegador se reemplazan por los de esa cuenta.
 */
export function openWorkspace(workspace: SharedWorkspace | null) {
  if (!me) return;
  const target = workspace?.ownerUid ?? me.uid;
  // Primero se desconecta la cuenta anterior: si no, vaciar los datos del
  // navegador se subiría como un borrado de todos sus datos en la nube.
  stopSync();
  // Si los datos del navegador ya son de esa cuenta (al recargar), se conservan.
  if (useAppStore.getState().ownerUid !== target) useAppStore.getState().resetData(target);
  useSharing.setState({ workspace });
  try {
    if (workspace) localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
    else localStorage.removeItem(WORKSPACE_KEY);
  } catch {
    // Sin almacenamiento: al recargar se vuelve a los datos propios.
  }
  startSync(target, {
    readOnly: workspace?.role === 'ver',
    onDenied: workspace
      ? () => {
          openWorkspace(null);
          alert(`Ya no tenés acceso a los datos de ${workspace.ownerName}. Volviste a tus datos.`);
        }
      : undefined,
  });
}

/** Los datos compartidos que se estaban viendo antes de recargar la página. */
export function savedWorkspace(): SharedWorkspace | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    return raw ? (JSON.parse(raw) as SharedWorkspace) : null;
  } catch {
    return null;
  }
}

export function forgetWorkspace() {
  try {
    localStorage.removeItem(WORKSPACE_KEY);
  } catch {
    // Nada que olvidar.
  }
}

/** Manda el mail para verificar la cuenta (necesario para ver datos compartidos). */
export async function sendVerification() {
  if (auth.currentUser) await sendEmailVerification(auth.currentUser);
}

/** Después de verificar el email: refresca la sesión y vuelve a buscar invitaciones. */
export async function recheckVerification(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  await reload(user);
  await user.getIdToken(true);
  if (!user.emailVerified) return false;
  if (me) startSharing(me);
  return true;
}
