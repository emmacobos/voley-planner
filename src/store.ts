import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { newId } from './domain/ids';
import type { Exercise, Frame, Player } from './domain/types';

interface AppState {
  players: Player[];
  exercises: Exercise[];
  addPlayer: (p: Omit<Player, 'id'>) => void;
  updatePlayer: (id: string, patch: Partial<Omit<Player, 'id'>>) => void;
  removePlayer: (id: string) => void;
  createExercise: () => string;
  updateExercise: (id: string, patch: Partial<Omit<Exercise, 'id'>>) => void;
  duplicateExercise: (id: string) => string | undefined;
  removeExercise: (id: string) => void;
}

export function emptyFrame(): Frame {
  return { id: newId(), note: '', elements: [] };
}

const now = () => new Date().toISOString();

/**
 * Estado global de la app. En la Etapa 1 se guarda en el navegador
 * (localStorage); en la Etapa 3 se sincronizará con la cuenta del usuario.
 */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      players: [],
      exercises: [],

      addPlayer: (p) => set((s) => ({ players: [...s.players, { ...p, id: newId() }] })),

      updatePlayer: (id, patch) =>
        set((s) => ({
          players: s.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      removePlayer: (id) =>
        set((s) => ({
          players: s.players.filter((p) => p.id !== id),
          exercises: s.exercises.map((e) => ({
            ...e,
            playerIds: e.playerIds.filter((pid) => pid !== id),
          })),
        })),

      createExercise: () => {
        const id = newId();
        const exercise: Exercise = {
          id,
          name: 'Nuevo ejercicio',
          type: 'analitico',
          objective: '',
          durationMin: 15,
          intensity: 'media',
          notes: '',
          playerIds: [],
          frames: [emptyFrame()],
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ exercises: [exercise, ...s.exercises] }));
        return id;
      },

      updateExercise: (id, patch) =>
        set((s) => ({
          exercises: s.exercises.map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: now() } : e,
          ),
        })),

      duplicateExercise: (id) => {
        const original = get().exercises.find((e) => e.id === id);
        if (!original) return undefined;
        const copy: Exercise = {
          ...structuredClone(original),
          id: newId(),
          name: `${original.name} (copia)`,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ exercises: [copy, ...s.exercises] }));
        return copy.id;
      },

      removeExercise: (id) =>
        set((s) => ({ exercises: s.exercises.filter((e) => e.id !== id) })),
    }),
    { name: 'voley-planner', version: 1 },
  ),
);
