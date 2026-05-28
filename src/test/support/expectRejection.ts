import { expect } from 'chai';

/**
 * Asserts that a promise rejects with an instance of the given error type and
 * returns the caught error so further assertions can be made on it. Avoids
 * chai-as-promised, which ships as ESM and cannot be loaded by the CommonJS
 * jest/ts-jest setup used here.
 */
export async function expectRejection<T extends Error>(
  promise: Promise<unknown>,
  type: new (...args: never[]) => T
): Promise<T> {
  try {
    await promise;
  } catch (error) {
    expect(error).to.be.instanceOf(type);
    return error as T;
  }
  expect.fail(`expected promise to reject with ${type.name}`);
}
