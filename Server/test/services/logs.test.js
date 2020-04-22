const assert = require('assert');
const app = require('../../src/app');

describe('\'logs\' service', () => {
  it('registered the service', () => {
    const service = app.service('logs');

    assert.ok(service, 'Registered the service');
  });
});
