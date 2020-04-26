// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
module.exports = (options = {}) => {
  return async context => {
    for(var i = 0; i < context.result.data.length; i++){
      context.result.data[i].mongoId = context.result.data[i]._id;
      context.result.data[i]._id = context.result.data[i].filename;
      context.result.data[i].filename = context.result.data[i].metadata.filename;
      context.result.data[i].uploadedBy = context.result.data[i].metadata.uploadedBy;
    }
    return context;
  };
};
