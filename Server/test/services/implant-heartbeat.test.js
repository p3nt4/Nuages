const assert = require('assert');
const app = require('../../src/app');

describe('\'implant-heartbeat\' service', () => {
  it('registered the service', () => {
    const service = app.service('implant/heartbeat');

    assert.ok(service, 'Registered the service');
  });
});
