import { describe, expect, it, vi } from 'vitest';

// Sin Firebase: solo se prueba el id corto.
vi.mock('./firebase', () => ({ db: {} }));

describe('links cortos de jugadas', () => {
  it('arma ids cortos, sin letras que se confunden y distintos cada vez', async () => {
    const { newShortId } = await import('./playLinks');
    const ids = Array.from({ length: 200 }, () => newShortId());
    expect(ids.every((id) => /^[A-HJ-NP-Za-km-z2-9]{10}$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
