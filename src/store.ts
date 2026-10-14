import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { buildDemoData, isDemoId } from './domain/demo';
import type { LibraryExercise } from './domain/library';
import { newId } from './domain/ids';
import { defaultBlocks, todayISO } from './domain/sessions';
import type { Exercise, Frame, Match, Player, SessionBlock, SessionTemplate, Squad, TrainingSession, WeekPlan } from './domain/types';

/** Datos del usuario (lo que se sincroniza con la nube). */
export interface AppData {
  squads: Squad[];
  players: Player[];
  exercises: Exercise[];
  sessions: TrainingSession[];
  matches: Match[];
  weeks: WeekPlan[];
  templates: SessionTemplate[];
}

export const DATA_KEYS = ['squads', 'players', 'exercises', 'sessions', 'matches', 'weeks', 'templates'] as const;
export type DataKey = (typeof DATA_KEYS)[number];

export const EMPTY_DATA: AppData = {
  squads: [],
  players: [],
  exercises: [],
  sessions: [],
  matches: [],
  weeks: [],
  templates: [],
};

export function hasData(data: AppData): boolean {
  return DATA_KEYS.some((k) => data[k].length > 0);
}

interface AppState extends AppData {
  /**
   * Cuenta a la que pertenecen los datos guardados en este navegador, o null
   * si son datos locales sin cuenta.
   */
  ownerUid: string | null;
  /** Reemplaza todos los datos (por ejemplo al salir de la cuenta). */
  resetData: (ownerUid: string | null) => void;
  addSquad: (name: string) => string;
  renameSquad: (id: string, name: string) => void;
  /** Elimina el plantel y sus jugadores. */
  removeSquad: (id: string) => void;
  addPlayer: (p: Omit<Player, 'id'>) => void;
  updatePlayer: (id: string, patch: Partial<Omit<Player, 'id'>>) => void;
  removePlayer: (id: string) => void;
  createExercise: () => string;
  /** Copia un ejercicio modelo a la biblioteca y devuelve su id. */
  copyLibraryExercise: (model: LibraryExercise) => string;
  updateExercise: (id: string, patch: Partial<Omit<Exercise, 'id'>>) => void;
  duplicateExercise: (id: string) => string | undefined;
  removeExercise: (id: string) => void;
  createSession: () => string;
  updateSession: (id: string, patch: Partial<Omit<TrainingSession, 'id'>>) => void;
  duplicateSession: (id: string) => string | undefined;
  removeSession: (id: string) => void;
  /** Guarda la sesión como plantilla y devuelve su id. */
  saveTemplate: (sessionId: string, name: string) => string | undefined;
  /** Crea una sesión a partir de una plantilla (en esa fecha, o hoy) y devuelve su id. */
  createSessionFromTemplate: (templateId: string, date?: string) => string | undefined;
  renameTemplate: (id: string, name: string) => void;
  removeTemplate: (id: string) => void;
  /** Crea un partido para esa fecha y devuelve su id. */
  createMatch: (date: string, squadId: string | null) => string;
  updateMatch: (id: string, patch: Partial<Omit<Match, 'id'>>) => void;
  removeMatch: (id: string) => void;
  /** Objetivo de la semana (vacío lo borra). */
  setWeekObjective: (weekStart: string, squadId: string | null, objective: string) => void;
  /** Suma el plantel, los ejercicios y la sesión de ejemplo. */
  loadDemo: () => void;
  /** Borra todo lo que vino con el ejemplo. */
  removeDemo: () => void;
}

/** ¿Hay datos de ejemplo cargados? */
export function hasDemo(data: AppData): boolean {
  return DATA_KEYS.some((k) => data[k].some((item) => isDemoId(item.id) || ('squadId' in item && isDemoId(item.squadId ?? ''))));
}

/** Quita jugadores de los convocados y de los bloques de una sesión. */
function withoutPlayers(session: TrainingSession, ids: Set<string>): TrainingSession {
  const keep = (pid: string) => !ids.has(pid);
  return {
    ...session,
    playerIds: session.playerIds.filter(keep),
    blocks: session.blocks.map((b) => ({ ...b, playerIds: b.playerIds.filter(keep) })),
  };
}

/** Copia los bloques con ids nuevos (y, si se pide, sin jugadores). */
function cloneBlocks(blocks: SessionBlock[], withoutPlayers = false): SessionBlock[] {
  return blocks.map((b) => ({
    ...structuredClone(b),
    id: newId(),
    items: b.items.map((it) => ({ ...it, id: newId() })),
    ...(withoutPlayers ? { playerIds: [] } : {}),
  }));
}

