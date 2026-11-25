import { describe, expect, it } from 'vitest';
import { buildDemoData } from '../domain/demo';
import { decodePlay, encodePlay, sharedPlayData } from './sharePlay';

describe('compartir una jugada por link', () => {
  const demo = buildDemoData(new Date(2026, 9, 14));
  const play = demo.exercises[0];

  it('ida y vuelta: el link trae la misma jugada', async () => {
    const data = sharedPlayData(play.name, play.frames, demo.players);
    const code = await encodePlay(data);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decodePlay(code)).toEqual(data);
  });

  it('solo lleva las jugadoras que aparecen y queda corto', async () => {
    const data = sharedPlayData(play.name, play.frames, demo.players);
    expect(data.players.length).toBeLessThan(demo.players.length);
    expect(data.players[0]).not.toHaveProperty('squadId');
    const code = await encodePlay(data);
    expect(code.length).toBeLessThan(JSON.stringify(data).length);
  });

  it('lleva la vista inclinada con la que se armó, si la había', async () => {
    const flat = sharedPlayData(play.name, play.frames, demo.players);
    expect(flat).not.toHaveProperty('view');
    const tilted = sharedPlayData(play.name, play.frames, demo.players, undefined, false, undefined, { tilt: 40, turn: 40 });
    expect((await decodePlay(await encodePlay(tilted))).view).toEqual({ tilt: 40, turn: 40 });
  });

  it('un link roto da error', async () => {
    await expect(decodePlay('esto-no-es-una-jugada')).rejects.toThrow();
  });
});
