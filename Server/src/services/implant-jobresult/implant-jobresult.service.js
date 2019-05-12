// Initializes the `implant-jobresult` service on path `/implant/jobresult`
const createService = require('./implant-jobresult.class.js');
const hooks = require('./implant-jobresult.hooks');

module.exports = function (app) {
  
  const paginate = app.get('paginate');

  const options = {
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/implant/jobresult', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('implant/jobresult');

  service.hooks(hooks);
};
