const assert = require('assert');
const app = require('../../src/app');

describe('\'jobs\' service', () => {
  it('registered the service', () => {
    const service = app.service('jobs');

    assert.ok(service, 'Registered the service');
  });
});
