import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Cómo se ve la pizarra en este navegador: horizontal (red vertical) o
 * vertical (red horizontal, equipo A abajo). Es solo la vista: las jugadas se
 * guardan igual.
 */
interface BoardOrientation {
  vertical: boolean;
  setVertical: (vertical: boolean) => void;
}

export const useBoardOrientation = create<BoardOrientation>()(
  persist(
    (set) => ({
      vertical: false,
      setVertical: (vertical) => set({ vertical }),
    }),
    { name: 'voley-planner-pizarra' },
  ),
);
