import { formationTokens } from './formations';
import type { Phase } from './formations';
import type {
  ArrowElement,
  BoardElement,
  Exercise,
  ExerciseType,
  Frame,
  GameSystem,
  Intensity,
  PlayerToken,
  Situation,
  Team,
  Zone,
} from './types';

/** Ejercicio modelo: todo lo de un ejercicio menos lo propio de cada usuario. */
export type LibraryExercise = Pick<
  Exercise,
  'name' | 'type' | 'objective' | 'durationMin' | 'intensity' | 'notes' | 'frames' | 'system'
> & { key: string };

/** Arma los elementos de un ejercicio con ids únicos dentro de él. */
function builder() {
  let n = 0;
  const id = (prefix: string) => `${prefix}-${++n}`;
  return {
    player: (team: Team, label: string, x: number, y: number, extra: Partial<PlayerToken> = {}): BoardElement => ({
      id: id('j'),
      kind: 'player',
      team,
      label,
      x,
      y,
      ...extra,
    }),
    ball: (x: number, y: number): BoardElement => ({ id: id('pelota'), kind: 'ball', x, y }),
    cone: (x: number, y: number): BoardElement => ({ id: id('cono'), kind: 'cone', x, y }),
    coach: (x: number, y: number): BoardElement => ({ id: id('ent'), kind: 'coach', x, y }),
    cart: (x: number, y: number): BoardElement => ({ id: id('carro'), kind: 'cart', x, y }),
    arrow: (style: ArrowElement['style'], x1: number, y1: number, x2: number, y2: number, curve?: number): BoardElement => ({
      id: id('flecha'),
      kind: 'arrow',
      style,
      x1,
      y1,
      x2,
      y2,
      curve,
    }),
    text: (x: number, y: number, text: string, color = '#FFFFFF'): BoardElement => ({
      id: id('texto'),
      kind: 'text',
      x,
      y,
      text,
      size: 'M',
      color,
    }),
    shadow: (x1: number, y1: number, x2: number, y2: number): BoardElement => ({
      id: id('sombra'),
      kind: 'shadow',
      x1,
      y1,
      x2,
      y2,
      startWidth: 1.4,
      endWidth: 3.4,
    }),
  };
}

let frameCount = 0;
const frame = (note: string, elements: BoardElement[], situation: Situation = 'juego'): Frame => ({
  id: `paso-${++frameCount}`,
  note,
  situation,
  elements,
});

const notes = (organizacion: string, consignas: string[], variantes: string[]) =>
  [`Organización: ${organizacion}`, '', 'Consignas:', ...consignas.map((c) => `• ${c}`), '', 'Variantes:', ...variantes.map((v) => `• ${v}`)].join('\n');

function exercise(
  key: string,
  name: string,
  type: ExerciseType,
  durationMin: number,
  intensity: Intensity,
  objective: string,
  text: string,
  frames: Frame[],
  system?: GameSystem,
): LibraryExercise {
  return { key, name, type, durationMin, intensity, objective, notes: text, frames, ...(system ? { system } : {}) };
}

/** Fichas de un equipo en una formación (para los sintéticos y globales). */
const team = (t: Team, rotation: Zone, phase: Phase, system: GameSystem = '5-1') =>
  formationTokens(t, rotation, phase, { system });

