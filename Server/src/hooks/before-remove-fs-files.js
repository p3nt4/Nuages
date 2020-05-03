// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
const error = require('@feathersjs/errors');

module.exports = (options = {}) => {
  return async context => {
    var files = await context.app.service("files").find({query:{filename:context.id}});
    if (files.total > 0) context.id = files.data[0].mongoId;
    return context;
  };
};
