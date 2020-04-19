// Initializes the `handlers-run` service on path `/handlers/run`
const { HandlersRun } = require('./listeners.class');
const hooks = require('./listeners.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/listeners', new HandlersRun(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('listeners');

  service.hooks(hooks);
};
