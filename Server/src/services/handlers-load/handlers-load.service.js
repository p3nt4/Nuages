// Initializes the `handlers-load` service on path `/handlers/load`
const createService  = require('./handlers-load.class');
const hooks = require('./handlers-load.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/handlers/load', new createService(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('handlers/load');

  service.hooks(hooks);
};
