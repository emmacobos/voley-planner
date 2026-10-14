import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

/**
 * Configuración pública del proyecto de Firebase. No es secreta: la seguridad
 * de los datos la dan las reglas de Firestore (`firestore.rules`).
 */
const firebaseConfig = {
  apiKey: 'AIzaSyBxwZKzA_dk1NXA2KIXVj7iZLAzg1alXqQ',
  authDomain: 'voley-planner.firebaseapp.com',
  projectId: 'voley-planner',
  storageBucket: 'voley-planner.firebasestorage.app',
  messagingSenderId: '909220462957',
  appId: '1:909220462957:web:1ac31ba574929277955a64',
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
auth.languageCode = 'es';

/**
 * Firestore con caché local persistente: la app sigue funcionando sin
 * internet y sincroniza al volver la conexión, aun con varias pestañas.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  // Los campos opcionales (por ejemplo el teléfono de un jugador) pueden ser undefined.
  ignoreUndefinedProperties: true,
});
