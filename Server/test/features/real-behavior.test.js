const assert = require('assert');

const beforeCreateJob = require('../../src/hooks/before-create-job');
const beforeCreateWebhook = require('../../src/hooks/before-create-webhook');
const beforeCreateImplantRegister = require('../../src/hooks/before-create-implant-register');
const beforeCreateModulesRun = require('../../src/hooks/before-create-modules-run');
const beforeCreateListener = require('../../src/hooks/before-create-listener');
const beforeCreateListenersStartstop = require('../../src/hooks/before-create-listeners-startstop');

describe('real feature behavior', () => {
  it('normalizes a job payload and rejects invalid job input', async () => {
    const app = {
      get(key) {
        if (key === 'id_length') return 16;
        return undefined;
      },
      service(name) {
        if (name === 'pipes') {
          return {
            create: async () => ({ _id: 'pipe-123' })
          };
        }
        throw new Error(`Unexpected service lookup: ${name}`);
      }
    };

    const validContext = {
      app,
      data: {
        implantId: 'implant-1',
        payload: { type: 'whoami', options: {} },
        timeout: '2500',
        fileUpload: true,
        pipe_id: 'pipe-1',
        tunnelId: 'tunnel-1',
        noPipeDelete: true,
        vars: { debug: true },
        pipe: { type: 'rev_tcp' }
      },
      params: {
        user: { username: 'alice' }
      }
    };

    await beforeCreateJob()(validContext);

    assert.strictEqual(validContext.data.implantId, 'implant-1');
    assert.deepStrictEqual(validContext.data.payload, { type: 'whoami', options: { pipe_id: 'pipe-123' } });
    assert.strictEqual(validContext.data.timeout, 2500);
    assert.strictEqual(validContext.data.creator, 'alice');
    assert.strictEqual(validContext.data.fileUpload, true);
    assert.strictEqual(validContext.data.noPipeDelete, true);
    assert.deepStrictEqual(validContext.data.vars, { debug: true });

    const invalidContext = {
      app,
      data: { implantId: 'implant-1' },
      params: { user: {} }
    };

    await assert.rejects(
      () => beforeCreateJob()(invalidContext),
      err => err && err.name === 'BadRequest' && err.message === 'A payload is needed'
    );
  });

  it('accepts only supported mattermost webhooks', async () => {
    const validHook = beforeCreateWebhook();
    const validContext = {
      app: {
        get() { return 16; }
      },
      data: {
        url: 'https://example.com/webhook',
        type: 'mattermost',
        ignoreCertErrors: true,
        customMessage: 'hello'
      }
    };

    await validHook(validContext);
    assert.strictEqual(validContext.data.type, 'mattermost');
    assert.strictEqual(validContext.data.ignoreCertErrors, true);
    assert.strictEqual(validContext.data.customMessage, 'hello');

    const invalidContext = {
      app: {
        get() { return 16; }
      },
      data: {
        url: 'https://example.com/webhook',
        type: 'slack',
        customMessage: 'nope'
      }
    };

    await assert.rejects(
      () => validHook(invalidContext),
      err => err && err.name === 'BadRequest' && err.message === 'Web Hook type not supported'
    );
  });

  it('creates a normalized implant registration payload and returns the implant id', async () => {
    const services = {};
    const app = {
      get(key) {
        if (key === 'id_length') return 12;
        return undefined;
      },
      service(name) {
        if (name === 'implants') {
          return {
            async create(data) {
              services.implantCreate = data;
              return { _id: 'implant-abc' };
            }
          };
        }

        if (name === '/modules/run') {
          return {
            async find() { return { data: [] }; },
            async create() { return {}; }
          };
        }

        if (name === '/webhooks') {
          return {
            async find() { return { data: [] }; }
          };
        }

        throw new Error(`Unexpected service lookup: ${name}`);
      }
    };

    const context = {
      app,
      data: {
        localIp: '127.0.0.1',
        sourceIp: '10.0.0.2',
        os: 'windows',
        hostname: 'test-host',
        username: 'admin',
        handler: 'dns',
        connectionString: 'tcp://server',
        implantType: 'nuages',
        config: { foo: 'bar' },
        supportedPayloads: ['python']
      },
      params: {
        headers: {
          listener: 'listener-1'
        }
      }
    };

    await beforeCreateImplantRegister()(context);

    assert.strictEqual(context.data._id, 'implant-abc');
    assert.strictEqual(services.implantCreate.localIp, '127.0.0.1');
    assert.strictEqual(services.implantCreate.os, 'windows');
    assert.strictEqual(services.implantCreate.hostname, 'test-host');
    assert.strictEqual(services.implantCreate.listener, 'listener-1');
    assert.deepStrictEqual(services.implantCreate.supportedPayloads, ['python']);
    assert.deepStrictEqual(services.implantCreate.config, { foo: 'bar' });
  });

  it('creates a valid module run record from a compatible implant module', async () => {
    const app = {
      get(key) {
        if (key === 'id_length') return 12;
        return undefined;
      },
      service(name) {
        if (name === 'modules') {
          return {
            async get() {
              return {
                name: 'browser',
                options: {
                  implant: { required: false },
                  target: { required: true }
                },
                supportedOS: ['windows', 'linux'],
                requiredPayloads: ['python']
              };
            }
          };
        }

        if (name === 'implants') {
          return {
            async get() {
              return {
                os: 'windows',
                supportedPayloads: ['python']
              };
            }
          };
        }

        throw new Error(`Unexpected service lookup: ${name}`);
      }
    };

    const context = {
      app,
      data: {
        moduleId: 'module-1',
        autorun: false,
        options: {
          implant: { value: 'implant-1' },
          target: { value: 'whoami' }
        }
      },
      params: {
        user: { email: 'alice@example.com' }
      }
    };

    await beforeCreateModulesRun()(context);

    assert.strictEqual(context.data.moduleName, 'browser');
    assert.strictEqual(context.data.moduleId, 'module-1');
    assert.strictEqual(context.data.runStatus, 0);
    assert.strictEqual(context.data.creator, 'alice@example.com');
    assert.strictEqual(context.data.options.target.value, 'whoami');
    assert.strictEqual(context.data._id.length, 12);
  });

  it('validates listener creation and rejects a listener that is already running', async () => {
    const app = {
      get(key) {
        if (key === 'id_length') return 12;
        return undefined;
      },
      service(name) {
        if (name === 'handlers') {
          return {
            async get() {
              return {
                name: 'dns',
                options: {
                  host: { required: true },
                  port: { required: false }
                },
                external: false
              };
            }
          };
        }

        if (name === '/listeners') {
          return {
            async get() {
              return {
                _id: 'listener-1',
                handlerName: 'dns',
                runStatus: 3
              };
            }
          };
        }

        throw new Error(`Unexpected service lookup: ${name}`);
      }
    };

    const listenerContext = {
      app,
      data: {
        handlerId: 'handler-1',
        options: {
          host: { value: '127.0.0.1' }
        }
      },
      params: {
        user: { email: 'operator@example.com' }
      }
    };

    await beforeCreateListener()(listenerContext);

    assert.strictEqual(listenerContext.data.handlerName, 'dns');
    assert.strictEqual(listenerContext.data.runStatus, 1);
    assert.strictEqual(listenerContext.data.creator, 'operator@example.com');
    assert.strictEqual(listenerContext.data._id.length, 12);

    const startStopContext = {
      app,
      data: {
        id: 'listener-1',
        wantedStatus: 3,
        force: false
      }
    };

    await assert.rejects(
      () => beforeCreateListenersStartstop()(startStopContext),
      err => err && err.name === 'Forbidden' && err.message === 'Listener is already running'
    );
  });
});