function pairsPassing(): LibraryExercise {
  const b = builder();
  const rows = [1.5, 4.5, 7.5];
  return exercise(
    'parejas-dedos',
    'Toque de dedos en parejas con desplazamiento',
    'analitico',
    10,
    'baja',
    'Afinar el toque de dedos con desplazamiento previo y llegada debajo de la pelota.',
    notes(
      'Parejas enfrentadas a 5–6 m, una pelota por pareja.',
      ['Llegar antes que la pelota y frenar el desplazamiento.', 'Frente a la dirección del pase.', 'Pase alto y al centro del compañero.'],
      ['Tocar el cono lateral entre pase y pase.', 'Alternar dedos y antebrazos.', 'Un pase de control propio antes de devolver.'],
    ),
    [
      frame('Pase alto al compañero', [
        ...rows.flatMap((y, i) => [
          b.player('A', String(i * 2 + 1), 3, y),
          b.player('A', String(i * 2 + 2), 8, y),
          b.ball(3.6, y),
          b.arrow('ball', 3.6, y, 7.4, y, -1.2),
          b.cone(3, y + 1.2),
        ]),
      ]),
      frame('Desplazamiento al cono y vuelta', [
        ...rows.flatMap((y, i) => [
          b.player('A', String(i * 2 + 1), 3, y + 1),
          b.player('A', String(i * 2 + 2), 8, y),
          b.ball(7.4, y),
          b.arrow('move', 3, y + 1, 3, y + 0.1),
          b.cone(3, y + 1.2),
        ]),
      ]),
    ],
  );
}

function receptionTriads(): LibraryExercise {
  const b = builder();
  return exercise(
    'recepcion-trios',
    'Recepción en tríos: sacador, receptora y armadora',
    'analitico',
    15,
    'media',
    'Recepción de saque real con un objetivo claro (la armadora en zona 2-3).',
    notes(
      'Tríos: una saca desde el fondo rival, otra recibe en zona 1, 6 o 5 y la tercera espera como armadora.',
      ['Plataforma estable y orientada al objetivo antes del contacto.', 'Leer la trayectoria desde la mano del sacador.', 'Rotan cada 10 recepciones.'],
      ['Contar recepciones perfectas (#) sobre 10.', 'Saque flotado y en suspensión.', 'Dos receptoras que deben comunicarse quién toma la pelota.'],
    ),
    [
      frame('Saque a la receptora', [
        b.player('B', 'S', 19.2, 6.5),
        b.ball(18.8, 6.9),
        b.player('A', 'R', 3.5, 4.5),
        b.player('A', 'A', 8.2, 6.2, { role: 'armador' }),
        b.arrow('ball', 18.8, 6.9, 3.9, 4.5, 2.4),
        b.cone(8, 6.8),
      ], 'saque-B'),
      frame('Recepción al objetivo', [
        b.player('B', 'S', 19.2, 6.5),
        b.ball(8, 6.3),
        b.player('A', 'R', 3.5, 4.5),
        b.player('A', 'A', 8.2, 6.2, { role: 'armador' }),
        b.cone(8, 6.8),
      ]),
    ],
  );
}

function serveTargets(): LibraryExercise {
  const b = builder();
  return exercise(
    'saque-zonas',
    'Saque a zonas con conos',
    'analitico',
    15,
    'media',
    'Precisión del saque a zonas débiles de la recepción rival.',
    notes(
      'Dos filas de sacadoras detrás de la línea de fondo; conos en zonas 1, 6 y 5 del otro lado.',
      ['Rutina previa al saque siempre igual.', 'Elegir la zona antes de lanzar la pelota.', 'Punto por cono tocado.'],
      ['El entrenador canta la zona mientras la pelota está en el aire.', 'Saque corto a zona 2-3.', 'Competencia por equipos a 15 puntos.'],
    ),
    [
      frame('Saque a la zona elegida', [
        b.player('A', '1', -1.2, 7.5),
        b.player('A', '2', -1.2, 1.5),
        b.cart(-2.2, 4.5),
        b.ball(-0.7, 7.5),
        b.cone(16, 7.5),
        b.cone(16, 4.5),
        b.cone(16, 1.5),
        b.arrow('ball', -0.7, 7.5, 15.6, 4.5, -2),
        b.text(13.5, 10.3, 'Zonas 1 · 6 · 5'),
      ]),
    ],
  );
}

