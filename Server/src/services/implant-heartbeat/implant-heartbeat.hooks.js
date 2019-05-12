const denyAll = require('../../hooks/deny-all');

const beforeCreateImplantHeartbeat = require('../../hooks/before-create-implant-heartbeat');

module.exports = {
  before: {
    all: [],
    find: [denyAll()],
    get: [denyAll()],
    create: [beforeCreateImplantHeartbeat()],
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
