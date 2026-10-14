import { formationTokens } from './formations';
import { assignLineup, roleTokenId } from './rotations';
import { todayISO } from './sessions';
import { nextRotation, replay, setFinished, setsResult } from './stats';
import type {
  MatchStats,
  SeasonPhase,
  StatEvent,
  BoardElement,
  Exercise,
  Frame,
  Match,
  Player,
  Position,
  SessionBlock,
  Squad,
  TrainingSession,
  WeekPlan,
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
  matches: Match[];
  weeks: WeekPlan[];
  phases: SeasonPhase[];
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
      arrow('pase', 'ball', libero, { x: setterTo.x - 0.2, y: setterTo.y - 0.65 }),
      arrow('penetracion', 'move', setterFrom, setterTo),
    ]),
    frame('2', 'Armado a zona 4', 'juego', [
      ...attack,
      ...defendB,
      ball(setterTo.x - 0.2, setterTo.y - 0.65),
      arrow('armado', 'ball', { x: setterTo.x - 0.2, y: setterTo.y - 0.65 }, { x: hitter.x + 0.6, y: hitter.y - 0.2 }, 1.6),
      arrow('ataque', 'ball', { x: hitter.x + 0.6, y: hitter.y }, { x: 15.5, y: 7.2 }),
    ]),
    frame('3', 'Ataque cruzado al fondo', 'juego', [...attack, ...defendB, ball(15.5, 7.2)]),
  ];
}

/**
 * Estadísticas de un partido de ejemplo, simuladas con números fijos (siempre
 * da lo mismo). La recepción en R4 sale floja a propósito, para que el resumen
 * muestre una "rotación a trabajar".
 */