function attackZone4(): LibraryExercise {
  const b = builder();
  return exercise(
    'ataque-zona-4',
    'Ataque por zona 4 con armadora',
    'analitico',
    15,
    'alta',
    'Carrera de ataque, sincronización con la armadora y golpe cruzado y paralelo.',
    notes(
      'Fila de atacantes en zona 4, armadora en zona 2-3 y un pasador con carrito en zona 6 que lanza a la armadora.',
      ['Carrera de 3 pasos; último paso largo y frenado con los dos pies.', 'Brazo armado alto, golpe arriba y adelante.', 'Alternar cruzado y paralelo según la consigna.'],
      ['Con bloqueo simple del otro lado.', 'Pelota rápida (bola 1) y alta.', 'Ataque desde zona 2 con el opuesto.'],
    ),
    [
      frame('Pase a la armadora', [
        b.player('A', 'At', 4, 0.9),
        b.player('A', 'At', 4.6, -0.3),
        b.player('A', 'Ar', 8.3, 6, { role: 'armador' }),
        b.coach(3, 4.5),
        b.cart(2.2, 5.3),
        b.ball(3.5, 4.5),
        b.arrow('ball', 3.5, 4.5, 8, 6, -1),
        b.arrow('move', 4, 0.9, 6.2, 1.4, 0.6),
      ]),
      frame('Armado y ataque', [
        b.player('A', 'At', 7.6, 1.4),
        b.player('A', 'At', 4.6, -0.3),
        b.player('A', 'Ar', 8.3, 6, { role: 'armador' }),
        b.coach(3, 4.5),
        b.cart(2.2, 5.3),
        b.ball(8, 6),
        b.arrow('ball', 8, 5.8, 8, 1.6, 1.6),
        b.arrow('ball', 8.2, 1.4, 15.5, 7.6),
      ]),
    ],
  );
}

function blockFootwork(): LibraryExercise {
  const b = builder();
  return exercise(
    'bloqueo-desplazamiento',
    'Bloqueo: desplazamiento lateral y cierre',
    'analitico',
    10,
    'media',
    'Desplazamiento de bloqueo (paso cruzado) y cierre del doble con la central.',
    notes(
      'Tres bloqueadoras en la red; el entrenador del otro lado señala la zona de ataque.',
      ['Manos arriba antes de saltar; penetrar sobre la red.', 'La central cierra contra la punta, sin dejar hueco.', 'Caer en el lugar y volver a la base.'],
      ['Con atacante real del otro lado.', 'Lectura de la armadora rival (bloqueo de lectura).'],
    ),
    [
      frame('Posición base', [
        b.player('A', 'P', 8.5, 1.5),
        b.player('A', 'C', 8.5, 4.5),
        b.player('A', 'O', 8.5, 7.5),
        b.coach(11, 1.5),
      ]),
      frame('Cierre del doble en zona 4 rival', [
        b.player('A', 'P', 8.5, 7.6),
        b.player('A', 'C', 8.5, 6.8),
        b.player('A', 'O', 8.5, 1.5),
        b.coach(11, 8),
        b.shadow(8.8, 7.2, 3.5, 6),
      ]),
    ],
  );
}

function defenseCoachBox(): LibraryExercise {
  const b = builder();
  return exercise(
    'defensa-cajon',
    'Defensa en zonas 5, 6 y 1 con ataque desde el cajón',
    'analitico',
    15,
    'alta',
    'Postura defensiva, lectura del brazo del atacante y defensa alta al centro.',
    notes(
      'El entrenador ataca desde un cajón en zona 4 del otro lado; tres defensoras en 5, 6 y 1 y una armadora objetivo.',
      ['Peso adelante, pies activos al momento del golpe.', 'Pelota defendida alta y al centro de la cancha.', 'Comunicar "mía" antes del contacto.'],
      ['Con bloqueo simple que tapa la paralela.', 'Pelotas tocadas (finta) a zona 4.', 'Series de 6 defensas por jugadora.'],
    ),
    [
      frame('Ataque del entrenador', [
        b.coach(10.2, 1.5),
        b.ball(9.8, 1.6),
        b.player('A', 'D', 2, 1.2),
        b.player('A', 'D', 1.5, 4.5),
        b.player('A', 'D', 2.5, 7.8),
        b.player('A', 'Ar', 8, 6, { role: 'armador' }),
        b.arrow('ball', 9.8, 1.6, 2.2, 4.5),
      ]),
      frame('Defensa al centro', [
        b.coach(10.2, 1.5),
        b.ball(6, 4.5),
        b.player('A', 'D', 2, 1.2),
        b.player('A', 'D', 1.8, 4.5),
        b.player('A', 'D', 2.5, 7.8),
        b.player('A', 'Ar', 7, 5, { role: 'armador' }),
      ]),
    ],
  );
}

