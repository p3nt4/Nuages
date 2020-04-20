const assert = require('assert');
const app = require('../../src/app');

describe('\'tunnels\' service', () => {
  it('registered the service', () => {
    const service = app.service('tunnels');

    assert.ok(service, 'Registered the service');
  });
});
