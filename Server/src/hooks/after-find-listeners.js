// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
module.exports = (options = {}) => {
  return async context => {
    for(var i = 0; i < context.result.data.length; i++ ){
      var implants = await context.app.service("implants").find({query:{listener: context.result.data[i]._id}});
      context.result.data[i].implantNo = implants.total;
    }
    return context;
  };
};
