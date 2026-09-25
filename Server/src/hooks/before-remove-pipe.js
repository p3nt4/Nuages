// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
module.exports = (options = {}) => {
  return async context => {
    if(context.app.pipe_list){
      var item = context.app.pipe_list[context.id];
      if(item !== undefined){
        try{
          if(item.in){
            try{item.in.end();}catch{};
            item.in.destroy();
            delete item.in;
          }
        }catch{ };
        try{
          if(item.out){ 
            try{item.out.end();}catch{};
            item.out.destroy();
            delete item.out;
          }
        }catch{ };
        try{
          delete context.app.pipe_list[context.id];
        }catch{};
      }
    }
    return context;
  };
};
