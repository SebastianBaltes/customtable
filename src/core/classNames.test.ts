import classNames, { classNames as named } from './classNames';

describe('classNames utility', () => {
  test('joins strings and numbers', () => {
    expect(classNames('a', 'b', 0, 5)).toBe('a b 0 5');
  });

  test('ignores falsy values except 0', () => {
    expect(classNames('a', false, undefined, null, '', 0)).toBe('a 0');
  });

  test('handles arrays and nested arrays', () => {
    expect(classNames(['a', ['b', ['c']]], 'd')).toBe('a b c d');
  });

  test('handles objects conditionally', () => {
    expect(classNames({ foo: true, bar: false, baz: 1 }, 'x')).toBe('foo baz x');
  });

  test('named export works the same', () => {
    expect(named('a', { b: true })).toBe('a b');
  });
});

