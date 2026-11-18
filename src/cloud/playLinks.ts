import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Links cortos de jugadas: la jugada (ya comprimida) se guarda en
 * `jugadas/{id}` y el link lleva solo el id. Cualquiera con el link la puede
 * leer; nadie la puede cambiar ni listar (ver `firestore.rules`).
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function newShortId(length = 10): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Sin respuesta')), ms))]);

/** Guarda la jugada y devuelve su id corto (falla si no hay conexión en unos segundos). */
export async function saveSharedPlay(code: string): Promise<string> {
  const id = newShortId();
  await withTimeout(setDoc(doc(db, 'jugadas', id), { code, createdAt: serverTimestamp() }), 6000);
  return id;
}

/** La jugada comprimida de un link corto. */
export async function loadSharedPlay(id: string): Promise<string> {
  const snap = await withTimeout(getDoc(doc(db, 'jugadas', id)), 15000);
  const code = snap.data()?.code;
  if (typeof code !== 'string') throw new Error('No existe');
  return code;
}
