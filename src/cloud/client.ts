import type { SharedWorkspace, ShareRole } from './state';

/**
 * Acciones de la cuenta para la interfaz. Firebase se descarga recién la
 * primera vez que se usa alguna (o al iniciar, después de mostrar la app).
 */
const auth = () => import('./auth');
const sharing = () => import('./sharing');

export const initAuth = async () => (await auth()).initAuth();
export const resolveImport = async (upload: boolean) => (await auth()).resolveImport(upload);
export const signInWithGoogle = async () => (await auth()).signInWithGoogle();
export const signInWithEmail = async (email: string, password: string) => (await auth()).signInWithEmail(email, password);
export const signUpWithEmail = async (email: string, password: string) => (await auth()).signUpWithEmail(email, password);
export const resetPassword = async (email: string) => (await auth()).resetPassword(email);
export const logOut = async () => (await auth()).logOut();

export const openWorkspace = async (workspace: SharedWorkspace | null) => (await sharing()).openWorkspace(workspace);
export const shareWith = async (email: string, role: ShareRole) => (await sharing()).shareWith(email, role);
export const stopSharingWith = async (email: string) => (await sharing()).stopSharingWith(email);
export const retryInvites = async () => (await sharing()).retryInvites();
export const sendVerification = async () => (await sharing()).sendVerification();
export const recheckVerification = async () => (await sharing()).recheckVerification();
