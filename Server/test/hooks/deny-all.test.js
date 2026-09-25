const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const denyAll = require('../../src/hooks/deny-all');

describe('\'denyAll\' hook', () => {
  let app;

  beforeEach(() => {
    app = feathers();

    app.use('/dummy', {
      async get(id) {
        return { id };
      }
    });

    app.service('dummy').hooks({
      before: denyAll()
    });
  });

  it('rejects requests as expected', async () => {
    await assert.rejects(() => app.service('dummy').get('test'), /Unauthorized/);
  });
});
