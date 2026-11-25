import type { CartElement, ConeElement, HoopElement, MachineElement, StepElement } from '../domain/types';

/** Objetos que en la vista inclinada se dibujan como volúmenes (con sus medidas reales, en metros). */
export type SolidElement = CartElement | StepElement | MachineElement | ConeElement | HoopElement;

export const SOLID_KINDS = new Set(['cart', 'step', 'machine', 'cone', 'hoop']);

/** Altura (m) de cada objeto, para ubicar el tachito arriba. */
export const SOLID_HEIGHT: Record<SolidElement['kind'], number> = { cart: 0.9, step: 0.45, machine: 1, cone: 0.35, hoop: 0.06 };
