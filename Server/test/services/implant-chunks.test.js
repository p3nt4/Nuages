const assert = require('assert');
const app = require('../../src/app');

describe('\'implant-chunks\' service', () => {
  it('registered the service', () => {
    const service = app.service('implant/chunks');

    assert.ok(service, 'Registered the service');
  });
});
