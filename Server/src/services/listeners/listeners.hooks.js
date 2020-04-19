const { authenticate } = require('@feathersjs/authentication').hooks;

const beforeCreateListener = require('../../hooks/before-create-listener');

const beforePatchListener = require('../../hooks/before-patch-listener');

const beforeRemoveListener = require('../../hooks/before-remove-listener');

module.exports = {
  before: {
    all: [ authenticate('jwt') ],
    find: [],
    get: [],
    create: [beforeCreateListener()],
    update: [],
    patch: [beforePatchListener()],
    remove: [beforeRemoveListener()]
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
