const { Service } = require('feathers-mongodb');

exports.Logs = class Logs extends Service {
  constructor(options, app) {
    super(options);
    
    app.get('mongoClient').then(db => {
      this.Model = db.collection('logs');
    });
  }
};
