import { createContext } from 'react';

/**
 * Si la tarjeta flotante ya está ubicada y visible. El contenido espera a esto
 * para enfocar un campo: antes la tarjeta está oculta arriba de todo y el foco
 * fallaría (o haría saltar la página).
 */
export const FloatingPanelReady = createContext(true);
