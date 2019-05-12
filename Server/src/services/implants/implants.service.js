// Initializes the `implants` service on path `/implants`
const createService = require('feathers-mongodb');
const hooks = require('./implants.hooks');

module.exports = function (app) {
  const paginate = app.get('paginate');
  const mongoClient = app.get('mongoClient');
  const options = { paginate };

  // Initialize our service with any options it requires
  app.use('/implants', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('implants');

  mongoClient.then(db => {
    service.Model = db.collection('implants');
  });

  service.hooks(hooks);
};
