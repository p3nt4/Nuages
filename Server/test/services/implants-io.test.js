const assert = require('assert');
const app = require('../../src/app');

describe('\'implants-io\' service', () => {
  it('registered the service', () => {
    const service = app.service('implants/io');

    assert.ok(service, 'Registered the service');
  });
});
