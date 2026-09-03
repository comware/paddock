import { describe, it, expect } from 'vitest';
import { toKey, toId } from '../keys';

describe('toKey', () => {
  it('converts a string id to a numeric key', () => {
    expect(toKey('42')).toBe(42);
  });

  it('passes a number through', () => {
    expect(toKey(42)).toBe(42);
  });

  // Each of these would otherwise reach Dexie and match nothing, silently.
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty string', ''],
    ['non-numeric', 'abc'],
    ['a uuid', 'a3f9c1e2'],
    ['a float', 1.5],
    ['NaN', NaN],
  ])('throws on %s rather than passing a bad key down', (_label, input) => {
    expect(() => toKey(input as string | number | undefined | null)).toThrow(/Not a database key/);
  });
});

describe('toId', () => {
  it('converts a numeric key to a string id', () => {
    expect(toId(42)).toBe('42');
  });

  it('is idempotent on a string', () => {
    expect(toId('42')).toBe('42');
  });
});
