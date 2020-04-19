const assert = require('assert');
const app = require('../../src/app');

describe('\'handlers-startstop\' service', () => {
  it('registered the service', () => {
    const service = app.service('handlers/startstop');

    assert.ok(service, 'Registered the service');
  });
});
