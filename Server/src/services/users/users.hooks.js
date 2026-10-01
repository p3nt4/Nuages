const { authenticate } = require('@feathersjs/authentication').hooks;

const {
  hashPassword, protect
} = require('@feathersjs/authentication-local').hooks;
const requireAdmin = require('../../hooks/require-admin');

module.exports = {
  before: {
    all: [],
    find: [ authenticate('jwt'), requireAdmin() ],
    get: [ authenticate('jwt'), requireAdmin() ],
    create: [ authenticate('jwt'), requireAdmin(), hashPassword('password') ],
    update: [ authenticate('jwt'), requireAdmin(), hashPassword('password') ],
    patch: [ authenticate('jwt'), requireAdmin(), hashPassword('password') ],
    remove: [ authenticate('jwt'), requireAdmin() ]
  },

  after: {
    all: [ 
      // Make sure the password field is never sent to the client
      // Always must be the last hook
      protect('password')
    ],
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
