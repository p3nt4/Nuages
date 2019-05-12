// Initializes the `implant-chunks` service on path `/implant/chunks`
const createService = require('./implant-chunks.class.js');
const hooks = require('./implant-chunks.hooks');

module.exports = function (app) {
  
  const paginate = app.get('paginate');

  const options = {
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/implant/chunks', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('implant/chunks');

  service.hooks(hooks);
};
