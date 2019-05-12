const assert = require('assert');
const app = require('../../src/app');

describe('\'implant-register\' service', () => {
  it('registered the service', () => {
    const service = app.service('implant/register');

    assert.ok(service, 'Registered the service');
  });
});
