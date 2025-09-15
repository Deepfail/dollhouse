import { describe, expect, it } from 'vitest';

// Must not depend on legacy web storage.
describe('legacy storage removed', () => {
  it('no local/sessionStorage references', async () => {
    const files = await import.meta.glob('../**/*.{ts,tsx}', { as: 'raw' });
    for (const load of Object.values(files)) {
      const src = await (load as any)();
      expect(src).not.toMatch(/\blocalStorage\b/);
      expect(src).not.toMatch(/\bsessionStorage\b/);
    }
  });
});

// Minimal storage surface must exist for characters.
describe('characters repository shape', () => {
  it('has basic CRUD functions', async () => {
    const mod = await import('../repo/characters');
    const fns = ['listCharacters','createCharacter','updateCharacter','deleteCharacter'];
    fns.forEach(fn => expect(typeof (mod as any)[fn]).toBe('function'));
  });
});
