// Initializes the `implant-heartbeat` service on path `/implant/heartbeat`
const createService = require('./implant-heartbeat.class.js');
const hooks = require('./implant-heartbeat.hooks');

module.exports = function (app) {
  
  const paginate = app.get('paginate');

  const options = {
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/implant/heartbeat', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('implant/heartbeat');

  service.hooks(hooks);
};
