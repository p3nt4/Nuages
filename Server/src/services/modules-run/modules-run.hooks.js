const { authenticate } = require('@feathersjs/authentication').hooks;

const beforeCreateModuleRun = require('../../hooks/before-create-module-run');

const afterCreateModuleRun = require('../../hooks/after-create-module-run');

module.exports = {
  before: {
    all: [ authenticate('jwt') ],
    find: [],
    get: [],
    create: [beforeCreateModuleRun()],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [afterCreateModuleRun()],
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
