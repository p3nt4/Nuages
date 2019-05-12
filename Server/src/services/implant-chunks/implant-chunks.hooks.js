

const denyAll = require('../../hooks/deny-all');

const beforeCreateImplantChunks = require('../../hooks/before-create-implant-chunks');

module.exports = {
  before: {
    all: [],
    find: [denyAll()],
    get: [denyAll()],
    create: [beforeCreateImplantChunks()],
    update: [denyAll()],
    patch: [denyAll()],
    remove: [denyAll()]
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
