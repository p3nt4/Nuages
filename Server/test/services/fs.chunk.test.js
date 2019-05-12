const assert = require('assert');
const app = require('../../src/app');

describe('\'fs.chunk\' service', () => {
  it('registered the service', () => {
    const service = app.service('fs/chunks');

    assert.ok(service, 'Registered the service');
  });
});
