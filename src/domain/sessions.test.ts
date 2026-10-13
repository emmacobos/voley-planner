import { describe, expect, it } from 'vitest';
import {
  blockDuration,
  defaultBlocks,
  formatDate,
  formatMinutes,
  minutesByType,
  newBlock,
  sessionDuration,
  sessionIntensity,
  todayISO,
} from './sessions';
import type { Exercise, ExerciseType, Intensity, TrainingSession } from './types';

function exercise(id: string, type: ExerciseType, intensity: Intensity): Exercise {
  return {
    id,
    name: id,
    type,
    intensity,
    objective: '',
    durationMin: 10,
    notes: '',
    squadId: null,
    playerIds: [],
    frames: [],
    createdAt: '',
    updatedAt: '',
  };
}

function session(blocks: TrainingSession['blocks']): TrainingSession {
  return {
    id: 's',
    name: 'Sesión',
    date: '2026-10-14',
    time: '',
    squadId: null,
    objective: '',
    notes: '',
    playerIds: [],
    blocks,
    createdAt: '',
    updatedAt: '',
  };
}

const lookup = new Map(
  [exercise('a', 'analitico', 'baja'), exercise('s', 'sintetico', 'alta'), exercise('g', 'global', 'alta')].map(
    (e) => [e.id, e],
  ),
);

describe('duraciones', () => {
  it('un bloque sin ejercicios usa su duración propia', () => {
    expect(blockDuration(newBlock('calentamiento', 'Calentamiento', 15))).toBe(15);
  });

  it('un bloque con ejercicios suma sus duraciones', () => {
    const b = newBlock('tecnica', 'Técnica', 99);
    b.items = [
      { id: '1', exerciseId: 'a', durationMin: 10 },
      { id: '2', exerciseId: 's', durationMin: 12 },
    ];
    expect(blockDuration(b)).toBe(22);
  });

  it('la sesión por defecto dura 90 minutos', () => {
    expect(sessionDuration(session(defaultBlocks()))).toBe(90);
  });

  it('formatea minutos', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(90)).toBe('1 h 30 min');
    expect(formatMinutes(120)).toBe('2 h');
  });
});

describe('resumen de la sesión', () => {
  const b1 = newBlock('tecnica', 'Técnica', 0);
  b1.items = [{ id: '1', exerciseId: 'a', durationMin: 30 }];
  const b2 = newBlock('juego', 'Juego', 0);
  b2.items = [
    { id: '2', exerciseId: 's', durationMin: 20 },
    { id: '3', exerciseId: 'g', durationMin: 10 },
    { id: '4', exerciseId: 'borrado', durationMin: 5 },
  ];
  const s = session([b1, b2]);

  it('reparte los minutos por tipo de ejercicio', () => {
    expect(minutesByType(s, lookup)).toEqual({ analitico: 30, sintetico: 20, global: 10 });
  });

  it('calcula la intensidad ponderada por minutos', () => {
    // (30·1 + 20·3 + 10·3) / 60 = 2 → media
    expect(sessionIntensity(s, lookup)).toBe('media');
    expect(sessionIntensity(session([b2]), lookup)).toBe('alta');
    expect(sessionIntensity(session(defaultBlocks()), lookup)).toBeNull();
  });

  it('todayISO usa la fecha local', () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('formatDate', () => {
  it('pone en mayúscula solo la primera letra', () => {
    const text = formatDate('2026-10-14');
    expect(text.charAt(0)).toBe(text.charAt(0).toUpperCase());
    expect(text).toMatch(/14 de octubre de 2026/);
  });
});
