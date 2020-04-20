const { Service } = require('feathers-mongodb');

exports.Tunnels = class Tunnels extends Service {
  constructor(options, app) {
    super(options);
    
    app.get('mongoClient').then(db => {
      this.Model = db.collection('tunnels');
    });
  }
};
