// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
const error = require('@feathersjs/errors');

module.exports = function (options = {}) {
  return async context => {
    
    if(context.result.autorun === true){
      return context;
    }

    moduleFile = require("../../modules/"+context.result.moduleName);

    moduleFile.run(context.app, context.result).catch((e) => {
      context.result.runStatus = 4;
      context.result.log.push({
        type: 1,
        message: e.message,
        time: Date.now()}
      );
      context.service.patch(context.result._id, context.result);
      throw e
  });

    return context;
  };
};
