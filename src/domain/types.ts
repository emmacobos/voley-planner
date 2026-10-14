export type Position = 'armador' | 'opuesto' | 'central' | 'punta' | 'libero';

export const POSITIONS: { value: Position; label: string; short: string }[] = [
  { value: 'armador', label: 'Armador', short: 'A' },
  { value: 'opuesto', label: 'Opuesto', short: 'O' },
  { value: 'central', label: 'Central', short: 'C' },
  { value: 'punta', label: 'Punta', short: 'P' },
  { value: 'libero', label: 'Líbero', short: 'L' },
];

export function positionLabel(p: Position | undefined): string {
  return POSITIONS.find((x) => x.value === p)?.label ?? '';
}

export function positionShort(p: Position | undefined): string {
  return POSITIONS.find((x) => x.value === p)?.short ?? '';
}

/** Plantel: grupo de jugadores (por ejemplo "Primera femenina" o "Sub 18"). */
export interface Squad {
  id: string;
  name: string;
}

export interface Player {
  id: string;
  squadId: string;
  name: string;
  number: number;
  position: Position;
  /** Fecha de nacimiento AAAA-MM-DD (opcional). */
  birthDate?: string;
  phone?: string;
  /** Observaciones del entrenador (lesiones, disponibilidad, etc.). */
  notes?: string;
  /** Objetivos personales para trabajar con la jugadora. */
  goals?: PlayerGoal[];
}

export interface PlayerGoal {
  id: string;
  text: string;
  done: boolean;
}

export type Team = 'A' | 'B';

/** Zona de rotación (1 a 6). */
export type Zone = 1 | 2 | 3 | 4 | 5 | 6;

interface Positioned {
  id: string;
  x: number;
  y: number;
}

export interface PlayerToken extends Positioned {
  kind: 'player';
  team: Team;
  label: string;
  role?: Position;
  playerId?: string;
  zone?: Zone;
  /** Comentario que se ve debajo del jugador en este paso (por ejemplo "Se desplaza a 1"). */
  comment?: string;
}

export interface BallElement extends Positioned {
  kind: 'ball';
}

export interface ConeElement extends Positioned {
  kind: 'cone';
}

export interface CoachElement extends Positioned {
  kind: 'coach';
}

export interface CartElement extends Positioned {
  kind: 'cart';
}

export type ArrowStyle = 'move' | 'ball';

export interface ArrowElement {
  id: string;
  kind: 'arrow';
  style: ArrowStyle;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Curvatura en metros (0 o ausente: recta). Ver `domain/arrows.ts`. */
  curve?: number;
}

export type TextSize = 'S' | 'M' | 'L';

/** Texto escrito en el tablero (puede tener varias líneas). */
export interface TextElement extends Positioned {
  kind: 'text';
  text: string;
  /** Tamaño de base (se usa si no hay `fontSize`). */
  size: TextSize;
  color: string;
  /** Alto de letra en metros, elegido a mano (pisa a `size`). */
  fontSize?: number;
  /** Ancho del cuadro en metros: si está, las líneas se cortan para entrar en ese ancho. */
  width?: number;
}

/**
 * Sombra del bloqueo: zona que tapa el bloqueo, desde el bloqueo (x1, y1)
 * hacia el fondo (x2, y2). Se abre de `startWidth` a `endWidth` metros.
 */
export interface BlockShadowElement {
  id: string;
  kind: 'shadow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  startWidth: number;
  endWidth: number;
}

export type PointElement =
  | PlayerToken
  | BallElement
  | ConeElement
  | CoachElement
  | CartElement
  | TextElement;

/** Elementos definidos por dos extremos (se arrastran por sus puntas). */
export type SegmentElement = ArrowElement | BlockShadowElement;

export type BoardElement = PointElement | SegmentElement;

export function isSegment(e: BoardElement): e is SegmentElement {
  return e.kind === 'arrow' || e.kind === 'shadow';
}

/**
 * Momento del juego que representa un paso. Solo al momento del saque se
 * controlan las zonas, y únicamente al equipo que recibe.
 */
export type Situation = 'saque-A' | 'saque-B' | 'juego';

export const SITUATIONS: { value: Situation; label: string }[] = [
  { value: 'saque-A', label: 'Saque del equipo A' },
  { value: 'saque-B', label: 'Saque del equipo B' },
  { value: 'juego', label: 'Pelota en juego' },
];

export interface Frame {
  id: string;
  note: string;
  /** Si falta (datos viejos) se toma como pelota en juego. */
  situation?: Situation;
  elements: BoardElement[];
}

export type ExerciseType = 'analitico' | 'sintetico' | 'global';

export const EXERCISE_TYPES: {
  value: ExerciseType;
  label: string;
  description: string;
}[] = [
  {
    value: 'analitico',
    label: 'Analítico',
    description: 'Técnica aislada de un fundamento',
  },
  {
    value: 'sintetico',
    label: 'Sintético',
    description: 'Combina fundamentos o una fase del juego',
  },
  { value: 'global', label: 'Global', description: 'Situación real de juego' },
];

export type Intensity = 'baja' | 'media' | 'alta';

export const INTENSITIES: { value: Intensity; label: string }[] = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
];

/** Sistema de juego con el que se arman las formaciones del ejercicio. */
export type GameSystem = '5-1' | '4-2' | '6-0';

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  objective: string;
  durationMin: number;
  intensity: Intensity;
  notes: string;
  squadId: string | null;
  playerIds: string[];
  frames: Frame[];
  /** Sin valor es 5-1. */
  system?: GameSystem;
  /** Qué se trabaja (si falta, se deduce del nombre y el objetivo). */
  contents?: Content[];
  createdAt: string;
  updatedAt: string;
}

