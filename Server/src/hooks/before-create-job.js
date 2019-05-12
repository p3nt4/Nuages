// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
const srs = require('secure-random-string');

module.exports = function (options = {}) {
  return async context => {
    
    //  Data validation
    context.data._id = srs({length: 32, alphanumeric: true});

    context.data.createdAt = Date.now();

    context.data.lastUpdated = context.data.createdAt;

    context.data.jobStatus = 0;

    context.data.result = "";

    context.data.creator = context.params.user ? context.params.user.email : "";

    context.data.timeout = context.data.timeout ? parseInt(context.data.timeout) : 9555520390191;

    if(!context.data.payload){

      throw error.BadRequest("A payload is needed");

    }

    if(!context.data.implantId){

      throw error.BadRequest("An implant ID is needed");

    }

    return context;
  };
};
