const assert = require('assert');
const app = require('../../src/app');

describe('\'handlers-load\' service', () => {
  it('registered the service', () => {
    const service = app.service('handlers/load');

    assert.ok(service, 'Registered the service');
  });
});
