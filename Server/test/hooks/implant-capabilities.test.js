const assert = require('assert');
const {
  createCapability,
  hashCapability,
  registerPipeCapability,
  resolvePipeCapability,
  unregisterPipeCapability
} = require('../../src/hooks/implant-capabilities');

describe('implant capability cache', () => {
  it('resolves and removes pipe capabilities without a service lookup', () => {
    const app = {};
    const capability = createCapability();

    registerPipeCapability(app, 'pipe-1', hashCapability(capability));
    assert.strictEqual(resolvePipeCapability(app, capability), 'pipe-1');

    unregisterPipeCapability(app, 'pipe-1');
    assert.throws(
      () => resolvePipeCapability(app, capability),
      error => error && error.code === 403
    );
  });
});