export function emptyFrame(): Frame {
  return { id: newId(), note: '', situation: 'juego', elements: [] };
}

const now = () => new Date().toISOString();

/**
 * Estado global de la app. Se guarda en el navegador (localStorage) y, si hay
 * una cuenta abierta, se sincroniza con Firestore (ver `src/cloud/sync.ts`).
 */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      squads: [],
      players: [],
      exercises: [],
      sessions: [],
      matches: [],
      weeks: [],
      templates: [],
      ownerUid: null,

      resetData: (ownerUid) => set({ ...EMPTY_DATA, ownerUid }),

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
            sessions: s.sessions.map((ses) =>
              ses.squadId === id ? withoutPlayers({ ...ses, squadId: null }, removed) : ses,
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
          sessions: s.sessions.map((ses) => withoutPlayers(ses, new Set([id]))),
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

      copyLibraryExercise: ({ key: _key, ...model }) => {
        const id = newId();
        const exercise: Exercise = {
          ...structuredClone(model),
          id,
          frames: structuredClone(model.frames).map((f) => ({ ...f, id: newId() })),
          squadId: get().squads[0]?.id ?? null,
          playerIds: [],
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
        set((s) => ({
          exercises: s.exercises.filter((e) => e.id !== id),
          sessions: s.sessions.map((ses) => ({
            ...ses,
            blocks: ses.blocks.map((b) => ({ ...b, items: b.items.filter((it) => it.exerciseId !== id) })),
          })),
        })),

      createSession: () => {
        const id = newId();
        const session: TrainingSession = {
          id,
          name: 'Nueva sesión',
          date: todayISO(),
          time: '',
          squadId: get().squads[0]?.id ?? null,
          objective: '',
          notes: '',
          playerIds: [],
          blocks: defaultBlocks(),
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ sessions: [session, ...s.sessions] }));
        return id;
      },

      updateSession: (id, patch) =>
        set((s) => ({
          sessions: s.sessions.map((ses) => (ses.id === id ? { ...ses, ...patch, updatedAt: now() } : ses)),
        })),

      duplicateSession: (id) => {
        const original = get().sessions.find((ses) => ses.id === id);
        if (!original) return undefined;
        // La copia es una sesión nueva: sin la asistencia de la original.
        const { attendance: _attendance, ...rest } = structuredClone(original);
        const copy: TrainingSession = {
          ...rest,
          id: newId(),
          name: `${original.name} (copia)`,
          blocks: cloneBlocks(original.blocks),
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ sessions: [copy, ...s.sessions] }));
        return copy.id;
      },

      removeSession: (id) => set((s) => ({ sessions: s.sessions.filter((ses) => ses.id !== id) })),

      saveTemplate: (sessionId, name) => {
        const session = get().sessions.find((x) => x.id === sessionId);
        if (!session) return undefined;
        const template: SessionTemplate = {
          id: newId(),
          name: name.trim() || session.name,
          objective: session.objective,
          notes: session.notes,
          squadId: session.squadId,
          blocks: cloneBlocks(session.blocks, true),
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ templates: [...s.templates, template] }));
        return template.id;
      },

      createSessionFromTemplate: (templateId, date) => {
        const template = get().templates.find((t) => t.id === templateId);
        if (!template) return undefined;
        const squadExists = get().squads.some((q) => q.id === template.squadId);
        const session: TrainingSession = {
          id: newId(),
          name: template.name,
          date: date ?? todayISO(),
          time: '',
          squadId: squadExists ? template.squadId : (get().squads[0]?.id ?? null),
          objective: template.objective,
          notes: template.notes,
          playerIds: [],
          blocks: cloneBlocks(template.blocks, true),
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ sessions: [session, ...s.sessions] }));
        return session.id;
      },

      renameTemplate: (id, name) =>
        set((s) => ({ templates: s.templates.map((t) => (t.id === id ? { ...t, name, updatedAt: now() } : t)) })),
      removeTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),

      createMatch: (date, squadId) => {
        const id = newId();
        const match: Match = {
          id,
          squadId,
          date,
          time: '',
          opponent: '',
          home: true,
          venue: '',
          competition: '',
          notes: '',
          result: '',
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ matches: [...s.matches, match] }));
        return id;
      },
      updateMatch: (id, patch) =>
        set((s) => ({ matches: s.matches.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: now() } : m)) })),
      removeMatch: (id) => set((s) => ({ matches: s.matches.filter((m) => m.id !== id) })),

      setWeekObjective: (weekStart, squadId, objective) =>
        set((s) => {
          const id = `${weekStart}_${squadId ?? 'todos'}`;
          const rest = s.weeks.filter((w) => w.id !== id);
          return { weeks: objective.trim() ? [...rest, { id, weekStart, squadId, objective }] : rest };
        }),

      loadDemo: () => {
        if (hasDemo(get())) return;
        const demo = buildDemoData();
        set((s) => ({
          squads: [...s.squads, ...demo.squads],
          players: [...s.players, ...demo.players],
          exercises: [...demo.exercises, ...s.exercises],
          sessions: [...demo.sessions, ...s.sessions],
          matches: [...s.matches, ...demo.matches],
          weeks: [...s.weeks, ...demo.weeks],
        }));
      },

      removeDemo: () =>
        set((s) => {
          const demoPlayers = new Set(s.players.filter((p) => isDemoId(p.id)).map((p) => p.id));
          const keep = (x: { id: string }) => !isDemoId(x.id);
          // Lo propio que quedó asociado al plantel, las jugadoras o los ejercicios de ejemplo se desvincula.
          // Solo se tocan los objetos afectados, para que la nube suba únicamente lo que cambió.
          const unSquad = <T extends { squadId: string | null }>(x: T): T =>
            isDemoId(x.squadId ?? '') ? { ...x, squadId: null } : x;
          const touches = (blocks: SessionBlock[]) =>
            blocks.some((b) => b.playerIds.some((p) => demoPlayers.has(p)) || b.items.some((i) => isDemoId(i.exerciseId)));
          const cleanBlocks = (blocks: SessionBlock[]) =>
            blocks.map((b) => ({
              ...b,
              playerIds: b.playerIds.filter((p) => !demoPlayers.has(p)),
              items: b.items.filter((i) => !isDemoId(i.exerciseId)),
            }));
          return {
            squads: s.squads.filter(keep),
            players: s.players.filter(keep),
            matches: s.matches.filter(keep).map(unSquad),
            weeks: s.weeks.filter((x) => !isDemoId(x.squadId ?? '')),
            exercises: s.exercises
              .filter(keep)
              .map(unSquad)
              .map((x) =>
                x.playerIds.some((p) => demoPlayers.has(p)) ? { ...x, playerIds: x.playerIds.filter((p) => !demoPlayers.has(p)) } : x,
              ),
            sessions: s.sessions
              .filter(keep)
              .map(unSquad)
              .map((x) => {
                const attendance = x.attendance && Object.keys(x.attendance).some((p) => demoPlayers.has(p));
                if (!x.playerIds.some((p) => demoPlayers.has(p)) && !touches(x.blocks) && !attendance) return x;
                return {
                  ...withoutPlayers(x, demoPlayers),
                  blocks: cleanBlocks(x.blocks),
                  ...(x.attendance
                    ? { attendance: Object.fromEntries(Object.entries(x.attendance).filter(([p]) => !demoPlayers.has(p))) }
                    : {}),
                };
              }),
            templates: s.templates.map(unSquad).map((t) => (touches(t.blocks) ? { ...t, blocks: cleanBlocks(t.blocks) } : t)),
          };
        }),
    }),
    {
      name: 'voley-planner',
      version: 5,
      migrate: (persisted, version) => {
        let state = persisted as Partial<AppState>;
        if (version < 2) {
          // v1 no tenía planteles: los jugadores existentes pasan a "Mi equipo".
          const players = (state.players ?? []) as Player[];
          const squad: Squad = { id: newId(), name: 'Mi equipo' };
          state = {
            ...state,
            squads: players.length ? [squad] : [],
            players: players.map((p) => ({ ...p, squadId: squad.id })),
            exercises: (state.exercises ?? []).map((e) => ({
              ...e,
              squadId: players.length ? squad.id : null,
            })),
          };
        }
        if (version < 3) {
          // v3 agrega las sesiones de entrenamiento.
          state = { ...state, sessions: [] };
        }
        if (version < 4) {
          // v4 agrega el calendario: partidos y objetivos de cada semana.
          state = { ...state, matches: [], weeks: [] };
        }
        if (version < 5) {
          // v5 agrega las plantillas de sesión.
          state = { ...state, templates: [] };
        }
        return state as AppState;
      },
    },
  ),
);
