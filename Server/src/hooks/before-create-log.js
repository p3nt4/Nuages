// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
module.exports = (options = {}) => {
  return async context => {

    var data = {};

    data.sourceId = context.data.sourceId; // The handler or module ID

    data.sourceName = context.data.sourceName; // The handler or module name

    data.sourceType = context.data.sourceType; // Handler or module

    data.type = (parseInt(context.data.type) < 3) ? parseInt(context.data.type) : 0; // The log type (0: Info, 1: Error, 2: Success)

    data.time =  Date.now();

    data.message = context.data.message;
   
    context.data = data;

    return context;
  };
};
