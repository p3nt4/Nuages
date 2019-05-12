// Initializes the `modules` service on path `/modules`
const createService = require('feathers-mongodb');
const hooks = require('./modules-run.hooks');

module.exports = function (app) {
  const paginate = app.get('paginate');
  const mongoClient = app.get('mongoClient');
  const options = { paginate };

  // Initialize our service with any options it requires
  app.use('/modules/run', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('/modules/run');

  mongoClient.then(db => {
    service.Model = db.collection('modules.run');
  });

  service.hooks(hooks);
};
