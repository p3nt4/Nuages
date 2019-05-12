
const { authenticate } = require('@feathersjs/authentication').hooks;

const beforeCreateJob = require('../../hooks/before-create-job');

const afterPatchJobs = require('../../hooks/after-patch-jobs');

const {disallow} = require('feathers-hooks-common');

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [beforeCreateJob()],
    update: [disallow('external')],
    patch: [disallow('external')],
    remove: [disallow('external')]
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [afterPatchJobs()],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
