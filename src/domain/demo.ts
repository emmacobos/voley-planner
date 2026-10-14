import { formationTokens } from './formations';
import { assignLineup, roleTokenId } from './rotations';
import { todayISO } from './sessions';
import type {
  BoardElement,
  Exercise,
  Frame,
  Player,
  Position,
  SessionBlock,
  Squad,
  TrainingSession,
} from './types';

/**
 * Datos de ejemplo para recorrer la app sin cargar nada. Todos los ids
 * empiezan con este prefijo, así se pueden borrar de una vez.
 */
export const DEMO_PREFIX = 'ejemplo-';

export const isDemoId = (id: string) => id.startsWith(DEMO_PREFIX);

export interface DemoData {
  squads: Squad[];
  players: Player[];
  exercises: Exercise[];
  sessions: TrainingSession[];
}

const PLAYERS: [string, number, Position][] = [
  ['Sofía Romero', 1, 'armador'],
  ['Valentina Díaz', 2, 'opuesto'],
  ['Camila Herrera', 3, 'punta'],
  ['Martina López', 4, 'punta'],
  ['Lucía Fernández', 5, 'central'],
  ['Julieta Acosta', 6, 'central'],
  ['Florencia Paz', 7, 'libero'],
  ['Agustina Ruiz', 8, 'armador'],
  ['Micaela Torres', 9, 'punta'],
  ['Rocío Benítez', 10, 'central'],
  ['Carla Medina', 11, 'opuesto'],
  ['Paula Giménez', 12, 'punta'],
];

const id = (name: string) => `${DEMO_PREFIX}${name}`;

/** Próximo día hábil después de `today` (la sesión de ejemplo queda como próxima). */
function nextWeekday(today: Date): string {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return todayISO(d);
}

const frame = (name: string, note: string, situation: Frame['situation'], elements: BoardElement[]): Frame => ({
  id: id(`paso-${name}`),
  note,
  situation,
  elements,
});

/** Jugada en 3 pasos: saque rival, recepción y armado, y ataque por zona 4. */
function playFrames(players: Player[]): Frame[] {
  const lineup = assignLineup(players);
  const ball = (x: number, y: number): BoardElement => ({ id: id('pelota'), kind: 'ball', x, y });
  const arrow = (
    name: string,
    style: 'move' | 'ball',
    from: { x: number; y: number },
    to: { x: number; y: number },
    curve?: number,
  ): BoardElement => ({ id: id(`flecha-${name}`), kind: 'arrow', style, x1: from.x, y1: from.y, x2: to.x, y2: to.y, curve });

  const receive = formationTokens('A', 1, 'k1-recepcion', { lineup });
  const serveB = formationTokens('B', 1, 'k2-saque');
  const attack = formationTokens('A', 1, 'k1-ataque', { lineup });
  const defendB = formationTokens('B', 1, 'defensa-perimetral');
  const at = (tokens: BoardElement[], role: Parameters<typeof roleTokenId>[1], team: 'A' | 'B' = 'A') => {
    const t = tokens.find((e) => e.id === roleTokenId(team, role))!;
    return t as { x: number; y: number };
  };
  const server = serveB.find((t) => t.zone === 1)!;
  const libero = at(receive, 'L');
  const setterFrom = at(receive, 'S');
  const setterTo = at(attack, 'S');
  // En R1 el punta de adelante (zona 2 en recepción) ataca por zona 4.
  const hitter = attack.find((t) => t.role === 'punta' && t.zone !== undefined && [2, 3, 4].includes(t.zone))!;

  return [
    frame('1', 'Saque del rival y recepción del líbero', 'saque-B', [
      ...receive,
      ...serveB,
      ball(server.x, server.y + 0.8),
      arrow('saque', 'ball', { x: server.x - 0.3, y: server.y + 0.8 }, { x: libero.x + 0.4, y: libero.y }, 3),
      arrow('pase', 'ball', libero, { x: setterTo.x - 0.3, y: setterTo.y }),
      arrow('penetracion', 'move', setterFrom, setterTo),
    ]),
    frame('2', 'Armado a zona 4', 'juego', [
      ...attack,
      ...defendB,
      ball(setterTo.x - 0.3, setterTo.y),
      arrow('armado', 'ball', { x: setterTo.x - 0.3, y: setterTo.y }, { x: hitter.x + 0.6, y: hitter.y - 0.2 }, 1.6),
      arrow('ataque', 'ball', { x: hitter.x + 0.6, y: hitter.y }, { x: 15.5, y: 7.2 }),
    ]),
    frame('3', 'Ataque cruzado al fondo', 'juego', [...attack, ...defendB, ball(15.5, 7.2)]),
  ];
}

