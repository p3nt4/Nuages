const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const beforeCreateImplantIoBin = require('../../src/hooks/before-create-implant-io-bin');

describe('\'before-create-implant-io-bin\' hook', () => {
  let app;

  beforeEach(() => {
    app = feathers();

    app.use('/dummy', {
      async get(id) {
        return { id };
      }
    });

    app.service('dummy').hooks({
      before: beforeCreateImplantIoBin()
    });
  });

  it('runs the hook', async () => {
    const result = await app.service('dummy').get('test');
    
    assert.deepEqual(result, { id: 'test' });
  });
});
