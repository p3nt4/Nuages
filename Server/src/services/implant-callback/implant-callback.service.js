// Initializes the `implant-callback` service on path `/implant/callback`
const createService = require('./implant-callback.class.js');
const hooks = require('./implant-callback.hooks');

module.exports = function (app) {
  
  const paginate = app.get('paginate');

  const options = {
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/implant/callback', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('implant/callback');

  service.hooks(hooks);
};
