// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

module.exports = function (options = {}) {
  return async context => {

    delete require.cache[require.resolve("../../modules/"+context.data.modulePath.replace("..",""))]

    moduleFile = require("../../modules/"+context.data.modulePath.replace("..",""));

    var module = moduleFile.load(context.app);

    var query = await context.app.service("modules").find({query:{name: module.name}});

    if (query.total > 0){
      throw new error.Forbidden("A module with this name already exists");
    }

    context.result = await context.app.service("modules").create(module);

    return context;
  };
};
