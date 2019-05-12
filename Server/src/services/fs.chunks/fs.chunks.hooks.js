

const beforeCreateFsChunks = require('../../hooks/before-create-fs-chunks');

const afterFindFsChunks = require('../../hooks/after-find-fs-chunks');

const {disallow} = require('feathers-hooks-common');

const { authenticate } = require('@feathersjs/authentication').hooks;

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [beforeCreateFsChunks()],
    update: [disallow('external')],
    patch: [disallow('external')],
    remove: []
  },

  after: {
    all: [],
    find: [afterFindFsChunks()],
    get: [],
    create: [],
    update: [],
    patch: [],
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
