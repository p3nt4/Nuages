const assert = require('assert');
const app = require('../../src/app');

describe('\'pipes-io\' service', () => {
  it('registered the service', () => {
    const service = app.service('pipes/io');

    assert.ok(service, 'Registered the service');
  });
});
