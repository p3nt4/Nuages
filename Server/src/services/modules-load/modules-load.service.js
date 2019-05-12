// Initializes the `modules-load` service on path `/modules/load`
const createService = require('./modules-load.class.js');
const hooks = require('./modules-load.hooks');

module.exports = function (app) {
  
  const paginate = app.get('paginate');

  const options = {
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/modules/load', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('modules/load');

  service.hooks(hooks);
};
