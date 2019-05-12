const beforeCreateFs = require('../../hooks/before-create-fs');

const beforeRemoveFs = require('../../hooks/before-remove-fs');

const afterGetFs = require('../../hooks/after-get-fs');

const beforePatchFs = require('../../hooks/before-patch-fs');

const { authenticate } = require('@feathersjs/authentication').hooks;

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [beforeCreateFs()],
    update: [],
    patch: [beforePatchFs()],
    remove: [beforeRemoveFs()]
  },

  after: {
    all: [],
    find: [],
    get: [afterGetFs()],
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
