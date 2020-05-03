const beforeCreateFsFiles = require('../../hooks/before-create-fs-files');

const { authenticate } = require('@feathersjs/authentication').hooks;

const {disallow} = require('feathers-hooks-common');

const afterFindFsFiles = require('../../hooks/after-find-fs-files');

const afterRemoveFsFiles = require('../../hooks/after-remove-fs-files');

const beforeGetFsFiles = require('../../hooks/before-get-fs-files');

const beforeRemoveFsFiles = require('../../hooks/before-remove-fs-files');

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [beforeGetFsFiles()],
    create: [beforeCreateFsFiles()],
    update: [disallow('external')],
    patch: [disallow('external')],
    remove: [beforeRemoveFsFiles()]
  },

  after: {
    all: [],
    find: [afterFindFsFiles()],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [afterRemoveFsFiles()]
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
