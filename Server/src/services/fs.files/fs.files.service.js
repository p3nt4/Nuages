// Initializes the `fs.files` service on path `/fs/files`
const createService = require('feathers-mongodb');
const hooks = require('./fs.files.hooks');

module.exports = function (app) {
  const paginate = app.get('paginate');
  const mongoClient = app.get('mongoClient');
  const options = { paginate };

  // Initialize our service with any options it requires
  app.use('/files', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('/files');

  mongoClient.then(db => {
    service.Model = db.collection('fs.files');
  });

  service.hooks(hooks);
};
