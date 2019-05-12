const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const beforeFindImplantChunks = require('../../src/hooks/before-find-implant-chunks');

describe('\'before-find-implant-chunks\' hook', () => {
  let app;

  beforeEach(() => {
    app = feathers();

    app.use('/dummy', {
      async get(id) {
        return { id };
      }
    });

    app.service('dummy').hooks({
      before: beforeFindImplantChunks()
    });
  });

  it('runs the hook', async () => {
    const result = await app.service('dummy').get('test');
    
    assert.deepEqual(result, { id: 'test' });
  });
});
