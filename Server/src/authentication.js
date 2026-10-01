const { AuthenticationService, JWTStrategy } = require('@feathersjs/authentication');
const { LocalStrategy } = require('@feathersjs/authentication-local');
const { INTERNAL_AUTHENTICATION_LOOKUP } = require('./authentication-lookup');
//const { expressOauth } = require('@feathersjs/authentication-oauth');

class NuagesLocalStrategy extends LocalStrategy {
  async findEntity(username, params) {
    return super.findEntity(username, { ...params, [INTERNAL_AUTHENTICATION_LOOKUP]: true });
  }

  async getEntity(result, params) {
    return super.getEntity(result, { ...params, [INTERNAL_AUTHENTICATION_LOOKUP]: true });
  }
}

class NuagesJWTStrategy extends JWTStrategy {
  async getEntity(id, params) {
    return super.getEntity(id, { ...params, [INTERNAL_AUTHENTICATION_LOOKUP]: true });
  }
}

module.exports = app => {
  const authentication = new AuthenticationService(app);

  authentication.register('jwt', new NuagesJWTStrategy());
  authentication.register('local', new NuagesLocalStrategy());

  app.use('/authentication', authentication);
  //app.configure(expressOauth());
};
