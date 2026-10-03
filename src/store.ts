import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { newId } from './domain/ids';
import type { Exercise, Frame, Player, Squad } from './domain/types';

interface AppState {
  squads: Squad[];
  players: Player[];
  exercises: Exercise[];
  addSquad: (name: string) => string;
  renameSquad: (id: string, name: string) => void;
  /** Elimina el plantel y sus jugadores. */
  removeSquad: (id: string) => void;
  addPlayer: (p: Omit<Player, 'id'>) => void;
  updatePlayer: (id: string, patch: Partial<Omit<Player, 'id'>>) => void;
  removePlayer: (id: string) => void;
  createExercise: () => string;
  updateExercise: (id: string, patch: Partial<Omit<Exercise, 'id'>>) => void;
  duplicateExercise: (id: string) => string | undefined;
  removeExercise: (id: string) => void;
}

export function emptyFrame(): Frame {
  return { id: newId(), note: '', situation: 'juego', elements: [] };
}

const now = () => new Date().toISOString();

/**
 * Estado global de la app. En la Etapa 1 se guarda en el navegador
 * (localStorage); en la Etapa 3 se sincronizará con la cuenta del usuario.
 */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      squads: [],
      players: [],
      exercises: [],

      addSquad: (name) => {
        const id = newId();
        set((s) => ({ squads: [...s.squads, { id, name }] }));
        return id;
      },

      renameSquad: (id, name) =>
        set((s) => ({ squads: s.squads.map((q) => (q.id === id ? { ...q, name } : q)) })),

      removeSquad: (id) =>
        set((s) => {
          const removed = new Set(s.players.filter((p) => p.squadId === id).map((p) => p.id));
          return {
            squads: s.squads.filter((q) => q.id !== id),
            players: s.players.filter((p) => p.squadId !== id),
            exercises: s.exercises.map((e) =>
              e.squadId === id
                ? { ...e, squadId: null, playerIds: e.playerIds.filter((pid) => !removed.has(pid)) }
                : e,
            ),
          };
        }),

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
          squadId: get().squads[0]?.id ?? null,
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
    {
      name: 'voley-planner',
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Partial<AppState>;
        if (version < 2) {
          // v1 no tenía planteles: los jugadores existentes pasan a "Mi equipo".
          const players = (state.players ?? []) as Player[];
          const squad: Squad = { id: newId(), name: 'Mi equipo' };
          return {
            ...state,
            squads: players.length ? [squad] : [],
            players: players.map((p) => ({ ...p, squadId: squad.id })),
            exercises: (state.exercises ?? []).map((e) => ({
              ...e,
              squadId: players.length ? squad.id : null,
            })),
          } as AppState;
        }
        return state as AppState;
      },
    },
  ),
);
