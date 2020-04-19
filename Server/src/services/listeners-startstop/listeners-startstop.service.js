// Initializes the `handlers-startstop` service on path `/handlers/startstop`
const { HandlersStartstop } = require('./listeners-startstop.class');
const hooks = require('./listeners-startstop.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/listeners/startstop', new HandlersStartstop(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('listeners/startstop');

  service.hooks(hooks);
};