export type Content =
  | 'saque'
  | 'recepcion'
  | 'armado'
  | 'ataque'
  | 'bloqueo'
  | 'defensa'
  | 'contraataque'
  | 'fisico'
  | 'juego';

export type PhaseKind = 'pretemporada' | 'competencia' | 'puesta-a-punto' | 'transicion' | 'otro';

/** Etapa de la temporada (macrociclo): varias semanas con un objetivo. */
export interface SeasonPhase {
  id: string;
  /** Plantel, o null si vale para todos. */
  squadId: string | null;
  name: string;
  kind: PhaseKind;
  /** Fechas AAAA-MM-DD, incluidas. */
  start: string;
  end: string;
  objective: string;
  /** Contenidos que se quieren priorizar en la etapa. */
  focus: Content[];
  createdAt: string;
  updatedAt: string;
}

export type BlockKind = 'calentamiento' | 'tecnica' | 'tactica' | 'juego' | 'vuelta-calma' | 'otro';

export const BLOCK_KINDS: { value: BlockKind; label: string }[] = [
  { value: 'calentamiento', label: 'Calentamiento' },
  { value: 'tecnica', label: 'Técnica' },
  { value: 'tactica', label: 'Táctica' },
  { value: 'juego', label: 'Juego' },
  { value: 'vuelta-calma', label: 'Vuelta a la calma' },
  { value: 'otro', label: 'Otro' },
];

/** Un ejercicio de la biblioteca dentro de un bloque, con su duración en la sesión. */
export interface BlockItem {
  id: string;
  exerciseId: string;
  durationMin: number;
}

export interface SessionBlock {
  id: string;
  kind: BlockKind;
  title: string;
  /** Duración del bloque cuando no tiene ejercicios (por ejemplo, un calentamiento libre). */
  durationMin: number;
  items: BlockItem[];
  /** Jugadores que participan del bloque (entre los convocados). */
  playerIds: string[];
  notes: string;
}

/** Asistencia de una jugadora a una sesión y su esfuerzo percibido (RPE 1 a 10). */
export interface AttendanceRecord {
  present: boolean;
  rpe?: number;
}

export interface TrainingSession {
  id: string;
  name: string;
  /** Fecha en formato AAAA-MM-DD. */
  date: string;
  /** Hora en formato HH:MM (opcional). */
  time: string;
  squadId: string | null;
  objective: string;
  notes: string;
  /** Jugadores convocados a la sesión. */
  playerIds: string[];
  blocks: SessionBlock[];
  /** Asistencia y esfuerzo por jugadora (se carga después del entrenamiento). */
  attendance?: Record<string, AttendanceRecord>;
  createdAt: string;
  updatedAt: string;
}

/** Scouting del rival y plan de juego de un partido. */
export interface MatchPlan {
  /** Sistema con el que juega el rival. */
  rivalSystem?: GameSystem;
  /** Jugadoras clave del rival (número, puesto y qué hacen). */
  keyPlayers: string;
  strengths: string;
  weaknesses: string;
  /** A dónde y cómo sacar. */
  serve: string;
  /** Bloqueo y defensa. */
  defense: string;
  /** Claves del partido para el equipo. */
  keys: string;
  /** Pizarra del plan (rotaciones del rival, jugadas, etc.). */
  frames: Frame[];
  /** Nuestro sistema para las formaciones de la pizarra del plan. */
  system?: GameSystem;
}

/** Partido del calendario. */
export interface Match {
  id: string;
  squadId: string | null;
  /** Fecha AAAA-MM-DD y hora HH:MM (opcional). */
  date: string;
  time: string;
  opponent: string;
  /** true si somos locales. */
  home: boolean;
  venue: string;
  /** Torneo o liga. */
  competition: string;
  notes: string;
  /** Resultado en sets, por ejemplo "3-1" (se carga después). */
  result: string;
  plan?: MatchPlan;
  /** Estadísticas anotadas durante el partido. */
  stats?: MatchStats;
  createdAt: string;
  updatedAt: string;
}

export type StatSkill = 'saque' | 'recepcion' | 'ataque' | 'bloqueo' | 'defensa';

/** Lo que se anota durante el partido, en orden. */
export type StatEvent =
  /** Una acción de una jugadora: fundamento y resultado (ver `SKILLS` en domain/stats). */
  | { id: string; type: 'accion'; playerId: string | null; skill: StatSkill; result: string }
  /** Punto que no fue de una jugadora nuestra: error del rival (punto nuestro) o punto del rival. */
  | { id: string; type: 'rival'; result: 'error' | 'punto' }
  /** Empieza un set: rotación inicial (armador en la zona…) y quién saca. */
  | { id: string; type: 'set'; rotation: number; serving: 'nosotros' | 'rival' }
  /** Corrección manual de la rotación. */
  | { id: string; type: 'rotacion'; rotation: number };

export interface MatchStats {
  events: StatEvent[];
}

/** Objetivo de una semana (microciclo) para un plantel o para todos. */
export interface WeekPlan {
  /** `${weekStart}_${squadId ?? 'todos'}` */
  id: string;
  /** Lunes de la semana (AAAA-MM-DD). */
  weekStart: string;
  squadId: string | null;
  objective: string;
}

/** Plantilla de sesión: bloques y ejercicios para reusar (sin fecha ni convocados). */
export interface SessionTemplate {
  id: string;
  name: string;
  objective: string;
  notes: string;
  squadId: string | null;
  blocks: SessionBlock[];
  createdAt: string;
  updatedAt: string;
}
