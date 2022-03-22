// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
module.exports = (options = {}) => {
  return async context => {

    // Would be nice to work on something like that
    function closePipeCleanly(pipe){
      console.log(typeof(pipe));
      if(typeof(pipe)=="GridFSBucketWriteStream"){
        pipe.end();
      }
    }
    //console.log("Deleting PIPE: " + context.id);
    if(context.app.pipe_list){
      var item = context.app.pipe_list[context.id];
      if(item !== undefined){
        try{
          if(item.in){
            try{item.in.end();}catch(e){};
            item.in.destroy();
            delete item.in;
          }
        }catch(e){console.log(e);};
        try{
          if(item.out){ 
            try{item.out.end();}catch(e){};
            item.out.destroy();
            delete item.out;
          }
        }catch(e){console.log(e);};
        try{
          delete context.app.pipe_list[context.id];
        }catch{};
      }
    }
    return context;
  };
};
