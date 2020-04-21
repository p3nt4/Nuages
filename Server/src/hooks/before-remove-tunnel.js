// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
module.exports = (options = {}) => {
  return async context => {

    if(context.app.server_list !== undefined && context.app.server_list[context.id]){
      console.log("Shutting down server: " + context.app.server_list[context.id]._connectionKey.replace("4:",""));
      try{context.app.server_list[context.id].close()}catch(e){};
      try{delete context.app.server_list[context.id]}catch(e){};
      context.app.service("pipes").remove(null,{query:{tunnelId: context.id}});
    }
    return context;
  };
};