function k1Rotation1(): LibraryExercise {
  const recibe = team('A', 1, 'k1-recepcion');
  const ataca = team('A', 1, 'k1-ataque');
  const saca = team('B', 1, 'k2-saque');
  return exercise(
    'k1-r1',
    'K1 en R1: recepción, armado y ataque',
    'sintetico',
    20,
    'media',
    'Construir el K1 con la armadora penetrando desde zona 1.',
    notes(
      'Equipo A en recepción de R1 (5-1); el equipo B saca. El punto termina con el ataque de A.',
      ['La armadora sale al contacto del saque, no antes.', 'Recepción a 1 m de la red, entre zona 2 y 3.', 'Los atacantes abren y llegan a tiempo.'],
      ['Repetir en las 6 rotaciones.', 'El equipo B defiende y contraataca (pasa a juego libre).', 'Puntaje: 2 puntos por K1 ganado en el primer ataque.'],
    ),
    [
      frame('Saque rival y recepción', [...recibe, ...saca], 'saque-B'),
      frame('Armado y ataque', [...ataca, ...team('B', 1, 'defensa-perimetral')]),
    ],
    '5-1',
  );
}

function k1AllRotations(): LibraryExercise {
  const zones: Zone[] = [1, 6, 5, 4, 3, 2];
  return exercise(
    'k1-rotaciones',
    'Recepción K1 en las 6 rotaciones',
    'sintetico',
    30,
    'media',
    'Automatizar las 6 formaciones de recepción del 5-1 sin faltas de posición.',
    notes(
      'Equipo A recibe en cada rotación; el entrenador o el equipo B saca. Se rota después de 3 recepciones buenas.',
      ['Ubicarse sin faltas de posición al momento del saque.', 'Saber quién recibe y quién se esconde en cada rotación.', 'Transición rápida al ataque.'],
      ['Con 4-2 o 6-0 para categorías formativas (cambiar el sistema del ejercicio).', 'Cronometrar cuánto tarda el equipo en formar.'],
    ),
    zones.map((r) => frame(`Recepción en R${r}`, [...team('A', r, 'k1-recepcion'), ...team('B', r, 'k2-saque')], 'saque-B')),
    '5-1',
  );
}

function blockDefenseZone4(): LibraryExercise {
  const b = builder();
  const defensa = team('A', 1, 'defensa-perimetral');
  return exercise(
    'bloqueo-defensa',
    'Bloqueo y defensa contra ataque por zona 4',
    'sintetico',
    20,
    'alta',
    'Coordinar el bloqueo doble con la defensa perimetral fuera de la sombra del bloqueo.',
    notes(
      'Equipo A en defensa perimetral; el equipo B ataca por su zona 4 (a nuestra derecha).',
      ['El bloqueo cierra la diagonal; la defensa se ubica fuera de la sombra.', 'La zona 1 defiende la paralela, la 6 al fondo, la 5 la diagonal larga.', 'El jugador de zona 4 cubre la finta.'],
      ['Ataque por zona 2 rival (espejo).', 'Con armado rápido por el medio.'],
    ),
    [
      frame('Bloqueo doble y defensa', [
        ...defensa,
        b.player('B', 'At', 10.6, 8),
        b.ball(10, 7.8),
        b.shadow(8.8, 7.3, 2.5, 5.8),
        b.arrow('ball', 10, 7.8, 1.5, 1.5),
      ]),
    ],
    '5-1',
  );
}

