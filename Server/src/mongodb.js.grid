const parse = require('mongodb-core').parseConnectionString;
const MongoClient = require('mongodb').MongoClient;
const logger = require('./logger');
const mongodb = require('mongodb');

module.exports = function (app) {
  const config = app.get('mongodb');
  const promise = MongoClient.connect(config, { useNewUrlParser: true }).then(client => {
    // For mongodb <= 2.2
    if(client.collection) {
      return client;
    }

    const dbName = parse(config, () => {});

    const db = client.db(dbName);
    var gridFS = new mongodb.GridFSBucket(db);
    app.set('gridFS', gridFS);
    return client.db(dbName);
  }).catch(error => {
    logger.error(error);
  });

  app.set('mongoClient', promise);
};
