// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

const srs = require('secure-random-string');

const error = require('@feathersjs/errors');

module.exports = function (options = {}) {
  return async context => {

    if(!context.data.options){

      throw new error.BadRequest("Options are required");

    }

     // Get the module this is related to:
     var handler = await context.app.service('handlers').get(context.data.handlerId).catch((e) =>{
        throw new error.NotFound("Handler not found");
     });
     
      
     // Check if the options are filled 
     var options = Object.keys(handler.options);
     for(var i = 0; i < options.length; i++ ){
       if( handler.options[options[i]].required && (context.data.options[options[i]] === undefined || context.data.options[options[i]].value == "")){
         throw new error.BadRequest("Option is missing: "+ options[i]);
       }
     }
     
    var data = {};

    data._id = srs({length: 32, alphanumeric: true});

    data.createdAt = Date.now();

    data.log = [];

    data.handlerName = handler.name;

    if(context.params.user !== undefined){
      data.creator = context.params.user.email;
    } else {}

    data.options = context.data.options;

    data.handlerId = context.data.handlerId;

    data.runStatus = 1; // Received

    data.external = handler.external ? true : false;

    context.data = data;

    return context;
  };
};
