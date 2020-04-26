// Initializes the `fs.chunks` service on path `/fs/chunks`
const createService = require('feathers-mongodb');
const hooks = require('./fs.chunks.hooks');

module.exports = function (app) {
  const paginate = app.get('paginate');
  const mongoClient = app.get('mongoClient');
  const options = { 
    paginate, 
    multi: ['remove']
  };

  // Initialize our service with any options it requires
  app.use('/fs/chunks', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('fs/chunks');

  mongoClient.then(db => {
    service.Model = db.collection('fs.chunks');
  });

  service.hooks(hooks);
};
