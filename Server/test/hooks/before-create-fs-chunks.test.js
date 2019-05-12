const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const beforeCreateFsChunks = require('../../src/hooks/before-create-fs-chunks');

describe('\'before-create-fs-chunks\' hook', () => {
  let app;

  beforeEach(() => {
    app = feathers();

    app.use('/dummy', {
      async get(id) {
        return { id };
      }
    });

    app.service('dummy').hooks({
      before: beforeCreateFsChunks()
    });
  });

  it('runs the hook', async () => {
    const result = await app.service('dummy').get('test');
    
    assert.deepEqual(result, { id: 'test' });
  });
});
