const { authenticate } = require('@feathersjs/authentication').hooks;

const beforeCreateTunnel = require('../../hooks/before-create-tunnel');

const beforeRemoveTunnel = require('../../hooks/before-remove-tunnel');

const afterFindTunnels = require('../../hooks/after-find-tunnels');

module.exports = {
  before: {
    all: [ authenticate('jwt') ],
    find: [],
    get: [],
    create: [beforeCreateTunnel()],
    update: [],
    patch: [],
    remove: [beforeRemoveTunnel()]
  },

  after: {
    all: [],
    find: [afterFindTunnels()],
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
