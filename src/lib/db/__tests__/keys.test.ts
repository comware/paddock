import { describe, it, expect } from 'vitest';
import { toKey, toId, withId } from '../keys';

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

describe('withId', () => {
  it('stringifies a numeric id', () => {
    expect(withId({ id: 42, name: 'Bed 3' })).toEqual({ id: '42', name: 'Bed 3' });
  });

  it('leaves a string id alone', () => {
    expect(withId({ id: '42', name: 'Bed 3' })).toEqual({ id: '42', name: 'Bed 3' });
  });

  it('does not mutate the row it was given', () => {
    const row = { id: 42, name: 'Bed 3' };
    withId(row);
    expect(row.id).toBe(42);
  });

  it('throws on a row with no id rather than producing "undefined"', () => {
    // A row without an id has not come from Dexie. Silently making it the string
    // "undefined" would give it an id that matches nothing - the same silence again.
    expect(() => withId({ name: 'Bed 3' } as { id?: number; name: string })).toThrow(/no id/);
  });
});
