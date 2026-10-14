import { create } from 'zustand';
import type { AppData } from '../store';

/**
 * Estado de la cuenta, la sincronización y lo compartido, sin Firebase: así
 * la interfaz lo usa sin tener que descargar Firebase al abrir la app (se
 * carga aparte, ver `client.ts`).
 */

/** Código de un error de Firebase (por ejemplo, 'permission-denied'). */
export function errorCode(err: unknown): string | null {
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string') {
    return (err as { code: string }).code;
  }
  return null;
}

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

export type SyncState = 'off' | 'loading' | 'saving' | 'saved' | 'offline' | 'error' | 'readonly';

interface SyncStatus {
  state: SyncState;
  error: string | null;
}

export const useSyncStatus = create<SyncStatus>(() => ({ state: 'off', error: null }));

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

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

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
  const code = errorCode(err);
  if (code) return AUTH_ERRORS[code] ?? `No se pudo completar (${code}).`;
  return 'No se pudo completar. Probá de nuevo.';
}
