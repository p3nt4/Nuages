const assert = require('assert');
const app = require('../../src/app');

describe('\'files\' service', () => {
  it('registered the service', () => {
    const service = app.service('files');

    assert.ok(service, 'Registered the service');
  });
});
