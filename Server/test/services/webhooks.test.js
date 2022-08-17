const assert = require('assert');
const app = require('../../src/app');

describe('\'webhooks\' service', () => {
  it('registered the service', () => {
    const service = app.service('webhooks');

    assert.ok(service, 'Registered the service');
  });
});
