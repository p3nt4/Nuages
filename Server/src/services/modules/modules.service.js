// Initializes the `modules` service on path `/modules`
const createService = require('feathers-mongodb');
const hooks = require('./modules.hooks');

module.exports = function (app) {
  const paginate = app.get('paginate');
  const mongoClient = app.get('mongoClient');
  const options = { paginate };

  // Initialize our service with any options it requires
  app.use('/modules', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('modules');

  mongoClient.then(db => {
    service.Model = db.collection('modules');
  });

  service.hooks(hooks);
};
