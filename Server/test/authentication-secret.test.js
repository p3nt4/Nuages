const assert = require('assert');
const {
  PLACEHOLDER_SECRET,
  resolveAuthenticationSecret
} = require('../src/authentication-secret');

describe('authentication secret configuration', () => {
  it('prefers an environment-provided secret', () => {
    assert.strictEqual(
      resolveAuthenticationSecret(PLACEHOLDER_SECRET, { NUAGES_AUTH_SECRET: 'environment-secret' }),
      'environment-secret'
    );
  });

  it('rejects missing and placeholder configuration', () => {
    assert.throws(
      () => resolveAuthenticationSecret(PLACEHOLDER_SECRET, {}),
      /Configure authentication\.secret/
    );
    assert.throws(
      () => resolveAuthenticationSecret('', {}),
      /Configure authentication\.secret/
    );
  });
});