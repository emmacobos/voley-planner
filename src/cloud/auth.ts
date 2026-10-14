import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { clearIndexedDbPersistence, terminate, waitForPendingWrites } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { create } from 'zustand';
import { DATA_KEYS, hasData, useAppStore } from '../store';
import type { AppData } from '../store';
import { auth, db } from './firebase';
import { flush, startSync, stopSync, uploadAll } from './sync';

export interface AccountUser {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
}

interface AuthState {
  /** false hasta que Firebase informa si hay una sesión abierta. */
  ready: boolean;
  user: AccountUser | null;
  /** Datos locales sin cuenta esperando que la usuaria decida si subirlos. */
  importCounts: Record<keyof AppData, number> | null;
  busy: boolean;
}

export const useAuth = create<AuthState>(() => ({ ready: false, user: null, importCounts: null, busy: false }));

/** Escucha la sesión de Firebase y conecta la sincronización. Se llama una vez al iniciar. */
export function initAuth() {
  onAuthStateChanged(auth, (fbUser) => {
    const store = useAppStore.getState();
    if (!fbUser) {
      stopSync();
      // Si los datos del navegador eran de una cuenta (por ejemplo, venció la
      // sesión), no se dejan visibles sin entrar.
      if (store.ownerUid) store.resetData(null);
      useAuth.setState({ ready: true, user: null, importCounts: null });
      return;
    }

    const user: AccountUser = {
      uid: fbUser.uid,
      email: fbUser.email,
      name: fbUser.displayName,
      photoURL: fbUser.photoURL,
    };
    useAuth.setState({ ready: true, user });

    if (store.ownerUid === user.uid) {
      startSync(user.uid);
    } else if (store.ownerUid === null && hasData(store)) {
      // Primera vez que entra en este navegador y hay datos sin cuenta: preguntar.
      const counts = Object.fromEntries(DATA_KEYS.map((k) => [k, store[k].length])) as Record<keyof AppData, number>;
      useAuth.setState({ importCounts: counts });
    } else {
      store.resetData(user.uid);
      startSync(user.uid);
    }
  });
}

/** Respuesta al diálogo de datos locales: sumarlos a la cuenta o descartarlos. */
export async function resolveImport(upload: boolean) {
  const { user } = useAuth.getState();
  if (!user) return;
  const store = useAppStore.getState();
  useAuth.setState({ busy: true });
  try {
    if (upload) {
      const data: AppData = { squads: store.squads, players: store.players, exercises: store.exercises, sessions: store.sessions };
      await uploadAll(user.uid, data);
      useAppStore.setState({ ownerUid: user.uid });
    } else {
      store.resetData(user.uid);
    }
    useAuth.setState({ importCounts: null });
    startSync(user.uid);
  } finally {
    useAuth.setState({ busy: false });
  }
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    // Algunos celulares bloquean la ventana emergente: probar con redirección.
    if (err instanceof FirebaseError && err.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw err;
  }
}

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email.trim(), password);

export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email.trim(), password);

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email.trim());

/**
 * Sale de la cuenta. Antes sube lo pendiente; después borra los datos de este
 * navegador (quedan guardados en la cuenta) y recarga la página.
 */
export async function logOut() {
  flush();
  await Promise.race([waitForPendingWrites(db), new Promise((r) => setTimeout(r, 8000))]);
  stopSync();
  await signOut(auth);
  useAppStore.getState().resetData(null);
  await terminate(db);
  await clearIndexedDbPersistence(db).catch(() => {});
  window.location.reload();
}

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'El email o la contraseña no son correctos.',
  'auth/wrong-password': 'El email o la contraseña no son correctos.',
  'auth/user-not-found': 'No hay una cuenta con ese email.',
  'auth/invalid-email': 'El email no es válido.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email. Probá entrar o recuperar la contraseña.',
  'auth/weak-password': 'La contraseña tiene que tener al menos 6 caracteres.',
  'auth/missing-password': 'Escribí la contraseña.',
  'auth/too-many-requests': 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
  'auth/network-request-failed': 'No hay conexión a internet.',
  'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de terminar.',
  'auth/cancelled-popup-request': 'Se cerró la ventana de Google antes de terminar.',
  'auth/unauthorized-domain': 'Este sitio no está autorizado en Firebase (Authentication → Dominios autorizados).',
  'auth/operation-not-allowed': 'Este método de acceso no está habilitado en Firebase.',
};

export function authErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) return AUTH_ERRORS[err.code] ?? `No se pudo completar (${err.code}).`;
  return 'No se pudo completar. Probá de nuevo.';
}
