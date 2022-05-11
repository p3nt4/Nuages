// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

module.exports = (options = {}) => {
  return async context => {

    for(var i = 0; i < context.result.data.length; i++ ){
      var pipe = context.app.pipe_list[context.result.data[i]._id];
      context.result.data[i].dataDown = pipe.dataDown;
      context.result.data[i].dataUp = pipe.dataUp;
    }
    return context;
  };
};