function demoStats(players: Player[]): MatchStats {
  let seed = 23;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  const byNumber = (n: number) => players.find((p) => p.number === n)!.id;
  const servers = [1, 2, 3, 4, 5, 6].map(byNumber);
  const receivers = [7, 3, 4].map(byNumber);
  const hitters = [2, 3, 4, 5, 6].map(byNumber);
  const blockers = [2, 5, 6].map(byNumber);
  const events: StatEvent[] = [];
  let n = 0;
  type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;
  const push = (e: WithoutId<StatEvent>) => events.push({ ...e, id: `${DEMO_PREFIX}st-${n++}` } as StatEvent);
  const chance = (p: number) => rand() < p;

  let setsUs = 0;
  let setsThem = 0;
  for (let number = 1; setsUs < 3 && setsThem < 3; number++) {
    let serving: 'nosotros' | 'rival' = number % 2 ? 'nosotros' : 'rival';
    let rotation = 1;
    push({ type: 'set', rotation, serving });
    const score = { number, us: 0, them: 0 };
    let turn = 0;
    while (!setFinished(score)) {
      let winner: 'nosotros' | 'rival' | null = null;
      if (serving === 'nosotros') {
        const r = rand();
        const result = r < 0.08 ? 'ace' : r < 0.18 ? 'error' : r < 0.38 ? 'complica' : 'en-juego';
        push({ type: 'accion', playerId: servers[turn++ % 6], skill: 'saque', result });
        if (result === 'ace') winner = 'nosotros';
        if (result === 'error') winner = 'rival';
      } else {
        const weak = rotation === 4;
        const r = rand();
        const result = r < (weak ? 0.18 : 0.06) ? 'error' : r < (weak ? 0.4 : 0.42) ? 'perfecta' : r < (weak ? 0.62 : 0.75) ? 'buena' : 'mala';
        push({ type: 'accion', playerId: pick(receivers), skill: 'recepcion', result });
        if (result === 'error') winner = 'rival';
      }
      // La jugada sigue: ataques, bloqueos y defensas hasta que alguien gana el punto.
      for (let i = 0; !winner && i < 6; i++) {
        if (chance(0.45)) {
          const r = rand();
          const result = r < 0.42 ? 'punto' : r < 0.52 ? 'error' : r < 0.6 ? 'bloqueado' : 'en-juego';
          push({ type: 'accion', playerId: pick(hitters), skill: 'ataque', result });
          if (result === 'punto') winner = 'nosotros';
          else if (result !== 'en-juego') winner = 'rival';
        } else if (chance(0.25)) {
          const result = chance(0.35) ? 'punto' : chance(0.2) ? 'error' : 'toque';
          push({ type: 'accion', playerId: pick(blockers), skill: 'bloqueo', result });
          if (result === 'punto') winner = 'nosotros';
          if (result === 'error') winner = 'rival';
        } else {
          const r = rand();
          if (r < 0.4) {
            push({ type: 'rival', result: 'punto' });
            winner = 'rival';
          } else if (r < 0.6) {
            push({ type: 'rival', result: 'error' });
            winner = 'nosotros';
          } else {
            push({ type: 'accion', playerId: byNumber(7), skill: 'defensa', result: 'levantada' });
          }
        }
      }
      if (!winner) {
        push({ type: 'rival', result: 'punto' });
        winner = 'rival';
      }
      if (winner === 'nosotros') {
        score.us++;
        if (serving === 'rival') rotation = nextRotation(rotation);
        serving = 'nosotros';
      } else {
        score.them++;
        serving = 'rival';
      }
    }
    if (score.us > score.them) setsUs++;
    else setsThem++;
  }
  return { events };
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

  // Tres sesiones ya hechas, con asistencia y esfuerzo, para ver la carga del plantel.
  const past = (name: string, daysAgo: number, title: string, rpeBase: number): TrainingSession => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo);
    return {
      ...session,
      id: id(`sesion-${name}`),
      name: title,
      date: todayISO(d),
      objective: '',
      blocks: session.blocks.map((b) => ({
        ...b,
        id: `${b.id}-${name}`,
        items: b.items.map((i) => ({ ...i, id: `${i.id}-${name}` })),
      })),
      attendance: Object.fromEntries(
        players.map((p, i) => [
          p.id,
          // La 12 faltó a todas y la 9 a una; la 3 tuvo una semana muy exigente.
          p.number === 12 || (p.number === 9 && name === 'anterior')
            ? { present: false }
            : { present: true, rpe: p.number === 3 && name === 'reciente' ? 9 : Math.min(10, rpeBase + (i % 3)) },
        ]),
      ),
    };
  };

  // Partido el sábado siguiente a la sesión y objetivo de la semana.
  const sessionDay = new Date(`${session.date}T00:00:00`);
  const saturday = new Date(sessionDay.getFullYear(), sessionDay.getMonth(), sessionDay.getDate() + ((6 - sessionDay.getDay() + 7) % 7 || 7));
  const match: Match = {
    id: id('partido'),
    squadId: squad.id,
    date: todayISO(saturday),
    time: '18:00',
    opponent: 'Club Atlético Ejemplo',
    home: true,
    venue: 'Gimnasio del club',
    competition: 'Liga metropolitana',
    notes: 'Sacan fuerte desde zona 1: trabajar la recepción en R1.',
    result: '',
    plan: {
      rivalSystem: '5-1',
      keyPlayers: '#7 punta zurda: ataca la diagonal larga desde zona 4.\n#11 opuesta: saque en suspensión, el más peligroso.',
      strengths: 'Saque fuerte y bloqueo alto por zona 4.',
      weaknesses: 'Recepción de la #2 en zona 1 y defensa de la finta corta.',
      serve: 'Sacar a zona 1, a la #2, sobre todo cuando su armadora está adelante (R4, R3, R2).',
      defense: 'Bloqueo doble a la #7 cerrando la diagonal; zona 5 profunda.',
      keys: '1. Recepción alta en R1.\n2. Sacar a zona 1.\n3. Cubrir siempre a la atacante.',
      frames: [
        frame('plan', 'Su recepción en R1: sacar a zona 1', 'saque-A', [
          ...formationTokens('B', 1, 'k1-recepcion'),
          { id: id('plan-pelota'), kind: 'ball', x: -0.6, y: 7.5 },
          { id: id('plan-saque'), kind: 'arrow', style: 'ball', x1: -0.4, y1: 7.5, x2: 14.2, y2: 1.6, curve: -2 },
          { id: id('plan-texto'), kind: 'text', x: 13.5, y: 10.3, text: 'Sacar a zona 1', size: 'M', color: '#DFB97D' },
        ]),
      ],
    },
    createdAt: now,
    updatedAt: now,
  };
  // Un partido ya jugado (el sábado anterior), con estadísticas cargadas.
  const lastSaturday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (((today.getDay() + 1) % 7) || 7));
  const pastStats = demoStats(players);
  const pastMatch: Match = {
    id: id('partido-jugado'),
    squadId: squad.id,
    date: todayISO(lastSaturday),
    time: '19:00',
    opponent: 'Deportivo Muestra',
    home: false,
    venue: 'Club Deportivo Muestra',
    competition: 'Liga metropolitana',
    notes: 'Partido de ejemplo con estadísticas: abrí el partido y tocá "Estadísticas".',
    result: setsResult(replay(pastStats).sets),
    stats: pastStats,
    createdAt: now,
    updatedAt: now,
  };
  const monday = new Date(sessionDay.getFullYear(), sessionDay.getMonth(), sessionDay.getDate() - ((sessionDay.getDay() + 6) % 7));
  const week: WeekPlan = {
    id: `${todayISO(monday)}_${squad.id}`,
    weekStart: todayISO(monday),
    squadId: squad.id,
    objective: 'Recepción y K1 antes del partido del sábado',
  };

  // Temporada: pretemporada (ya hecha) y competencia (en curso).
  const day = (offset: number) => todayISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset));
  const phases: SeasonPhase[] = [
    {
      id: id('etapa-pretemporada'),
      squadId: squad.id,
      name: 'Pretemporada',
      kind: 'pretemporada',
      start: day(-63),
      end: day(-22),
      objective: 'Base física, técnica individual y recepción.',
      focus: ['fisico', 'recepcion', 'saque'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: id('etapa-competencia'),
      squadId: squad.id,
      name: 'Primera rueda',
      kind: 'competencia',
      start: day(-21),
      end: day(70),
      objective: 'Sistema 5-1 aceitado: K1 en todas las rotaciones y saque táctico.',
      focus: ['recepcion', 'ataque', 'juego'],
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    phases,
    matches: [pastMatch, match],
    weeks: [week],
    squads: [squad],
    players,
    exercises: [play, warmup, game],
    sessions: [
      session,
      past('reciente', 2, 'Defensa y contraataque', 5),
      past('anterior', 9, 'Saque y recepción', 4),
      past('primera', 16, 'Técnica de ataque', 4),
    ],
  };
}
