// Initializes the `implants-io` service on path `/implants/io`
const { ImplantsIo } = require('./implant-io.class');
const hooks = require('./implant-io.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/implant/io', new ImplantsIo(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('implant/io');

  service.hooks(hooks);
};
