const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const net = require('net');
const beforeCreateImplantCallback = require('../../src/hooks/before-create-implant-callback');
const { createCapability, hashCapability } = require('../../src/hooks/implant-capabilities');

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

  it('uses the created client for reverse TCP timeouts and removes the pipe', async () => {
    const originalSocket = net.Socket;
    let timeoutCallback;
    const client = {
      connect(port, host, callback) {
        assert.strictEqual(port, 8080);
        assert.strictEqual(host, '127.0.0.1');
        callback();
      },
      setTimeout(timeout, callback) {
        assert.strictEqual(timeout, 500);
        timeoutCallback = callback;
      },
      on() {}
    };
    net.Socket = function () {
      return client;
    };

    const removedPipes = [];
    const pipe = { _id: 'pipe-1' };
    const callbackApp = {
      get(key) {
        return key === 'id_length' ? 16 : undefined;
      },
      pipe_list: {},
      service(name) {
        if (name === '/tunnels') {
          return {
            async get() {
              return {
                _id: 'tunnel-1',
                destination: '127.0.0.1:8080',
                implantId: 'implant-1',
                bufferSize: 4096,
                maxPipes: 1,
                timeout: 500
              };
            }
          };
        }
        if (name === 'pipes') {
          return {
            async find() {
              return { total: 0 };
            },
            async create() {
              return pipe;
            },
            async remove(id) {
              removedPipes.push(id);
            }
          };
        }
        throw new Error(`Unexpected service lookup: ${name}`);
      }
    };

    const context = {
      app: callbackApp,
      data: {
        callback: 'rev_tcp_open',
        data: { tunnelId: 'tunnel-1', source: 'source' }
      }
    };

    try {
      await beforeCreateImplantCallback()(context);
      assert.match(context.data.pipe_id, /^[a-f0-9]{64}$/);
      timeoutCallback();
      await new Promise(resolve => setImmediate(resolve));
      assert.deepStrictEqual(removedPipes, ['pipe-1']);
    } finally {
      net.Socket = originalSocket;
    }
  });

  it('returns errors for missing, invalid, and saturated reverse TCP tunnels', async () => {
    const callback = beforeCreateImplantCallback();
    const missingContext = {
      app: {
        service() {
          return { async get() { return undefined; } };
        }
      },
      data: { callback: 'rev_tcp_open', data: { tunnelId: 'missing' } }
    };

    await callback(missingContext);
    assert.deepStrictEqual(missingContext.data, {
      error: true,
      mustClose: true,
      errorMessage: 'Tunnel not found'
    });

    const invalidContext = {
      app: {
        service() {
          return { async get() { return { destination: 'invalid' }; } };
        }
      },
      data: { callback: 'rev_tcp_open', data: { tunnelId: 'invalid' } }
    };

    await callback(invalidContext);
    assert.deepStrictEqual(invalidContext.data, {
      error: true,
      errorMessage: 'Destination format invalid'
    });

    const saturatedContext = {
      app: {
        service(name) {
          if (name === '/tunnels') {
            return {
              async get() {
                return {
                  _id: 'tunnel-3',
                  destination: '127.0.0.1:8080',
                  maxPipes: 1
                };
              }
            };
          }
          if (name === 'pipes') {
            return { async find() { return { total: 1 }; } };
          }
          throw new Error(`Unexpected service lookup: ${name}`);
        }
      },
      data: { callback: 'rev_tcp_open', data: { tunnelId: 'tunnel-3' } }
    };

    await callback(saturatedContext);
    assert.deepStrictEqual(saturatedContext.data, {
      error: true,
      errorMessage: 'Too many pipes on tunnel'
    });
  });

  it('uses a pipe capability to close and update a pipe', async () => {
    const capability = createCapability();
    const expectedHash = hashCapability(capability);
    const removed = [];
    const patched = [];
    const app = {
      service(name) {
        if (name !== 'pipes') {
          throw new Error(`Unexpected service lookup: ${name}`);
        }
        return {
          async find({ query }) {
            assert.strictEqual(query.implantCapabilityHash, expectedHash);
            return { data: [{ _id: 'pipe-1' }] };
          },
          async remove(id) {
            removed.push(id);
          },
          async patch(id, data) {
            patched.push({ id, data });
          }
        };
      }
    };

    await beforeCreateImplantCallback()({
      app,
      data: { callback: 'pipe_close', data: { pipe_id: capability } }
    });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepStrictEqual(removed, ['pipe-1']);

    await beforeCreateImplantCallback()({
      app,
      data: {
        callback: 'pipe_dest',
        data: { pipe_id: capability, destination: '127.0.0.1:9000' }
      }
    });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepStrictEqual(patched, [{
      id: 'pipe-1',
      data: { destination: '127.0.0.1:9000' }
    }]);
  });
});
