const assert = require('assert');
const app = require('../../src/app');

describe('\'implant-callback\' service', () => {
  it('registered the service', () => {
    const service = app.service('implant/callback');

    assert.ok(service, 'Registered the service');
  });
});
