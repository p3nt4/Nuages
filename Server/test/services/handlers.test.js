const assert = require('assert');
const app = require('../../src/app');

describe('\'handlers\' service', () => {
  it('registered the service', () => {
    const service = app.service('handlers');

    assert.ok(service, 'Registered the service');
  });
});
