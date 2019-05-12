// Initializes the `implant-register` service on path `/implant/register`
const createService = require('./implant-register.class.js');
const hooks = require('./implant-register.hooks');

module.exports = function (app) {
  
  const paginate = app.get('paginate');

  const options = {
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/implant/register', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('implant/register');

  service.hooks(hooks);
};
