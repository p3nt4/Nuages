

const beforeCreateImplantIoBin = require('../../hooks/before-create-implant-io-bin');

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [beforeCreateImplantIoBin()],
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
