
const {disallow} = require('feathers-hooks-common');

const { authenticate } = require('@feathersjs/authentication').hooks;

module.exports = {
  before: {
    all: [disallow('external'), authenticate('jwt')],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
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
