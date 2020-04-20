

const beforeCreateImplantIo = require('../../hooks/before-create-implant-io');

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [beforeCreateImplantIo()],
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
