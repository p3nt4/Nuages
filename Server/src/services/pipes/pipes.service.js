// Initializes the `pipes` service on path `/pipes`
const { Pipes } = require('./pipes.class');
const hooks = require('./pipes.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/pipes', new Pipes(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('pipes');

  service.hooks(hooks);
};
