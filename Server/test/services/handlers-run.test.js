const assert = require('assert');
const app = require('../../src/app');

describe('\'handlers-run\' service', () => {
  it('registered the service', () => {
    const service = app.service('handlers/run');

    assert.ok(service, 'Registered the service');
  });
});
