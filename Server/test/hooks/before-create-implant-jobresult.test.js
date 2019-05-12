const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const beforeCreateImplantJobresult = require('../../src/hooks/before-create-implant-jobresult');

describe('\'before-create-implant-jobresult\' hook', () => {
  let app;

  beforeEach(() => {
    app = feathers();

    app.use('/dummy', {
      async get(id) {
        return { id };
      }
    });

    app.service('dummy').hooks({
      before: beforeCreateImplantJobresult()
    });
  });

  it('runs the hook', async () => {
    const result = await app.service('dummy').get('test');
    
    assert.deepEqual(result, { id: 'test' });
  });
});
