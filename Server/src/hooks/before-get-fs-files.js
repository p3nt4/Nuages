// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
module.exports = (options = {}) => {
  return async context => {
    var files = await context.app.service("/fs/files").find({query:{filename:context.id}});
    if (files.count == 0) throw error.NotFound("File not found")
    else context.result = files.data[0];
    return context;
  };
};