function transition(): LibraryExercise {
  return exercise(
    'transicion-k2',
    'Transición defensa – contraataque (K2)',
    'sintetico',
    20,
    'alta',
    'Pasar de defender a atacar: armado tras defensa y carrera de los atacantes.',
    notes(
      'El entrenador ataca desde el otro lado; el equipo A defiende en perimetral y contraataca.',
      ['Después de defender, los atacantes abren rápido para la carrera.', 'La armadora va a la posición de armado; si defiende ella, arma la líbero u opuesto.', 'Atacar a la zona libre del rival.'],
      ['Pelota libre (free ball) después de cada defensa.', 'Contar contraataques convertidos sobre 10.'],
    ),
    [
      frame('Defensa', team('A', 3, 'defensa-perimetral')),
      frame('Contraataque', team('A', 3, 'k1-ataque')),
    ],
    '5-1',
  );
}

function game6v6(): LibraryExercise {
  return exercise(
    'juego-6v6',
    'Juego 6 vs 6 con saque',
    'global',
    20,
    'alta',
    'Aplicar lo trabajado en situación real de juego.',
    notes(
      'Dos equipos completos; se juega a 25 o por tiempo. Cada punto empieza con saque.',
      ['Respetar las formaciones del sistema.', 'Comunicación en cada pelota.', 'El entrenador corta para corregir solo lo del objetivo del día.'],
      ['Empezar cada set 15-15 para entrenar finales.', 'Saque obligatorio a una zona.'],
    ),
    [frame('Formación base', [...team('A', 1, 'base'), ...team('B', 1, 'base')], 'saque-B')],
    '5-1',
  );
}

function washDrill(): LibraryExercise {
  return exercise(
    'wash-drill',
    'Doble punto (wash drill)',
    'global',
    25,
    'alta',
    'Ganar el K1 y también la pelota siguiente: premia la continuidad.',
    notes(
      'Seis contra seis. El entrenador saca al equipo A y enseguida lanza una pelota libre al equipo B.',
      ['Un equipo suma un "gran punto" solo si gana las dos pelotas.', 'Si gana una cada uno, es "lavado" (wash) y no suma nadie.', 'Se juega a 5 grandes puntos y rota.'],
      ['La segunda pelota es de saque en vez de libre.', 'Tres pelotas seguidas (triple punto).'],
    ),
    [frame('Saque al equipo A', [...team('A', 1, 'k1-recepcion'), ...team('B', 1, 'k2-saque')], 'saque-B')],
    '5-1',
  );
}

function smallSided(): LibraryExercise {
  const b = builder();
  return exercise(
    'reducido-4v4',
    'Juego reducido 4 vs 4 en cancha corta',
    'global',
    15,
    'alta',
    'Muchos contactos por jugadora y lectura del juego en espacio reducido.',
    notes(
      'Cancha de 6 × 9 por lado (se excluye la zona 1-5 del fondo con conos). Equipos de 4.',
      ['Tres toques obligatorios.', 'Rotar posición en cada saque ganado.', 'Ataque solo desde atrás de la línea de 3 m para las zagueras.'],
      ['3 vs 3 en cancha de 4,5 m.', 'Solo vale el punto de ataque.'],
    ),
    [
      frame('Cuatro contra cuatro', [
        b.player('A', '1', 6.5, 2),
        b.player('A', '2', 6.5, 7),
        b.player('A', '3', 4, 3),
        b.player('A', '4', 4, 6),
        b.player('B', '1', 11.5, 2),
        b.player('B', '2', 11.5, 7),
        b.player('B', '3', 14, 3),
        b.player('B', '4', 14, 6),
        b.cone(3, 0),
        b.cone(3, 9),
        b.cone(15, 0),
        b.cone(15, 9),
        b.ball(14, 6.6),
      ]),
    ],
  );
}

