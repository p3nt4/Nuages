// Initializes the `handlers` service on path `/handlers`
const { Handlers } = require('./handlers.class');
const hooks = require('./handlers.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/handlers', new Handlers(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('handlers');

  service.hooks(hooks);
};
