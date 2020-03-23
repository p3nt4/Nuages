
const denyAll = require('../../hooks/deny-all');

const beforeCreateImplantJobresult = require('../../hooks/before-create-implant-jobresult');

module.exports = {
  before: {
    all: [],
    find: [denyAll()],
    get: [denyAll()],
    create: [beforeCreateImplantJobresult()],
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
