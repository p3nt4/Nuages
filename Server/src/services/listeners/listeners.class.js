const { Service } = require('feathers-mongodb');

exports.HandlersRun = class HandlersRun extends Service {
  constructor(options, app) {
    super(options);
    
    app.get('mongoClient').then(db => {
      this.Model = db.collection('listeners');
    });
  }
};
