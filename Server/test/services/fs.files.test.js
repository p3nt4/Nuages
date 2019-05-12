const assert = require('assert');
const app = require('../../src/app');

describe('\'fs.files\' service', () => {
  it('registered the service', () => {
    const service = app.service('fs/files');

    assert.ok(service, 'Registered the service');
  });
});
