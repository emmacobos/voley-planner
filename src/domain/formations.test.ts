import { describe, expect, it } from 'vitest';
import { distanceToNet } from './court';
import { PHASES, formationTokens, phaseSituation } from './formations';
import { checkRotation } from './rotationRules';
import { assignLineup, assignLineup42, assignLineup60, roleTokenId } from './rotations';
import type { Player, PlayerToken, Team, Zone } from './types';

const ZONES: Zone[] = [1, 2, 3, 4, 5, 6];
const TEAMS: Team[] = ['A', 'B'];

const roster: Player[] = [
  { id: 's', squadId: 'q', name: 'Armadora', number: 1, position: 'armador' },
  { id: 'o', squadId: 'q', name: 'Opuesta', number: 2, position: 'opuesto' },
  { id: 'p1', squadId: 'q', name: 'Punta 1', number: 3, position: 'punta' },
  { id: 'p2', squadId: 'q', name: 'Punta 2', number: 4, position: 'punta' },
  { id: 'c1', squadId: 'q', name: 'Central 1', number: 5, position: 'central' },
  { id: 'c2', squadId: 'q', name: 'Central 2', number: 6, position: 'central' },
  { id: 'l', squadId: 'q', name: 'Líbero', number: 7, position: 'libero' },
];

const has = (tokens: PlayerToken[], role: PlayerToken['role']) =>
  tokens.filter((t) => t.role === role).length;

describe('formationTokens', () => {
  for (const team of TEAMS) {
    for (const rot of ZONES) {
      it(`K1 recepción R${rot} respeta las reglas de posición (equipo ${team})`, () => {
        const tokens = formationTokens(team, rot, 'k1-recepcion');
        const check = checkRotation(tokens, team);
        expect(check.applicable).toBe(true);
        expect(check.faults).toEqual([]);
      });
    }
  }

  it('todas las formaciones tienen 6 jugadores dentro de la vista', () => {
    for (const { value } of PHASES) {
      for (const rot of ZONES) {
        const tokens = formationTokens('A', rot, value);
        expect(tokens).toHaveLength(6);
        expect(new Set(tokens.map((t) => t.zone)).size).toBe(6);
        for (const t of tokens) {
          expect(t.x).toBeGreaterThanOrEqual(-3);
          expect(t.x).toBeLessThanOrEqual(9);
        }
      }
    }
  });

  it('en zonas base no entra el líbero', () => {
    const tokens = formationTokens('A', 1, 'base');
    expect(has(tokens, 'libero')).toBe(0);
    expect(has(tokens, 'central')).toBe(2);
  });

  it('en recepción el líbero reemplaza al central zaguero', () => {
    for (const rot of ZONES) {
      const tokens = formationTokens('A', rot, 'k1-recepcion');
      expect(has(tokens, 'libero')).toBe(1);
      expect(has(tokens, 'central')).toBe(1);
      const mb = tokens.find((t) => t.role === 'central')!;
      expect([2, 3, 4]).toContain(mb.zone);
    }
  });

  it('si saca el central, el líbero no entra y el sacador está detrás de la línea de fondo', () => {
    // R5: el central 2 (MB2) está en zona 1.
    const tokens = formationTokens('A', 5, 'k2-saque');
    expect(has(tokens, 'libero')).toBe(0);
    const server = tokens.find((t) => t.zone === 1)!;
    expect(server.id).toBe(roleTokenId('A', 'MB2'));
    expect(distanceToNet('A', server.x)).toBeGreaterThan(9);
  });

  it('en defensa el bloqueo doble va hacia el lado del ataque rival', () => {
    const z4 = formationTokens('A', 1, 'defensa-perimetral', { attackSide: 'zona4' });
    const z2 = formationTokens('A', 1, 'defensa-perimetral', { attackSide: 'zona2' });
    const blockers = (ts: PlayerToken[]) => ts.filter((t) => distanceToNet('A', t.x) < 1);
    // Equipo A: la izquierda es y chico. Ataque por zona 4 rival => bloqueo a nuestra derecha (y grande).
    expect(blockers(z4).every((t) => t.y > 4.5)).toBe(true);
    expect(blockers(z2).every((t) => t.y < 4.5)).toBe(true);
    expect(blockers(z4)).toHaveLength(2);
  });

  it('usa los jugadores del plantel según su posición', () => {
    const tokens = formationTokens('A', 1, 'k1-recepcion', { lineup: assignLineup(roster) });
    const libero = tokens.find((t) => t.role === 'libero')!;
    expect(libero.playerId).toBe('l');
    expect(libero.label).toBe('7');
  });
});

