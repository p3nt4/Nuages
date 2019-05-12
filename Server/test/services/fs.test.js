const assert = require('assert');
const app = require('../../src/app');

describe('\'fs\' service', () => {
  it('registered the service', () => {
    const service = app.service('fs');

    assert.ok(service, 'Registered the service');
  });
});
