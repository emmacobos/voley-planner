import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_VIEW_3D } from '../domain/perspective';
import type { View3D } from '../domain/perspective';

/**
 * Cómo se ve la pizarra en este navegador: horizontal (red vertical),
 * vertical (red horizontal, equipo A abajo) o inclinada (en perspectiva, con
 * su inclinación y su giro). Es solo la vista: las jugadas se guardan igual.
 */
interface BoardOrientation {
  vertical: boolean;
  /** Vista inclinada (en perspectiva). */
  tilted: boolean;
  tilt: number;
  turn: number;
  setVertical: (vertical: boolean) => void;
  setTilted: (tilted: boolean) => void;
  setView3d: (patch: Partial<View3D>) => void;
}

export const useBoardOrientation = create<BoardOrientation>()(
  persist(
    (set) => ({
      vertical: false,
      tilted: false,
      tilt: DEFAULT_VIEW_3D.tilt,
      turn: DEFAULT_VIEW_3D.turn,
      setVertical: (vertical) => set({ vertical, tilted: false }),
      setTilted: (tilted) => set({ tilted }),
      setView3d: (patch) => set(patch),
    }),
    { name: 'voley-planner-pizarra' },
  ),
);

/** La vista inclinada elegida (o null si se ve de arriba). */
export function useView3d(): View3D | null {
  const tilted = useBoardOrientation((s) => s.tilted);
  const tilt = useBoardOrientation((s) => s.tilt);
  const turn = useBoardOrientation((s) => s.turn);
  return useMemo(() => (tilted ? { tilt, turn } : null), [tilted, tilt, turn]);
}