describe('phaseSituation', () => {
  it('recepción implica saque del rival y K2 saque propio', () => {
    expect(phaseSituation('k1-recepcion', 'A')).toBe('saque-B');
    expect(phaseSituation('k2-saque', 'A')).toBe('saque-A');
    expect(phaseSituation('defensa-adelante', 'B')).toBe('juego');
  });
});

describe('sistemas 4-2 y 6-0', () => {
  const front = (t: PlayerToken) => [2, 3, 4].includes(t.zone!);

  for (const team of TEAMS) {
    for (const rot of ZONES) {
      it(`4-2 recepción R${rot} respeta las reglas y arma el armador de adelante (equipo ${team})`, () => {
        const tokens = formationTokens(team, rot, 'k1-recepcion', { system: '4-2' });
        expect(checkRotation(tokens, team).faults).toEqual([]);
        const setters = tokens.filter((t) => t.role === 'armador');
        expect(setters).toHaveLength(2);
        expect(setters.filter(front)).toHaveLength(1);
        // El armador de adelante está pegado a la red.
        expect(distanceToNet(team, setters.find(front)!.x)).toBeLessThan(1.5);
        expect(has(tokens, 'libero')).toBe(1);
      });

      for (const setterZone of [2, 3] as const) {
        it(`6-0 recepción en W R${rot} con armador en zona ${setterZone} (equipo ${team})`, () => {
          const tokens = formationTokens(team, rot, 'k1-recepcion', { system: '6-0', setterZone });
          expect(checkRotation(tokens, team).faults).toEqual([]);
          const setter = tokens.filter((t) => t.role === 'armador');
          expect(setter).toHaveLength(1);
          expect(setter[0].zone).toBe(setterZone);
          expect(has(tokens, 'libero')).toBe(0);
        });
      }
    }
  }

  it('todas las formaciones de cada sistema tienen 6 jugadores dentro de la vista', () => {
    for (const system of ['4-2', '6-0'] as const) {
      for (const { value } of PHASES) {
        for (const rot of ZONES) {
          const tokens = formationTokens('A', rot, value, { system });
          expect(tokens).toHaveLength(6);
          expect(new Set(tokens.map((t) => t.zone)).size).toBe(6);
          for (const t of tokens) {
            expect(t.x).toBeGreaterThanOrEqual(-3);
            expect(t.x).toBeLessThanOrEqual(9);
          }
        }
      }
    }
  });

  it('en el 4-2 los ids siguen a cada armador al rotar', () => {
    // R1: el armador 1 está en zona 1 (atrás), así que arma el armador 2 desde zona 4.
    const tokens = formationTokens('A', 1, 'k1-ataque', { system: '4-2' });
    const s2 = tokens.find((t) => t.id === roleTokenId('A', 'S2'))!;
    expect(s2.zone).toBe(4);
    expect(s2.label).toBe('A2');
    expect(distanceToNet('A', s2.x)).toBeLessThan(1);
  });

  it('el 4-2 usa dos armadores del plantel y el 6-0 a los seis primeros sin líbero', () => {
    const roster42 = [...roster, { id: 's2', squadId: 'q', name: 'Armadora 2', number: 8, position: 'armador' as const }];
    const t42 = formationTokens('A', 2, 'base', { system: '4-2', lineup: assignLineup42(roster42) });
    expect(t42.find((t) => t.id === 'A-S1')!.playerId).toBe('s');
    expect(t42.find((t) => t.id === 'A-S2')!.playerId).toBe('s2');
    const lineup60 = assignLineup60(roster);
    expect(Object.values(lineup60).map((p) => p!.id)).not.toContain('l');
    const t60 = formationTokens('A', 1, 'base', { system: '6-0', lineup: lineup60 });
    expect(t60.find((t) => t.id === 'A-J1')!.label).toBe('1');
  });
});
