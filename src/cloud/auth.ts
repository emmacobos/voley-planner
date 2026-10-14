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
import { DATA_KEYS, hasData, useAppStore } from '../store';
import type { AppData } from '../store';
import { auth, db } from './firebase';
import { forgetWorkspace, openWorkspace, savedWorkspace, startSharing, stopSharing } from './sharing';
import { flush, startSync, stopSync, uploadAll } from './sync';
import { useAuth } from './state';
import type { AccountUser } from './state';

export { authErrorMessage, useAuth } from './state';


/** Escucha la sesión de Firebase y conecta la sincronización. Se llama una vez al iniciar. */
export function initAuth() {
  onAuthStateChanged(auth, (fbUser) => {
    const store = useAppStore.getState();
    if (!fbUser) {
      stopSync();
      stopSharing();
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
    startSharing(user);

    const workspace = savedWorkspace();
    if (store.ownerUid === user.uid) {
      startSync(user.uid);
    } else if (workspace && store.ownerUid === workspace.ownerUid) {
      // Estaba viendo datos compartidos por otra cuenta.
      openWorkspace(workspace);
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
      const data = Object.fromEntries(DATA_KEYS.map((k) => [k, store[k]])) as unknown as AppData;
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
  forgetWorkspace();
  await Promise.race([waitForPendingWrites(db), new Promise((r) => setTimeout(r, 8000))]);
  stopSync();
  await signOut(auth);
  useAppStore.getState().resetData(null);
  await terminate(db);
  await clearIndexedDbPersistence(db).catch(() => {});
  window.location.reload();
}

