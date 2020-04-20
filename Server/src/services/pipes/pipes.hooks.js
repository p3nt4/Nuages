const { authenticate } = require('@feathersjs/authentication').hooks;

const beforeCreatePipe = require('../../hooks/before-create-pipe');

const beforeRemovePipe = require('../../hooks/before-remove-pipe');

const {disallow} = require('feathers-hooks-common');

module.exports = {
  before: {
    all: [ authenticate('jwt') ],
    find: [],
    get: [],
    create: [beforeCreatePipe()],
    update: [disallow("external")],
    patch: [disallow("external")],
    remove: [beforeRemovePipe()]
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
