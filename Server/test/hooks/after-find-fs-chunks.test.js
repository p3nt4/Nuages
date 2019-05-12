const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const afterFindFsChunks = require('../../src/hooks/after-find-fs-chunks');

describe('\'after-find-fs-chunks\' hook', () => {
  let app;

  beforeEach(() => {
    app = feathers();

    app.use('/dummy', {
      async get(id) {
        return { id };
      }
    });

    app.service('dummy').hooks({
      after: afterFindFsChunks()
    });
  });

  it('runs the hook', async () => {
    const result = await app.service('dummy').get('test');
    
    assert.deepEqual(result, { id: 'test' });
  });
});
