const { authenticate } = require('@feathersjs/authentication').hooks;

const beforeCreateListener = require('../../hooks/before-create-listener');

const beforeRemoveListener = require('../../hooks/before-remove-listener');


const {disallow} = require('feathers-hooks-common');

module.exports = {
  before: {
    all: [ authenticate('jwt') ],
    find: [],
    get: [],
    create: [beforeCreateListener()],
    update: [disallow("external")],
    patch: [disallow("external")],
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
