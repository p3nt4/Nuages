const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const beforeCreateFsFiles = require('../../src/hooks/before-create-fs-files');

describe('\'before-create-fs-files\' hook', () => {
  let app;

  beforeEach(() => {
    app = feathers();

    app.use('/dummy', {
      async get(id) {
        return { id };
      }
    });

    app.service('dummy').hooks({
      before: beforeCreateFsFiles()
    });
  });

  it('runs the hook', async () => {
    const result = await app.service('dummy').get('test');
    
    assert.deepEqual(result, { id: 'test' });
  });
});
