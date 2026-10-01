const { Forbidden } = require('@feathersjs/errors');
const { INTERNAL_AUTHENTICATION_LOOKUP } = require('../authentication-lookup');

module.exports = function requireAdmin() {
  return async context => {
    if (context.params[INTERNAL_AUTHENTICATION_LOOKUP]) {
      return context;
    }

    if (context.params.user?.isAdmin === true) {
      return context;
    }

    throw new Forbidden('Administrator access is required');
  };
};