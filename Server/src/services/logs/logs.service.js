// Initializes the `logs` service on path `/logs`
const { Logs } = require('./logs.class');
const hooks = require('./logs.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/logs', new Logs(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('logs');

  service.hooks(hooks);
};
