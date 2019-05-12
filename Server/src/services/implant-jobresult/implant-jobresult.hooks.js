
const denyAll = require('../../hooks/deny-all');

const afterCreateImplantJobresult = require('../../hooks/after-create-implant-jobresult');

module.exports = {
  before: {
    all: [],
    find: [denyAll()],
    get: [denyAll()],
    create: [afterCreateImplantJobresult()],
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
