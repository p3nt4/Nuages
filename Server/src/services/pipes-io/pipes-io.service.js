// Initializes the `pipes-io` service on path `/pipes/io`
const { PipesIo } = require('./pipes-io.class');
const hooks = require('./pipes-io.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/pipes/io', new PipesIo(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('pipes/io');

  service.hooks(hooks);
};
