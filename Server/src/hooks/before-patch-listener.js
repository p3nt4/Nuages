// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
module.exports = (options = {}) => {
  return async context => {

    context.data.lastUpdated = Date.now();

    //If this is not an external call
    if(context.params.user != undefined){
        var data = {};

        if(context.data.wantedStatus == 3 || context.data.wantedStatus == 2){

          data.wantedStatus = context.data.wantedStatus;

        }else{
          throw new error.BadRequest("Invalid wanted status");
        }

        context.data = data;

        return context;
      }

    return context;
    }
};
