const assert = require('assert');
const app = require('../../src/app');

describe('\'implant-jobresult\' service', () => {
  it('registered the service', () => {
    const service = app.service('implant/jobresult');

    assert.ok(service, 'Registered the service');
  });
});
