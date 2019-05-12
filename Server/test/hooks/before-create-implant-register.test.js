const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const beforeCreateImplantRegister = require('../../src/hooks/before-create-implant-register');

describe('\'before-create-implant-register\' hook', () => {
  let app;

  beforeEach(() => {
    app = feathers();

    app.use('/dummy', {
      async get(id) {
        return { id };
      }
    });

    app.service('dummy').hooks({
      before: beforeCreateImplantRegister()
    });
  });

  it('runs the hook', async () => {
    const result = await app.service('dummy').get('test');
    
    assert.deepEqual(result, { id: 'test' });
  });
});
