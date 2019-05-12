const assert = require('assert');
const app = require('../../src/app');

describe('\'implants\' service', () => {
  it('registered the service', () => {
    const service = app.service('implants');

    assert.ok(service, 'Registered the service');
  });
});
