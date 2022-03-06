const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const beforeCreateImplantCallback = require('../../src/hooks/before-create-implant-callback');

describe('\'before-create-implant-callback\' hook', () => {
  let app;

  beforeEach(() => {
    app = feathers();

    app.use('/dummy', {
      async get(id) {
        return { id };
      }
    });

    app.service('dummy').hooks({
      before: beforeCreateImplantCallback()
    });
  });

  it('runs the hook', async () => {
    const result = await app.service('dummy').get('test');
    
    assert.deepEqual(result, { id: 'test' });
  });
});
