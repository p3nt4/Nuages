// Initializes the `tunnels` service on path `/tunnels`
const { Tunnels } = require('./tunnels.class');
const hooks = require('./tunnels.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/tunnels', new Tunnels(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('tunnels');

  service.hooks(hooks);
};
