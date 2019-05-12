const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const beforeFindFsChunks = require('../../src/hooks/before-find-fs-chunks');

describe('\'before-find-fs-chunks\' hook', () => {
  let app;

  beforeEach(() => {
    app = feathers();

    app.use('/dummy', {
      async get(id) {
        return { id };
      }
    });

    app.service('dummy').hooks({
      before: beforeFindFsChunks()
    });
  });

  it('runs the hook', async () => {
    const result = await app.service('dummy').get('test');
    
    assert.deepEqual(result, { id: 'test' });
  });
});
