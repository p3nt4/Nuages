const assert = require('assert');
const app = require('../../src/app');

describe('\'implant-io-bin\' service', () => {
  it('registered the service', () => {
    const service = app.service('implant-io-bin');

    assert.ok(service, 'Registered the service');
  });
});
