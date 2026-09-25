const assert = require('assert');

const beforeCreateImplantRegister = require('../../src/hooks/before-create-implant-register');
const beforeCreateImplantHeartbeat = require('../../src/hooks/before-create-implant-heartbeat');
const beforeCreateJob = require('../../src/hooks/before-create-job');
const beforeCreateImplantJobresult = require('../../src/hooks/before-create-implant-jobresult');
const beforeCreateFsFiles = require('../../src/hooks/before-create-fs-files');
const beforeCreateFs = require('../../src/hooks/before-create-fs');

describe('implant workflow', () => {
  it('registers an implant and delivers a queued job during heartbeat', async () => {
    const jobs = [
      {
        _id: 'job-1',
        implantId: 'implant-123',
        jobStatus: 0,
        timeout: Date.now() + 60000,
        payload: { type: 'whoami', options: {} }
      }
    ];

    const implants = [];
    const app = {
      get(key) {
        if (key === 'id_length') return 16;
        return undefined;
      },
      pipe_list: {},
      service(name) {
        if (name === 'implants') {
          return {
            async create(data) {
              implants.push(data);
              return { _id: data._id, ...data };
            },
            async patch(id, patch) {
              const implant = implants.find(item => item._id === id || item.id === id) || { _id: id };
              Object.assign(implant, patch);
              return implant;
            }
          };
        }

        if (name === 'jobs') {
          return {
            async find({ query }) {
              return {
                data: jobs.filter(job => job.implantId === query.implantId && job.jobStatus === query.jobStatus)
              };
            },
            async patch(id, patch) {
              const job = jobs.find(item => item._id === id);
              if (!job) {
                throw new Error(`Unknown job ${id}`);
              }
              Object.assign(job, patch);
              return job;
            }
          };
        }

        if (name === 'pipes') {
          return {
            async create(data) {
              return { _id: 'pipe-abc', ...data };
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

    const registerContext = {
      app,
      data: {
        localIp: '127.0.0.1',
        sourceIp: '10.0.0.2',
        os: 'windows',
        hostname: 'host-1',
        username: 'admin',
        handler: 'dns',
        connectionString: 'tcp://server',
        implantType: 'nuages'
      },
      params: {
        headers: {
          listener: 'listener-1'
        }
      }
    };

    await beforeCreateImplantRegister()(registerContext);
    assert.ok(registerContext.data._id);
    assert.strictEqual(registerContext.data._id.length, 16);

    const implantId = registerContext.data._id;
    jobs[0].implantId = implantId;

    const jobContext = {
      app,
      data: {
        implantId,
        payload: { type: 'whoami', options: {} },
        timeout: '5000',
        pipe: { type: 'rev_tcp' },
        vars: { debug: true }
      },
      params: { user: { username: 'operator' } }
    };

    await beforeCreateJob()(jobContext);
    assert.strictEqual(jobContext.data.payload.options.pipe_id, 'pipe-abc');

    const heartbeatContext = {
      app,
      data: { id: implantId },
      params: { headers: { listener: 'listener-1' } }
    };

    await beforeCreateImplantHeartbeat()(heartbeatContext);

    assert.strictEqual(heartbeatContext.result.data.length, 1);
    assert.strictEqual(heartbeatContext.result.data[0]._id, 'job-1');
    assert.strictEqual(heartbeatContext.result.data[0].payload.type, 'whoami');
    assert.strictEqual(jobs[0].jobStatus, 1);
  });

  it('marks a job result as complete and cleans up the associated pipe and tunnel', async () => {
    const job = {
      _id: 'job-2',
      implantId: 'implant-123',
      jobStatus: 0,
      result: '',
      pipe_id: 'pipe-2',
      tunnelId: 'tunnel-2',
      noPipeDelete: false,
      timeout: Date.now() + 60000,
      payload: { type: 'whoami', options: {} }
    };

    const removedPipes = [];
    const removedTunnels = [];
    const app = {
      get(key) {
        if (key === 'id_length') return 16;
        return undefined;
      },
      pipe_list: { 'pipe-2': {} },
      service(name) {
        if (name === 'jobs') {
          return {
            async get(id) {
              if (id !== job._id) {
                throw new Error(`Unknown job ${id}`);
              }
              return job;
            },
            async patch(id, patch) {
              Object.assign(job, patch);
              return job;
            }
          };
        }

        if (name === 'pipes') {
          return {
            async remove(id) {
              removedPipes.push(id);
              return true;
            }
          };
        }

        if (name === 'tunnels') {
          return {
            async remove(id) {
              removedTunnels.push(id);
              return true;
            }
          };
        }

        throw new Error(`Unexpected service lookup: ${name}`);
      }
    };

    const context = {
      app,
      data: {
        jobId: 'job-2',
        result: 'hello world',
        moreData: false,
        error: false
      }
    };

    await beforeCreateImplantJobresult()(context);

    assert.strictEqual(job.result, 'hello world');
    assert.strictEqual(job.jobStatus, 3);
    assert.deepStrictEqual(removedPipes, ['pipe-2']);
    assert.deepStrictEqual(removedTunnels, ['tunnel-2']);
  });

  it('normalizes file upload metadata before saving the file and chunk record', async () => {
    const fsFileContext = {
      app: {
        get(key) {
          if (key === 'id_length') return 16;
          return undefined;
        }
      },
      data: {
        filename: 'notes.txt',
        chunkSize: '4',
        metadata: { source: 'implant' }
      }
    };

    await beforeCreateFsFiles()(fsFileContext);

    assert.ok(fsFileContext.data._id);
    assert.strictEqual(fsFileContext.data.filename, 'notes.txt');
    assert.strictEqual(fsFileContext.data.chunkSize, 4);
    assert.deepStrictEqual(fsFileContext.data.metadata, { source: 'implant' });
    assert.strictEqual(fsFileContext.data.length, 0);

    const fsContext = {
      data: {}
    };

    await beforeCreateFs()(fsContext);
    assert.ok(fsContext.data.createdAt);
  });
});