/** Arma un plantel, tres ejercicios y una sesión de ejemplo. */
export function buildDemoData(today: Date = new Date()): DemoData {
  const now = today.toISOString();
  const squad: Squad = { id: id('plantel'), name: 'Primera femenina (ejemplo)' };
  const players: Player[] = PLAYERS.map(([name, number, position]) => ({
    id: id(`jugadora-${number}`),
    squadId: squad.id,
    name,
    number,
    position,
  }));
  const starters = players.filter((p) => p.number <= 7);
  const base = { squadId: squad.id, notes: '', createdAt: now, updatedAt: now };

  const play: Exercise = {
    ...base,
    id: id('ejercicio-k1'),
    name: 'K1 en R1: recepción, armado y ataque',
    type: 'sintetico',
    objective: 'Construir el K1 desde la recepción del líbero con la penetración de la armadora.',
    durationMin: 25,
    intensity: 'media',
    playerIds: starters.map((p) => p.id),
    frames: playFrames(starters),
  };
  const warmup: Exercise = {
    ...base,
    id: id('ejercicio-parejas'),
    name: 'Toque y antebrazo en parejas',
    type: 'analitico',
    objective: 'Activar el control de pelota con desplazamientos cortos.',
    durationMin: 15,
    intensity: 'baja',
    playerIds: players.map((p) => p.id),
    frames: [
      frame('parejas', 'Una pelota cada dos, de lado a lado de la red', 'juego', [
        ...[1.5, 4.5, 7.5].flatMap((y, i): BoardElement[] => [
          { id: id(`pareja-a-${i}`), kind: 'player', team: 'A', label: String(i * 2 + 1), x: 5, y },
          { id: id(`pareja-b-${i}`), kind: 'player', team: 'B', label: String(i * 2 + 2), x: 13, y },
          { id: id(`pareja-pelota-${i}`), kind: 'ball', x: 5.7, y },
          { id: id(`pareja-flecha-${i}`), kind: 'arrow', style: 'ball', x1: 5.7, y1: y, x2: 12.3, y2: y, curve: -1.2 },
        ]),
        { id: id('pareja-texto'), kind: 'text', x: 9, y: -1.2, text: 'Toque de dedos y antebrazos', size: 'M', color: '#FFFFFF' },
      ]),
    ],
  };
  const game: Exercise = {
    ...base,
    id: id('ejercicio-6v6'),
    name: 'Juego 6 vs 6 con saque',
    type: 'global',
    objective: 'Aplicar el K1 en situación real: cada punto empieza con saque.',
    durationMin: 20,
    intensity: 'alta',
    playerIds: players.map((p) => p.id),
    frames: [
      frame('6v6', 'Rotan cada 3 puntos', 'saque-B', [
        ...formationTokens('A', 1, 'base', { lineup: assignLineup(starters) }),
        ...formationTokens('B', 1, 'base'),
      ]),
    ],
  };

  const all = players.map((p) => p.id);
  const block = (name: string, kind: SessionBlock['kind'], title: string, durationMin: number, items: [Exercise, number][], notes = ''): SessionBlock => ({
    id: id(`bloque-${name}`),
    kind,
    title,
    durationMin,
    items: items.map(([ex, min]) => ({ id: id(`item-${name}-${ex.id}`), exerciseId: ex.id, durationMin: min })),
    playerIds: all,
    notes,
  });
  const session: TrainingSession = {
    id: id('sesion'),
    name: 'Recepción y K1',
    date: nextWeekday(today),
    time: '19:00',
    squadId: squad.id,
    objective: 'Mejorar la recepción y la construcción del K1 en rotación 1.',
    notes: '',
    playerIds: all,
    blocks: [
      block('calentamiento', 'calentamiento', 'Calentamiento', 15, [[warmup, 15]]),
      block('tecnica', 'tecnica', 'Técnica de recepción', 20, [], 'Recepción en tríos: sacador, receptora y armadora.'),
      block('tactica', 'tactica', 'Táctica: K1', 25, [[play, 25]]),
      block('juego', 'juego', 'Juego', 20, [[game, 20]]),
      block('vuelta-calma', 'vuelta-calma', 'Vuelta a la calma', 10, [], 'Elongación y charla del entrenamiento.'),
    ],
    createdAt: now,
    updatedAt: now,
  };

  return { squads: [squad], players, exercises: [play, warmup, game], sessions: [session] };
}
