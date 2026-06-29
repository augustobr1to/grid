import { generateId, deepMerge, clamp } from '../Util';

describe('Util', () => {
  describe('generateId', () => {
    it('produces unique, prefixed ids', () => {
      const a = generateId();
      const b = generateId();
      expect(a).toMatch(/^tge_/);
      expect(a).not.toBe(b);
    });
  });

  describe('clamp', () => {
    it('clamps below, within, and above range', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('deepMerge', () => {
    it('overrides scalars and preserves untouched keys', () => {
      expect(deepMerge({ a: 1, b: 2 }, { b: 3 })).toEqual({ a: 1, b: 3 });
    });

    it('merges nested objects recursively', () => {
      const merged = deepMerge(
        { transform: { position: { x: 0, y: 0 }, scale: { x: 1 } } },
        { transform: { position: { y: 5 } } } as never,
      );
      expect(merged).toEqual({ transform: { position: { x: 0, y: 5 }, scale: { x: 1 } } });
    });

    it('replaces arrays wholesale rather than merging them', () => {
      expect(deepMerge({ tags: ['a', 'b'] }, { tags: ['c'] })).toEqual({ tags: ['c'] });
    });

    it('ignores undefined overrides but applies null', () => {
      expect(deepMerge({ a: 1, b: 2 }, { a: undefined, b: null } as never)).toEqual({ a: 1, b: null });
    });
  });
});
