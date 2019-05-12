// Initializes the `fs` service on path `/fs`
const createService = require('./fs.class.js');

const hooks = require('./fs.hooks');

module.exports = function (app) {
  
  const paginate = app.get('paginate');

  const options = {
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/fs', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('fs');

  service.hooks(hooks);
};
