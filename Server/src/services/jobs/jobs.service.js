// Initializes the `jobs` service on path `/jobs`
const createService = require('feathers-mongodb');
const hooks = require('./jobs.hooks');

module.exports = function (app) {
  const paginate = app.get('paginate');
  const mongoClient = app.get('mongoClient');
  const options = { paginate };

  // Initialize our service with any options it requires
  app.use('/jobs', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('jobs');

  mongoClient.then(db => {
    service.Model = db.collection('jobs');
  });

  service.hooks(hooks);
};
