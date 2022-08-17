// Initializes the `webhooks` service on path `/webhooks`
const createService = require('feathers-mongodb');
const hooks = require('./webhooks.hooks');
const filters = require('./webhooks.filters');

module.exports = function () {
  const app = this;
  const paginate = app.get('paginate');
  const mongoClient = app.get('mongoClient');
  const options = { paginate };

  // Initialize our service with any options it requires
  app.use('/webhooks', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('webhooks');

  mongoClient.then(db => {
    service.Model = db.collection('webhooks');
  });

  service.hooks(hooks);

  if (service.filter) {
    service.filter(filters);
  }
};
