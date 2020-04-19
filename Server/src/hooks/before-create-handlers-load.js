// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

module.exports = function (options = {}) {
  return async context => {

    delete require.cache[require.resolve("../../handlers/"+context.data.handlerPath.replace("..",""))]

    handlerFile = require("../../handlers/"+context.data.handlerPath.replace("..",""));

    var handler = handlerFile.load(context.app);

    var query = await context.app.service("handlers").find({query:{name: handler.name}});

    if (query.total > 0){
      throw new error.Forbidden("A handler with this name already exists");
    }

    context.result = await context.app.service("handlers").create(handler);

    return context;
  };
};
