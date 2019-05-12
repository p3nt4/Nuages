const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const beforeCreateImplantHeartbeat = require('../../src/hooks/before-create-implant-heartbeat');

describe('\'before-create-implant-heartbeat\' hook', () => {
  let app;

  beforeEach(() => {
    app = feathers();

    app.use('/dummy', {
      async get(id) {
        return { id };
      }
    });

    app.service('dummy').hooks({
      before: beforeCreateImplantHeartbeat()
    });
  });

  it('runs the hook', async () => {
    const result = await app.service('dummy').get('test');
    
    assert.deepEqual(result, { id: 'test' });
  });
});
