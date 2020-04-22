// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
module.exports = (options = {}) => {
  return async context => {
    if(context.app.pipe_list){
      var item = context.app.pipe_list[context.id];
      if(item){
        try{item.in.destroy();}catch(e){};
        try{item.out.destroy();}catch(e){};
        try{delete context.app.pipe_list[context.id];}catch(e){};
      }
    }
    return context;
  };
};
