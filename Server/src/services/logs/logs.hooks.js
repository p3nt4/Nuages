const { authenticate } = require('@feathersjs/authentication').hooks;

const {disallow} = require('feathers-hooks-common');

const beforeCreateLog = require('../../hooks/before-create-log');

module.exports = {
  before: {
    all: [ authenticate('jwt') ],
    find: [],
    get: [],
    create: [disallow("external"), beforeCreateLog()],
    update: [disallow("external")],
    patch: [disallow("external")],
    remove: [disallow("external")]
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