function kingOfCourt(): LibraryExercise {
  const b = builder();
  return exercise(
    'rey-cancha',
    'Rey de la cancha 3 vs 3',
    'global',
    15,
    'alta',
    'Competencia e intensidad: el equipo que gana se queda del lado de los reyes.',
    notes(
      'Lado A: "reyes". Del lado B entran tríos que esperan en fila. El entrenador lanza la pelota al equipo retador.',
      ['Solo los reyes suman puntos.', 'Si el retador gana el rally, pasa al lado de los reyes.', 'Gana el trío con más puntos al terminar el tiempo.'],
      ['Saque en vez de pelota lanzada.', 'Dos pelotas seguidas para sumar.'],
    ),
    [
      frame('Retadoras contra reinas', [
        b.player('A', 'R', 5, 2),
        b.player('A', 'R', 5, 7),
        b.player('A', 'R', 3, 4.5),
        b.player('B', 'D', 13, 2),
        b.player('B', 'D', 13, 7),
        b.player('B', 'D', 15, 4.5),
        b.player('B', 'E', 19.5, 1),
        b.player('B', 'E', 20.4, 1),
        b.player('B', 'E', 19.5, 1.9),
        b.coach(18.8, 7.5),
        b.ball(18.3, 7.3),
        b.arrow('ball', 18.3, 7.3, 13.4, 4.5, -1),
        b.text(4.5, 10.3, 'Reinas'),
        b.text(13.5, 10.3, 'Retadoras'),
      ]),
    ],
  );
}

function k2OnlyGame(): LibraryExercise {
  return exercise(
    'juego-k2',
    'Juego donde solo vale el contraataque',
    'global',
    20,
    'alta',
    'Valorar la defensa y la transición: el punto de K1 no suma.',
    notes(
      'Seis contra seis con saque. Solo suman los puntos ganados después de la primera transición (K2).',
      ['Defender con intención de contraatacar.', 'Cobertura del propio ataque en cada K1.', 'Paciencia: pelota segura antes que error.'],
      ['El K1 ganado vale 1 y el K2 vale 2.', 'Bloqueo punto vale doble.'],
    ),
    [
      frame('Defensa perimetral de los dos lados', [...team('A', 1, 'defensa-perimetral'), ...team('B', 4, 'k1-ataque')]),
    ],
    '5-1',
  );
}

function coverAttacker(): LibraryExercise {
  const b = builder();
  const ataca = team('A', 1, 'k1-ataque');
  return exercise(
    'cobertura',
    'Cobertura del atacante',
    'sintetico',
    15,
    'media',
    'Proteger el ataque propio cuando el bloqueo rival devuelve la pelota.',
    notes(
      'Equipo A ataca por zona 4 contra un bloqueo doble (sobre cajones o real). El resto del equipo cubre.',
      ['Cobertura en dos anillos: cerca del atacante (3) y atrás (2).', 'Postura baja, brazos listos.', 'Continuar la jugada después de la cobertura.'],
      ['Ataque por zona 2 y por el centro.', 'El bloqueo rival busca bloquear siempre (pelotas fáciles de cubrir).'],
    ),
    [
      frame('Ataque y cobertura', [
        ...ataca,
        b.ball(8.4, 1.2),
        b.shadow(9.2, 1.2, 6, 1.6),
        b.text(4.5, 10.3, 'Cubrir al atacante', '#F5B82E'),
      ]),
    ],
    '5-1',
  );
}

/** Catálogo de ejercicios modelo, listos para copiar y adaptar. */
export const LIBRARY: LibraryExercise[] = [
  pairsPassing(),
  receptionTriads(),
  serveTargets(),
  attackZone4(),
  blockFootwork(),
  defenseCoachBox(),
  k1Rotation1(),
  k1AllRotations(),
  blockDefenseZone4(),
  transition(),
  coverAttacker(),
  game6v6(),
  washDrill(),
  smallSided(),
  kingOfCourt(),
  k2OnlyGame(),
];
