const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const afterGetFsChunk = require('../../src/hooks/after-get-fs-chunk');

describe('\'after-get-fs-chunk\' hook', () => {
  let app;

  beforeEach(() => {
    app = feathers();

    app.use('/dummy', {
      async get(id) {
        return { id };
      }
    });

    app.service('dummy').hooks({
      after: afterGetFsChunk()
    });
  });

  it('runs the hook', async () => {
    const result = await app.service('dummy').get('test');
    
    assert.deepEqual(result, { id: 'test' });
  });
});
