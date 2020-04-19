const { Service } = require('feathers-mongodb');

exports.Handlers = class Handlers extends Service {
  constructor(options, app) {
    super(options);
    
    app.get('mongoClient').then(db => {
      this.Model = db.collection('handlers');
    });
  }
};
