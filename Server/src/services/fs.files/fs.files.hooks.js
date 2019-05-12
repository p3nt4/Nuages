const beforeCreateFsFiles = require('../../hooks/before-create-fs-files');

const { authenticate } = require('@feathersjs/authentication').hooks;

const {disallow} = require('feathers-hooks-common');

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [beforeCreateFsFiles()],
    update: [disallow('external')],
    patch: [disallow('external')],
    remove: []
  },

  after: {
    all: [],
    find: [],
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
