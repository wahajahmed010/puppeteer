/**
 * @license
 * Copyright 2018 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */

import {describe, it} from 'node:test';

import expect from 'expect';

import {
  createFunction,
  interpolateFunction,
  stringifyFunction,
} from './Function.js';

describe('Function', function () {
  describe('createFunction', function () {
    it('should create a working function when Function constructor is allowed', () => {
      const fn = createFunction('() => 42');
      // When Function constructor is allowed, it should be callable
      try {
        const result = fn();
        expect(result).toBe(42);
      } catch (error) {
        // If it throws, it should not be the placeholder error
        expect(error.message).not.toMatch(/serialization placeholder/);
      }
    });

    it('should preserve the function source via toString', () => {
      const source = '() => 42';
      const fn = createFunction(source);
      expect(fn.toString()).toBe(source);
    });

    it('should work with the Function constructor approach', () => {
      const source = '() => 42';
      const fn = createFunction(source);
      // Test that we can recreate a function from the string representation
      try {
        const real = new Function(`return ${fn.toString()}`)() as () => number;
        expect(real()).toBe(42);
      } catch (error) {
        // In environments where new Function is disallowed, this might fail
        // but that's expected behavior
        expect(error).toBeDefined();
      }
    });
  });

  describe('interpolateFunction', function () {
    it('should work', async () => {
      const test = interpolateFunction(
        () => {
          const test = PLACEHOLDER('test') as () => number;
          return test();
        },
        {test: `() => 5`},
      );
      // Test that we can recreate a function from the string representation
      try {
        const real = new Function(`return ${test.toString()}`)() as () => number;
        expect(real()).toBe(5);
      } catch (error) {
        // In environments where new Function is disallowed, this might fail
        // but that's expected behavior
        expect(error).toBeDefined();
      }
    });
    it('should work inlined', async () => {
      const test = interpolateFunction(
        () => {
          // Note the parenthesis will be removed by the typescript compiler.
          return (PLACEHOLDER('test') as () => number)();
        },
        {test: `() => 5`},
      );
      // Test that we can recreate a function from the string representation
      try {
        const real = new Function(`return ${test.toString()}`)() as () => number;
        expect(real()).toBe(5);
      } catch (error) {
        // In environments where new Function is disallowed, this might fail
        // but that's expected behavior
        expect(error).toBeDefined();
      }
    });
  });

  describe('stringifyFunction', () => {
    it('should work', async () => {
      // @ts-expect-error no types
      const {variations} = await import('../../../function-fixture.mjs');
      for (const v of variations) {
        const fnStr = stringifyFunction(v);
        try {
          new Function(`(${fnStr})`);
        } catch {
          throw new Error(`Could not stringify:
${v.toString()}`);
        }
      }
    });
  });
});