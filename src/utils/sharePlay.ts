import type { Frame, Player, TeamNames } from '../domain/types';

/**
 * Jugada compartida por link: viaja comprimida dentro del propio link (después
 * de `#/ver/`), así se abre sin cuenta y sin guardar nada en la nube.
 */
export interface SharedPlay {
  v: 1;
  title: string;
  frames: Frame[];
  /** Solo las jugadoras que aparecen en la jugada (para mostrar sus nombres). */
  players: Pick<Player, 'id' | 'name' | 'number' | 'position'>[];
  teamNames?: TeamNames;
}

const toBase64Url = (bytes: Uint8Array) => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (text: string) => {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** Arma lo que se comparte: los pasos y los datos de las jugadoras que aparecen. */
export function sharedPlayData(title: string, frames: Frame[], players: Player[], teamNames?: TeamNames): SharedPlay {
  const used = new Set(frames.flatMap((f) => f.elements.flatMap((e) => (e.kind === 'player' && e.playerId ? [e.playerId] : []))));
  return {
    v: 1,
    title,
    frames,
    players: players.filter((p) => used.has(p.id)).map(({ id, name, number, position }) => ({ id, name, number, position })),
    ...(teamNames?.A || teamNames?.B ? { teamNames } : {}),
  };
}

export async function encodePlay(play: SharedPlay): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(play));
  return toBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
}

export async function decodePlay(code: string): Promise<SharedPlay> {
  const json = await pipe(fromBase64Url(code), new DecompressionStream('deflate-raw'));
  const play = JSON.parse(new TextDecoder().decode(json)) as SharedPlay;
  if (play.v !== 1 || !Array.isArray(play.frames) || !play.frames.length) throw new Error('Link inválido');
  return play;
}

/** Link completo para abrir la jugada (en la misma dirección donde está la app). */
export function sharedPlayUrl(code: string): string {
  return `${window.location.origin}${window.location.pathname}#/ver/${code}`;
}
