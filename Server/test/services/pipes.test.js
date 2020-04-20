const assert = require('assert');
const app = require('../../src/app');

describe('\'pipes\' service', () => {
  it('registered the service', () => {
    const service = app.service('pipes');

    assert.ok(service, 'Registered the service');
  });
});
