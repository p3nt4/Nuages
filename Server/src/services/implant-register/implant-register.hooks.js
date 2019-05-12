const denyAll = require('../../hooks/deny-all');

const beforeCreateImplantRegister = require('../../hooks/before-create-implant-register');

module.exports = {
  before: {
    all: [],
    find: [denyAll()],
    get: [denyAll()],
    create: [beforeCreateImplantRegister()],
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
